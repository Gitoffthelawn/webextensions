/* global browser, FeedParser */

let regexs2code = [];
let autoDetectEnabled = false;

// ---------------------------------------------------------------------------
// Feed tabs opened from the popup: force Content-Type to text/plain so
// Firefox displays the feed instead of downloading it
// ---------------------------------------------------------------------------

const forceTextTabs = new Set();

function rewriteHeaders(details) {
  if (!forceTextTabs.has(details.tabId) || details.type !== "main_frame") {
    return {};
  }
  const headers = details.responseHeaders.filter((h) => {
    const n = h.name.toLowerCase();
    return n !== "content-type" && n !== "content-disposition";
  });
  headers.push({ name: "Content-Type", value: "text/plain; charset=utf-8" });
  return { responseHeaders: headers };
}

browser.webRequest.onHeadersReceived.addListener(
  rewriteHeaders,
  { urls: ["<all_urls>"], types: ["main_frame"] },
  ["blocking", "responseHeaders"],
);

// stop overriding once the final response has loaded, so later
// navigation in that tab behaves normally
function releaseTab(details) {
  if (details.type === "main_frame" && details.url !== "about:blank") {
    forceTextTabs.delete(details.tabId);
  }
}
browser.webRequest.onCompleted.addListener(releaseTab, {
  urls: ["<all_urls>"],
  types: ["main_frame"],
});
browser.webRequest.onErrorOccurred.addListener(releaseTab, {
  urls: ["<all_urls>"],
  types: ["main_frame"],
});
browser.tabs.onRemoved.addListener((tabId) => forceTextTabs.delete(tabId));

// ---------------------------------------------------------------------------
// Verifying candidate URLs
// ---------------------------------------------------------------------------

const ACCEPT =
  "application/rss+xml, application/atom+xml, application/feed+json, " +
  "application/json, application/xml;q=0.9, text/xml;q=0.9, */*;q=0.5";
const FETCH_TIMEOUT_MS = 8000; // no reply within this time -> skip it for now
const SNIFF_BYTES = 4096;
const BODY_CAP_BYTES = 2 * 1024 * 1024;
const CONCURRENCY = 6;

const resource_cache = new Map();
const RESOURCE_CACHE_MAX = 2000;
const CACHE_TTL_OK_MS = 5 * 60 * 1000;
const CACHE_TTL_FAIL_MS = 60 * 1000;

function concatChunks(chunks, total) {
  const out = new Uint8Array(total);
  let off = 0;
  for (const c of chunks) {
    out.set(c, off);
    off += c.length;
  }
  return out;
}

// Result: { ok: true, url, finalUrl, type, title?, link?, items?, latest? }
//      or { ok: false, url, reason }
// The body is read with a GET (HEAD is not supported by every server) but
// reading is abandoned after the first few KB if it does not look like a feed.
async function checkResource(url) {
  const fail = (reason) => ({ ok: false, url, reason });
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { Accept: ACCEPT },
    });
    if (!res.ok) {
      return fail("HTTP " + res.status);
    }
    if (!res.body) {
      return fail("empty response");
    }
    const ctype = (res.headers.get("content-type") || "").toLowerCase();
    const reader = res.body.getReader();
    const chunks = [];
    let total = 0;
    let done = false;
    const readUntil = async (limit) => {
      while (!done && total < limit) {
        const r = await reader.read();
        if (r.done) {
          done = true;
        } else {
          chunks.push(r.value);
          total += r.value.length;
        }
      }
    };

    await readUntil(SNIFF_BYTES);
    const head = new TextDecoder("utf-8").decode(
      concatChunks(chunks, total).subarray(0, SNIFF_BYTES),
    );
    const kind = FeedParser.sniff(head);
    const jsonType = ctype.includes("json");

    if (kind === "no" || (kind === "maybe" && !jsonType)) {
      reader.cancel().catch(() => {});
      const shown = ctype !== "" ? ctype.split(";")[0] : "unknown content-type";
      return fail("not a feed (" + shown + ")");
    }

    await readUntil(BODY_CAP_BYTES);
    const result = {
      ok: true,
      url,
      finalUrl: res.url || url,
      type: kind === "xml" ? "xml" : "json",
    };
    if (!done) {
      reader.cancel().catch(() => {});
      // far too big to read the details, but it did look like a feed
      return kind === "maybe" ? fail("JSON too large to verify") : result;
    }

    try {
      const feed = FeedParser.parseFeed(
        FeedParser.decodeBytes(concatChunks(chunks, total), ctype),
      );
      result.type = feed.type;
      result.title = feed.meta.title;
      result.link = FeedParser.safeUrl(feed.meta.link, result.finalUrl) || "";
      result.items = feed.items.length;
      result.latest = FeedParser.latestTimestamp(feed);
    } catch (e) {
      if (kind === "maybe") {
        return fail("JSON, but not a JSON Feed");
      }
      // looked like a feed but is malformed: keep it, just without details
    }
    return result;
  } catch (e) {
    return fail(
      e && e.name === "AbortError"
        ? "timed out"
        : "request failed (" + (e && e.message) + ")",
    );
  } finally {
    clearTimeout(timer);
  }
}

async function checkResourceCached(url) {
  const hit = resource_cache.get(url);
  if (hit && Date.now() < hit.expires) {
    return hit.value;
  }
  const value = await checkResource(url);
  resource_cache.delete(url); // re-insert so the oldest entries go first
  if (resource_cache.size >= RESOURCE_CACHE_MAX) {
    resource_cache.delete(resource_cache.keys().next().value);
  }
  resource_cache.set(url, {
    value,
    expires: Date.now() + (value.ok ? CACHE_TTL_OK_MS : CACHE_TTL_FAIL_MS),
  });
  return value;
}

async function runPool(items, limit, worker) {
  let next = 0;
  const runners = Array.from(
    { length: Math.min(limit, items.length) },
    async () => {
      while (next < items.length) {
        const i = next++;
        await worker(items[i], i);
      }
    },
  );
  await Promise.all(runners);
}

// ---------------------------------------------------------------------------
// Collecting candidate URLs
// ---------------------------------------------------------------------------

// built-in detector: feeds the page declares itself via <link rel="alternate">
function declaredFeedsInPage() {
  const out = [];
  const typeRe =
    /\b(rss|atom|rdf)\b|feed\+json|^(text|application)\/(xml|json)$/;
  for (const l of document.querySelectorAll('link[rel~="alternate"][href]')) {
    const type = (l.getAttribute("type") || "").toLowerCase();
    if (typeRe.test(type)) {
      out.push(l.href);
    }
  }
  return out;
}
const DECLARED_CODE = "(" + declaredFeedsInPage.toString() + ")();";

function toUrlArray(v) {
  if (typeof v === "string") {
    return [v];
  }
  return Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];
}

// same feed with/without trailing slash, fragment, or http vs https
function normalizeUrl(u) {
  try {
    const x = new URL(u);
    const path = x.pathname.replace(/\/+$/, "");
    return (
      x.hostname.toLowerCase() + (x.port ? ":" + x.port : "") + path + x.search
    );
  } catch (e) {
    return u;
  }
}

function dedupeCandidates(cands) {
  const map = new Map();
  for (const c of cands) {
    const key = normalizeUrl(c.url);
    const prev = map.get(key);
    if (!prev) {
      map.set(key, { ...c });
      continue;
    }
    const declared = prev.declared || c.declared;
    const preferNew =
      (c.declared && !prev.declared) ||
      (c.declared === prev.declared &&
        c.url.startsWith("https:") &&
        !prev.url.startsWith("https:"));
    map.set(key, { ...(preferNew ? c : prev), declared });
  }
  return [...map.values()];
}

async function collectCandidates(tabId, pageUrl) {
  const raw = [];

  try {
    const r = await browser.tabs.executeScript(tabId, { code: DECLARED_CODE });
    for (const u of toUrlArray(r && r[0])) {
      raw.push({ url: u, declared: true });
    }
  } catch (err) {
    console.debug("declared-feed detection failed", err);
  }

  for (const el of regexs2code) {
    let re;
    try {
      re = new RegExp(el.regex);
    } catch (err) {
      console.error("invalid rule regex", el.regex, err);
      continue;
    }
    if (!re.test(pageUrl)) {
      continue;
    }
    try {
      const r = await browser.tabs.executeScript(tabId, { code: el.code });
      for (const u of toUrlArray(r && r[0])) {
        raw.push({ url: u, declared: false });
      }
    } catch (err) {
      console.error(`failed to execute script: ${err}`, el.regex);
    }
  }

  const resolved = [];
  for (const c of raw) {
    if (c.url.trim() === "") {
      continue;
    }
    const abs = FeedParser.safeUrl(c.url.trim(), pageUrl);
    if (abs) {
      resolved.push({ url: abs, declared: c.declared });
    }
  }
  return dedupeCandidates(resolved);
}

// hooks.onStart(count), hooks.onResult(result, index, doneCount)
async function detectFeeds(tabId, pageUrl, hooks = {}) {
  const cands = await collectCandidates(tabId, pageUrl);
  if (hooks.onStart) {
    await hooks.onStart(cands.length);
  }
  const seen = new Set();
  const results = new Array(cands.length);
  let done = 0;
  await runPool(cands, CONCURRENCY, async (c, idx) => {
    let res = await checkResourceCached(c.url);
    if (res.ok) {
      const key = normalizeUrl(res.finalUrl || res.url);
      if (seen.has(key)) {
        res = {
          ok: false,
          url: c.url,
          reason: "same feed as another candidate",
        };
      } else {
        seen.add(key);
        res = { ...res, declared: c.declared };
      }
    }
    results[idx] = res;
    done++;
    if (hooks.onResult) {
      await hooks.onResult(res, idx, done);
    }
  });
  return results.filter((r) => r && r.ok);
}

// ---------------------------------------------------------------------------
// Messages from find.html / options.html
// ---------------------------------------------------------------------------

function send(msg) {
  // no receiver (window closed) is fine
  return browser.runtime
    .sendMessage({ target: "find.html", ...msg })
    .catch(() => {});
}

async function onMessage(indata) {
  if (!indata || typeof indata !== "object" || Array.isArray(indata)) {
    return;
  }
  if (indata.action === "forceText") {
    forceTextTabs.add(indata.tabId);
    return true;
  }
  if (indata.action === "checkUrls") {
    // used by the "Test" button on the options page
    const urls = toUrlArray(indata.urls);
    const results = new Array(urls.length);
    await runPool(urls, CONCURRENCY, async (u, i) => {
      results[i] = await checkResourceCached(u);
    });
    return results;
  }
  if (typeof indata.url !== "string") {
    return;
  }

  const requestId = indata.requestId;
  const found = await detectFeeds(parseInt(indata.tabId), indata.url, {
    onStart: (n) => send({ requestId, nburls2check: n }),
    onResult: (res, idx, done) =>
      send({
        requestId,
        urls2checkProgress: done,
        order: idx,
        feed: res.ok ? res : false,
        checked: { url: res.url, ok: res.ok, reason: res.reason || "" },
      }),
  });
  return found.length;
}

// ---------------------------------------------------------------------------
// Toolbar button state, optional automatic detection + badge
// ---------------------------------------------------------------------------

// default state for browserAction icon is off
browser.browserAction.disable();

const autoDetected = new Map(); // tabId -> url that was last auto-detected

async function autoDetect(tabId, url) {
  if (!autoDetectEnabled || typeof url !== "string" || !/^https?:/i.test(url)) {
    return;
  }
  if (autoDetected.get(tabId) === url) {
    return;
  }
  autoDetected.set(tabId, url);
  try {
    const found = await detectFeeds(tabId, url);
    const tab = await browser.tabs.get(tabId);
    if (tab.url !== url) {
      return; // navigated away meanwhile
    }
    await browser.browserAction.setBadgeText({
      tabId,
      text: found.length > 0 ? String(found.length) : "",
    });
  } catch (e) {
    console.debug("auto detection failed", e);
  }
}

async function clearAllBadges() {
  autoDetected.clear();
  try {
    for (const t of await browser.tabs.query({})) {
      browser.browserAction.setBadgeText({ tabId: t.id, text: "" });
    }
  } catch (e) {
    console.debug(e);
  }
}

function onTabUpdated(tabId, changeInfo, tabInfo) {
  if (changeInfo.status === "complete") {
    browser.browserAction.enable(tabId);
    autoDetect(tabId, tabInfo.url);
  } else {
    browser.browserAction.disable(tabId);
    browser.browserAction.setBadgeText({ tabId, text: "" });
    autoDetected.delete(tabId);
  }
}

// ---------------------------------------------------------------------------
// Storage / install
// ---------------------------------------------------------------------------

async function getFromStorage(id, fallback) {
  return await (async () => {
    try {
      const tmp = await browser.storage.local.get(id);
      if (typeof tmp[id] !== "undefined") {
        return tmp[id];
      }
    } catch (e) {
      console.error(e);
    }
    return fallback;
  })();
}

async function handleInstalled(details) {
  if (details.reason === "install") {
    const resp = await fetch(
      browser.runtime.getURL("custom-feed-detectors.json"),
    );
    const json = await resp.json();
    browser.storage.local.set({ selectors: json });
  }
}

async function onStorageChanged() {
  const selectors = await getFromStorage("selectors", []);
  regexs2code = [];
  if (Array.isArray(selectors)) {
    for (const selector of selectors) {
      if (selector && selector.activ) {
        regexs2code.push({ regex: selector.url_regex, code: selector.code });
      }
    }
  }
  const wasAuto = autoDetectEnabled;
  autoDetectEnabled = (await getFromStorage("autoDetect", false)) === true;
  if (wasAuto && !autoDetectEnabled) {
    clearAllBadges();
  }
}

(async () => {
  onStorageChanged();
  try {
    browser.browserAction.setBadgeBackgroundColor({ color: "#e86a2c" });
    if (browser.browserAction.setBadgeTextColor) {
      browser.browserAction.setBadgeTextColor({ color: "#ffffff" });
    }
  } catch (e) {
    console.debug(e);
  }
  browser.runtime.onInstalled.addListener(handleInstalled);
  browser.runtime.onMessage.addListener(onMessage);
  browser.storage.onChanged.addListener(onStorageChanged);
  browser.tabs.onUpdated.addListener(onTabUpdated, { properties: ["status"] });
  browser.tabs.onRemoved.addListener((tabId) => autoDetected.delete(tabId));
  browser.browserAction.onClicked.addListener((tab, info) => {
    if (info.button === 1) {
      browser.tabs.create({
        url:
          "find.html?tabId=" + tab.id + "&url=" + encodeURIComponent(tab.url),
        index: tab.index + 1,
        active: true,
      });
    } else {
      // default: open in popup
      browser.windows.create({
        url: [
          "find.html?tabId=" + tab.id + "&url=" + encodeURIComponent(tab.url),
        ],
        type: "popup",
        height: 480,
        width: 1080,
        focused: true,
      });
    }
  });
})();

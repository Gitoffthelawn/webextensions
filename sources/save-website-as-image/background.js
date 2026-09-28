/* global browser, JSZip, DEFAULT_SETTINGS, playSound */

const STEP_HEIGHT = 10000;
const BADGE_FRAMES = "▖▘▝▗";

const EXT_NAME = "Save Website as Image";
const BADGE_IDLE_COLOR = "lightgray";
const BADGE_OK = { text: "✓", color: "#1a7f37" };
const BADGE_FAIL = { text: "✕", color: "#d70022" };

// conservative estimate for “bytes per pixel” for the capture pipeline
// (JPEG encoding doesn’t help with the underlying render surface size)
const BYTES_PER_PIXEL_EST = 4;

// Firefox canvas limits (per-dimension + total allocated bytes)
const MAX_CANVAS_DIM = 32766; // keep safely below 32767
const MAX_ALLOCATED_BYTES = 500_000_000; // limit

function needsCbzFallback(width, height) {
  const tooBigByDimension = width > MAX_CANVAS_DIM || height > MAX_CANVAS_DIM;

  const tooBigByAllocatedSize =
    width * height * BYTES_PER_PIXEL_EST > MAX_ALLOCATED_BYTES;

  return tooBigByDimension || tooBigByAllocatedSize;
}

let processingIntervalId = null;

async function clearTabAction(tabId) {
  // removes the tab specific badge text/color/title -> global values apply again
  try {
    await browser.browserAction.setBadgeText({ tabId, text: null });
    await browser.browserAction.setBadgeBackgroundColor({ tabId, color: null });
    await browser.browserAction.setTitle({ tabId, title: null });
  } catch {
    /* tab is gone */
  }
}

function startProcessing(tabId) {
  browser.browserAction.disable();
  if (processingIntervalId) {
    clearInterval(processingIntervalId);
  }

  // animate on the capturing tab (a previous result badge would hide a global one)
  browser.browserAction
    .setBadgeBackgroundColor({ tabId, color: BADGE_IDLE_COLOR })
    .then(() =>
      browser.browserAction.setBadgeText({ tabId, text: BADGE_FRAMES[0] }),
    )
    .catch(() => {});

  const id = setInterval(async () => {
    try {
      const txt = await browser.browserAction.getBadgeText({ tabId });
      if (processingIntervalId !== id) return; // stopped meanwhile
      const idx = BADGE_FRAMES.indexOf(txt);
      const next =
        idx >= 0 && idx < BADGE_FRAMES.length - 1
          ? BADGE_FRAMES[idx + 1]
          : BADGE_FRAMES[0];
      await browser.browserAction.setBadgeText({ tabId, text: next });
    } catch {
      /* tab is gone */
    }
  }, 500);
  processingIntervalId = id;
}

async function stopProcessing(tabId) {
  if (processingIntervalId) {
    clearInterval(processingIntervalId);
  }
  processingIntervalId = null;
  browser.browserAction.enable();
  await clearTabAction(tabId);
}

// ---- per tab result of the last capture (badge + title) ----

const tabStatus = new Map(); // tabId -> { pageKey, ok }

// same page = same URL, ignoring the #fragment
function pageKey(url) {
  try {
    const u = new URL(url);
    u.hash = "";
    return u.href;
  } catch {
    return url || "";
  }
}

async function setCaptureStatus(tabId, startUrl, ok, message) {
  let currentUrl;
  try {
    currentUrl = (await browser.tabs.get(tabId)).url;
  } catch {
    return; // tab is gone
  }
  // the user navigated away while we were working: the result is not for this page
  if (pageKey(currentUrl) !== pageKey(startUrl)) return;

  tabStatus.set(tabId, { pageKey: pageKey(startUrl), ok });

  const badge = ok ? BADGE_OK : BADGE_FAIL;
  const time = new Date().toLocaleTimeString();
  const title = ok
    ? `${EXT_NAME} - last capture of this page succeeded (${time})`
    : `${EXT_NAME} - last capture of this page failed: ${message} (${time})`;

  try {
    await browser.browserAction.setBadgeBackgroundColor({
      tabId,
      color: badge.color,
    });
    await browser.browserAction.setBadgeText({ tabId, text: badge.text });
    await browser.browserAction.setTitle({ tabId, title });
  } catch {
    /* tab is gone */
  }
}

// Firefox resets tab specific values on page loads, but not for in-page (history API)
// navigations, so reset the result explicitly when the URL of the tab changes.
browser.tabs.onUpdated.addListener(
  (tabId, changeInfo) => {
    const status = tabStatus.get(tabId);
    if (!status || !changeInfo.url) return;
    if (pageKey(changeInfo.url) === status.pageKey) return;
    tabStatus.delete(tabId);
    clearTabAction(tabId);
  },
  { properties: ["url"] },
);

browser.tabs.onRemoved.addListener((tabId) => tabStatus.delete(tabId));

async function getSettings() {
  try {
    return await browser.storage.local.get(DEFAULT_SETTINGS);
  } catch {
    return DEFAULT_SETTINGS;
  }
}

async function captureTab(tabId, y, width, height, format, quality) {
  const config = {
    format,
    rect: { x: 0, y, width, height },
  };
  // quality only has meaning for jpeg
  if (format === "jpeg") {
    config.quality = quality;
  }
  return browser.tabs.captureTab(tabId, config);
}

function sanitizeFilename(rawName) {
  const illegal = /[\\\/:*?"<>|[\x00-\x1F\x7F-\x9F]/g;
  let name = rawName.replace(illegal, "_");

  name = name.replace(/[\s]+/g, "_");
  name = name.replace(/[_]+/g, "_");

  const MAX_BYTES = 255;
  const encoder = new TextEncoder();
  if (encoder.encode(name).length <= MAX_BYTES) {
    return name;
  }

  const dotIdx = name.lastIndexOf(".");
  const ext = dotIdx === -1 ? "" : name.slice(dotIdx);
  const base = dotIdx === -1 ? name : name.slice(0, dotIdx);

  const maxBaseBytes = MAX_BYTES - encoder.encode(ext).length;

  let truncated = "";
  for (const ch of base) {
    if (encoder.encode(truncated + ch).length > maxBaseBytes) {
      break;
    }
    truncated += ch;
  }
  return truncated + ext;
}

function getTimeStampStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const day = d.getDate();
  const hh = d.getHours();
  const mm = d.getMinutes();
  const ss = d.getSeconds();

  const pad2 = (n) => (n < 10 ? `0${n}` : `${n}`);
  // format: year-month-day_hour-minute-second
  return `${y}-${pad2(m)}-${pad2(day)}_${pad2(hh)}-${pad2(mm)}-${pad2(ss)}`;
}

// Resolves once the download has been started. `onInterrupted(errorCode)` is called
// if the download later fails or is cancelled.
async function saveAs(tabTitle, tabURL, linkURL, extension, onInterrupted) {
  const filename = sanitizeFilename(
    `${getTimeStampStr()} ${tabTitle} ${tabURL}.${extension}`,
  );

  const downloadId = await browser.downloads.download({
    url: linkURL,
    filename,
    conflictAction: "uniquify",
  });

  let done = false;
  const finish = (state, error) => {
    if (done || (state !== "complete" && state !== "interrupted")) return;
    done = true;
    browser.downloads.onChanged.removeListener(onChanged);
    URL.revokeObjectURL(linkURL);
    if (state === "interrupted" && onInterrupted) onInterrupted(error);
  };
  const onChanged = (delta) => {
    if (delta.id !== downloadId || !delta.state?.current) return;
    finish(delta.state.current, delta.error?.current);
  };
  browser.downloads.onChanged.addListener(onChanged);

  // the download may already be finished before the listener was attached
  const [item] = await browser.downloads.search({ id: downloadId });
  if (item) finish(item.state, item.error);
}

async function getPageSize(tabId) {
  const res = await browser.tabs.executeScript(tabId, {
    code: `
      (() => {
        const doc = document.documentElement;
        const body = document.body;

        const scrollWidth = Math.max(doc.scrollWidth, body ? body.scrollWidth : 0);
        const scrollHeight = Math.max(doc.scrollHeight, body ? body.scrollHeight : 0);

        const clientWidth = doc.clientWidth || (body ? body.clientWidth : 0);
        const clientHeight = doc.clientHeight || (body ? body.clientHeight : 0);

        const offsetWidth = doc.offsetWidth || (body ? body.offsetWidth : 0);
        const offsetHeight = doc.offsetHeight || (body ? body.offsetHeight : 0);

        const width = Math.max(scrollWidth, clientWidth, offsetWidth);
        const height = Math.max(scrollHeight, clientHeight, offsetHeight);

        return { width, height };
      })()
    `,
  });

  const payload = Array.isArray(res) ? res[0] : res;

  if (
    !payload ||
    typeof payload.width !== "number" ||
    typeof payload.height !== "number"
  ) {
    throw new Error("failed to get page dimensions");
  }

  return payload;
}

async function dataURIToBlob(dataURI) {
  // Works for data: URIs returned by captureTab in most versions.
  const res = await fetch(dataURI);
  return res.blob();
}

async function captureChunkToBlob(
  tabId,
  y,
  width,
  chunkHeight,
  format,
  quality,
) {
  const dataURI = await captureTab(
    tabId,
    y,
    width,
    chunkHeight,
    format,
    quality,
  );
  return dataURIToBlob(dataURI);
}

function getChunking(height, width) {
  // Max chunk height allowed by the Firefox “allocated bytes” heuristic
  const maxByBytes = Math.floor(
    MAX_ALLOCATED_BYTES / (width * BYTES_PER_PIXEL_EST),
  );

  // Also respect the per-dimension cap
  const maxByDim = MAX_CANVAS_DIM - 1;

  const maxChunkHeight = Math.max(1, Math.min(maxByBytes, maxByDim));

  // Number of segments needed
  const segments = Math.ceil(height / maxChunkHeight);

  // Equal-ish chunk height (some chunks may be 1px taller)
  const chunkHeight = Math.ceil(height / segments);

  return { segments, chunkHeight };
}

async function onBAClicked(tab) {
  const tabId = tab.id;
  const startUrl = tab.url;
  startProcessing(tabId);

  let errorMessage = "";
  let pendingFailure = null; // download failure reported before the result was shown
  let finalized = false;
  const onInterrupted = (code) => {
    const msg = `download failed (${code || "interrupted"})`;
    if (finalized) {
      setCaptureStatus(tabId, startUrl, false, msg);
    } else {
      pendingFailure = msg;
    }
  };

  try {
    const settings = await getSettings();
    const { format, quality } = settings;
    const imgExtension = format === "png" ? "png" : "jpg";

    const { width, height } = await getPageSize(tabId);

    if (!width || !height || width <= 0 || height <= 0)
      throw new Error("Invalid page dimensions");

    const needsSegmentation = needsCbzFallback(width, height);

    let extension;
    let blobOrObjUrl;

    if (!needsSegmentation) {
      extension = imgExtension;
      const dataURI = await captureTab(
        tabId,
        0,
        width,
        height,
        format,
        quality,
      );
      blobOrObjUrl = await dataURIToBlob(dataURI);
    } else {
      // CBZ path
      extension = "cbz";
      const zip = new JSZip();

      const { chunkHeight } = getChunking(height, width);

      let i = 1;
      for (let y = 0; y < height; y += chunkHeight) {
        const curHeight = Math.min(chunkHeight, height - y);

        const blob = await captureChunkToBlob(
          tabId,
          y,
          width,
          curHeight,
          format,
          quality,
        );

        zip.file(`${i}.${imgExtension}`, blob, { binary: true });
        i++;
      }

      blobOrObjUrl = await zip.generateAsync({ type: "blob" });
    }

    // the screenshot has been taken
    if (settings.soundEnabled) {
      playSound(settings).catch((e) => console.warn("could not play sound", e));
    }

    const objUrl = URL.createObjectURL(blobOrObjUrl);
    await saveAs(tab.title, tab.url, objUrl, extension, onInterrupted);
  } catch (err) {
    console.error(err);
    errorMessage = err?.message || String(err);
  } finally {
    await stopProcessing(tabId);
  }

  if (!errorMessage && pendingFailure) errorMessage = pendingFailure;
  await setCaptureStatus(tabId, startUrl, !errorMessage, errorMessage);
  finalized = true;
  // a download failure that arrived while the result was being shown
  if (!errorMessage && pendingFailure) {
    await setCaptureStatus(tabId, startUrl, false, pendingFailure);
  }
}

browser.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === "install") {
    // flag read by options.js to show the welcome message once
    await browser.storage.local.set({ showWelcome: true });
    browser.runtime.openOptionsPage();
  }
});

browser.browserAction.onClicked.addListener(onBAClicked);
browser.browserAction.setBadgeBackgroundColor({ color: BADGE_IDLE_COLOR });
browser.browserAction.setBadgeText({ text: "+" });

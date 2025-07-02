/* global browser */

let regexs2code = [];

const xml_substring_matchers = ["rdf", "rss", "atom", "xml"];
const json_substring_matchers = ["json"];

const resource_cache = new Map();

async function checkResource(url) {
  let ret = false;
  if (typeof url === "string") {
    url = url.trim();
    if (url !== "") {
      try {
        const res = await fetch(url, {
          method: "HEAD",
          mode: "no-cors",
          signal: AbortSignal.timeout(5000),
        }); // if we dont get a reply within 10 seconds ... lets just ignore/skip it for now
        if (res.ok) {
          // 2xx
          //  The name is case-insensitive.
          //  ref https://developer.mozilla.org/en-US/docs/Web/API/Headers/get
          let ctype = res.headers.get("content-type");
          if (typeof ctype === "string") {
            ctype = ctype.trim();
            if (xml_substring_matchers.some((e) => ctype.includes("/" + e))) {
              return {
                url: url,
                type: "xml",
              };
            }
            if (json_substring_matchers.some((e) => ctype.includes("/" + e))) {
              return {
                url: url,
                type: "json",
              };
            }
          }
        }
      } catch (e) {
        //console.warn(e);
        // noop
      }
    }
  }
  return ret;
}

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

async function onMessage(indata, sender) {
  let urls2check = [];
  for (const el of regexs2code) {
    if (RegExp(el.regex).test(indata.url)) {
      try {
        urls2check = urls2check.concat(
          (
            await browser.tabs.executeScript(parseInt(indata.tabId), {
              code: el.code,
            })
          )[0],
        );
      } catch (err) {
        console.error(`failed to execute script: ${err}`, el.regex);
      }
    }
  }
  urls2check = [...new Set([...urls2check])];

  // update progressbar max length
  browser.runtime.sendMessage({
    target: "find.html",
    nburls2check: urls2check.length,
  });

  //let data = [];
  let tmp;
  let i = 1;
  let found = 0;
  for (const u of urls2check) {
    if (resource_cache.has(u)) {
      tmp = resource_cache.get(u);
    } else {
      tmp = await checkResource(u);
      resource_cache.set(u, tmp);
    }
    if (tmp !== false) {
      found++;
    }
    // update progressbar + transmit element or false
    await browser.runtime.sendMessage({
      target: "find.html",
      urls2checkProgress: i++,
      feed: tmp,
    });
  }
  return found;
}

// default state for browserAction icon is off
browser.browserAction.disable();

async function handleInstalled(details) {
  if (details.reason === "install") {
    const resp = await fetch(
      browser.runtime.getURL("custom-feed-detectors.json"),
    );
    const json = await resp.json();
    browser.storage.local.set({ selectors: json });
  }
}

function onTabUpdated(tabId, changeInfo, tabInfo) {
  if (changeInfo.status === "complete") {
    browser.browserAction.enable(tabId);
  } else {
    browser.browserAction.disable(tabId);
  }
}

async function onStorageChanged() {
  const selectors = await getFromStorage("selectors", []);
  regexs2code = [];
  for (let selector of selectors) {
    if (selector.activ) {
      regexs2code.push({ regex: selector.url_regex, code: selector.code });
    }
  }
}

(async () => {
  onStorageChanged();
  browser.runtime.onInstalled.addListener(handleInstalled);
  browser.runtime.onMessage.addListener(onMessage);
  browser.storage.onChanged.addListener(onStorageChanged);
  browser.tabs.onUpdated.addListener(onTabUpdated, { properties: ["status"] });
  browser.browserAction.onClicked.addListener((tab) => {
    browser.tabs.create({
      url: "find.html?tabId=" + tab.id + "&url=" + encodeURIComponent(tab.url),
      index: tab.index + 1,
      active: true,
    });
  });
  browser.menus.create({
    title: "Configure Feed Detectors",
    contexts: ["browser_action"],
    onclick: () => {
      browser.runtime.openOptionsPage();
    },
  });
})();

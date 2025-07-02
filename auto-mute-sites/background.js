/* global browser */

let mutedOrigins = new Set();

async function getFromStorage(type, id, fallback) {
  let tmp = await browser.storage.local.get(id);
  return typeof tmp[id] === type ? tmp[id] : fallback;
}

async function setToStorage(id, value) {
  let obj = {};
  obj[id] = value;
  return browser.storage.local.set(obj);
}

function onTabUpdated(tabId, changeInfo, tabInfo) {
  if (
    changeInfo.url &&
    typeof changeInfo.url === "string" &&
    changeInfo.url.startsWith("http")
  ) {
    if (mutedOrigins.has(new URL(changeInfo.url).origin)) {
      browser.tabs.update(tabId, {
        muted: true,
      });
      browser.browserAction.setBadgeText({ tabId, text: "ON" });
    } else {
      browser.tabs.update(tabId, {
        muted: false,
      });
      browser.browserAction.setBadgeText({ tabId, text: "" });
    }
  }
}

browser.tabs.onUpdated.addListener(onTabUpdated, { properties: ["url"] });

(async () => {
  mutedOrigins = await getFromStorage("object", "mutedOrigins", new Set());
})();

browser.browserAction.onClicked.addListener(async (tab, info) => {
  if (!tab.url.startsWith("http")) {
    return;
  }
  const url = new URL(tab.url);

  let doOriginUnmute = false;
  if (mutedOrigins.has(url.origin)) {
    mutedOrigins.delete(url.origin);
    // undo muted state for origin
    doOriginUnmute = true;
    browser.browserAction.setBadgeText({ tabId: tab.id, text: "" });
  } else {
    mutedOrigins.add(url.origin);
    browser.browserAction.setBadgeText({ tabId: tab.id, text: "ON" });
  }

  setToStorage("mutedOrigins", mutedOrigins);

  (await browser.tabs.query({})).forEach((t) => {
    if (doOriginUnmute) {
      if (t.url.startsWith(url.origin)) {
        browser.tabs.update(t.id, {
          muted: false,
        });
      }
    } else if (mutedOrigins.has(new URL(t.url).origin)) {
      browser.tabs.update(t.id, {
        muted: true,
      });
    }
  });

  console.debug(await getFromStorage("object", "mutedOrigins", new Set()));
});

async function updateBadge(activeInfo) {
  const atab = await browser.tabs.get(activeInfo.tabId);
  if (mutedOrigins.has(new URL(atab.url).origin)) {
    browser.browserAction.setBadgeText({ tabId: activeInfo.tabId, text: "ON" });
  } else {
    browser.browserAction.setBadgeText({ tabId: activeInfo.tabId, text: "" });
  }
}

browser.tabs.onActivated.addListener(updateBadge);

browser.browserAction.setBadgeBackgroundColor({
  color: "lightgreen",
});

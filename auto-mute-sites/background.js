/* global browser */

let mutedOrigins = new Set();

let user_set_mutedState_tabs = new Set();

function onTabUpdated(tabId, changeInfo, tabInfo) {
  if (changeInfo.mutedInfo) {
    if (changeInfo.mutedInfo.reason === "user") {
      user_set_mutedState_tabs.add(tabId);
    }
  }
  if (
    changeInfo.url &&
    typeof changeInfo.url === "string" &&
    changeInfo.url.startsWith("http")
  ) {
    if (!mutedOrigins.has(new URL(changeInfo.url).origin)) {
      if (!user_set_mutedState_tabs.has(tabId)) {
        browser.tabs.update(tabId, {
          muted: true,
        });
      }
      browser.browserAction.setBadgeText({ tabId, text: "ON" });
    } else {
      browser.browserAction.setBadgeText({ tabId, text: "" });
    }
  }
}

browser.tabs.onUpdated.addListener(onTabUpdated, {
  properties: ["url", "mutedInfo"],
});

(async () => {
  mutedOrigins = await getFromStorage("object", "mutedOrigins", new Set());
})();

browser.browserAction.onClicked.addListener(async (tab, info) => {
  if (!tab.url.startsWith("http")) {
    browser.browserAction.setBadgeText({ tabId: tab.id, text: "" });
    return;
  }
  const url = new URL(tab.url);

  if (!mutedOrigins.has(url.origin)) {
    mutedOrigins.delete(url.origin);
    browser.browserAction.setBadgeText({ tabId: tab.id, text: "" });
  } else {
    mutedOrigins.add(url.origin);
    browser.browserAction.setBadgeText({ tabId: tab.id, text: "ON" });
  }

  setToStorage("mutedOrigins", mutedOrigins);
});

async function updateBadge(activeInfo) {
  const atab = await browser.tabs.get(activeInfo.tabId);
  if (!mutedOrigins.has(new URL(atab.url).origin)) {
    browser.browserAction.setBadgeText({ tabId: activeInfo.tabId, text: "ON" });
  } else {
    browser.browserAction.setBadgeText({ tabId: activeInfo.tabId, text: "" });
  }
}

browser.tabs.onActivated.addListener(updateBadge);

browser.browserAction.setBadgeBackgroundColor({
  color: "lightgreen",
});

function logStorageChange(changes, area) {
  mutedOrigins = changes.mutedOrigins.newValue;
}

browser.storage.onChanged.addListener(logStorageChange);

browser.tabs.onRemoved.addListener((tid) => {
  if (user_set_mutedState_tabs.has(tid)) {
    user_set_mutedState_tabs.delete(tid);
  }
});

/* global browser */

// Tracks which tabs currently have the content script loaded, so we don't
// re-inject unnecessarily and so the toolbar badge can reflect real state.
const injectedTabIds = new Set();

const READY_BADGE_COLOR = "#2e7d32";
const ERROR_BADGE_COLOR = "#d32f2f";

function clearBadge(tabId) {
  browser.browserAction.setBadgeText({ tabId, text: "" });
  // Passing null resets the title back to the extension's default title.
  browser.browserAction.setTitle({ tabId, title: null });
}

function showReady(tabId) {
  browser.browserAction.setBadgeText({ tabId, text: "\u2713" });
  browser.browserAction.setBadgeBackgroundColor({
    tabId,
    color: READY_BADGE_COLOR,
  });
  browser.browserAction.setTitle({
    tabId,
    title: "Table to CSV: ready on this page",
  });
}

function showInjectionError(tabId, message) {
  browser.browserAction.setBadgeText({ tabId, text: "!" });
  browser.browserAction.setBadgeBackgroundColor({
    tabId,
    color: ERROR_BADGE_COLOR,
  });
  browser.browserAction.setTitle({ tabId, title: message });
}

async function injectContentScript(tabId) {
  // Already loaded on this tab (and hasn't navigated away since) - skip
  // re-injecting; content.js's own dedupe guard would no-op it anyway, but
  // this avoids the extra executeScript call and its round trip.
  if (injectedTabIds.has(tabId)) {
    return true;
  }
  try {
    await browser.tabs.executeScript(tabId, { file: "content.js" });
    injectedTabIds.add(tabId);
    showReady(tabId);
    return true;
  } catch (err) {
    // Injection fails on restricted pages such as about:, the addon store,
    // the built-in PDF viewer, or local files without extra permissions.
    console.error("Table to CSV: could not access this page", err);
    injectedTabIds.delete(tabId);
    showInjectionError(
      tabId,
      "Table to CSV: could not access this page.\n" +
        "This page may be restricted (e.g. about:, the addon store, a PDF, or a local file).",
    );
    return false;
  }
}

// A content script doesn't survive navigation, and neither does the error
// that was specific to the old page - so reset both as soon as the tab
// starts loading somewhere else.
browser.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === "loading") {
    injectedTabIds.delete(tabId);
    clearBadge(tabId);
  }
});

browser.tabs.onRemoved.addListener((tabId) => {
  injectedTabIds.delete(tabId);
});

async function runExport(tab, info, mode) {
  if (!(await injectContentScript(tab.id))) {
    return;
  }
  browser.tabs.create({
    active: true,
    url:
      "export.html?mode=" +
      mode +
      "&tEId=" +
      info.targetElementId +
      "&tabId=" +
      tab.id,
  });
}

browser.menus.create({
  title: "Text content",
  documentUrlPatterns: ["<all_urls>"],
  contexts: ["page", "link", "image", "editable"],
  onclick: (info, tab) => runExport(tab, info, "text"),
});

browser.menus.create({
  title: "HTML content",
  documentUrlPatterns: ["<all_urls>"],
  contexts: ["page", "link", "image", "editable"],
  onclick: (info, tab) => runExport(tab, info, "html"),
});

async function onBrowserActionClicked(tab) {
  if (!(await injectContentScript(tab.id))) {
    return;
  }
  browser.tabs.sendMessage(tab.id, { action: "highlight" });
}

// Register Listeners
browser.browserAction.onClicked.addListener(onBrowserActionClicked);

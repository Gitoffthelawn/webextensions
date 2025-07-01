/* global browser */

browser.menus.create({
  title: "Text content",
  documentUrlPatterns: ["<all_urls>"],
  contexts: ["page", "link", "image", "editable"],
  onclick: async (info, tab) => {
    await browser.tabs.executeScript(tab.id, { file: "content.js" });
    browser.tabs.create({
      active: true,
      url:
        "export.html?mode=text&tEId=" +
        info.targetElementId +
        "&tabId=" +
        tab.id,
    });
  },
});

browser.menus.create({
  title: "HTML content",
  documentUrlPatterns: ["<all_urls>"],
  contexts: ["page", "link", "image", "editable"],
  onclick: async (info, tab) => {
    await browser.tabs.executeScript(tab.id, { file: "content.js" });
    browser.tabs.create({
      active: true,
      url:
        "export.html?mode=html&tEId=" +
        info.targetElementId +
        "&tabId=" +
        tab.id,
    });
  },
});

async function onBrowserActionClicked(tab) {
  await browser.tabs.executeScript(tab.id, { file: "content.js" });
  browser.tabs.sendMessage(tab.id, { action: "highlight" });
}

// Register Listeners
browser.browserAction.onClicked.addListener(onBrowserActionClicked);

/* global browser */

browser.runtime.onMessage.addListener((data, sender) => {
  let text = "";
  let tabId = sender.tab.id;

  if (data.hasSessionStorageData) {
    text += "S";
  }
  if (data.hasLocalStorageData) {
    text += "L";
  }
  browser.browserAction.setBadgeText({ tabId, text });
  browser.browserAction.enable(tabId);
});

browser.browserAction.disable();

browser.browserAction.onClicked.addListener(async (tab, clickData) => {
  if (clickData.button === 1) {
    browser.windows.create({
      height: 460,
      width: 840,
      titlePreface: new URL(tab.url).hostname,
      type: "popup",
      url: "popup.html?tabId=" + tab.id,
    });
  } else {
    browser.browserAction.setPopup({
      popup: "/popup.html" + "?tabId=" + tab.id,
    });
    browser.browserAction.openPopup();
  }
});

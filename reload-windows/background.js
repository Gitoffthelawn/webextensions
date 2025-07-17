/* global browser */

browser.browserAction.onClicked.addListener(async () => {
  browser.browserAction.disable();
  for (const tab of await browser.tabs.query({ hidden: false })) {
    await browser.tabs.reload(tab.id, { bypassCache: true });
  }
  browser.browserAction.enable();
});

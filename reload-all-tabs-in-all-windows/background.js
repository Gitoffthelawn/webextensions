/* global browser */

browser.browserAction.onClicked.addListener(async () => {
  browser.browserAction.disable();
  for (const tab of await browser.tabs.query({
    hidden: false, // technically not visible "in a window" ... some users might think differently but ... whatever
  })) {
    await browser.tabs.reload(tab.id, { bypassCache: true });
  }
  browser.browserAction.enable();
});

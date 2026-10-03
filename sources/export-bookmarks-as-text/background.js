/* global browser */

// The options page (open_in_tab) is the whole UI. openOptionsPage() focuses
// an existing tab if there is one; the page only reloads the bookmark tree
// when the icon is clicked again or its Refresh button is pressed.
browser.browserAction.onClicked.addListener(async () => {
  await browser.runtime.openOptionsPage();
  browser.runtime.sendMessage({ cmd: "refresh" }).catch(() => {
    /* page not open yet; it loads the tree itself */
  });
});

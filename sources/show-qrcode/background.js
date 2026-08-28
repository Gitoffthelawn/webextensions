/* global browser */

let clickDataStore;

const manifest = browser.runtime.getManifest();
const extname = manifest.name;

async function openPopup() {
  browser.browserAction.setPopup({ popup: "popup.html" });
  browser.browserAction.openPopup();
  browser.browserAction.setPopup({ popup: "" });
}

browser.menus.create({
  id: extname,
  title: extname,
  contexts: ["bookmark", "selection", "link", "image", "tab", "page"],
  onclick: function (clickData /*,tab*/) {
    clickDataStore = clickData;
    openPopup();
  },
});

browser.menus.onShown.addListener(async (info /*, tab*/) => {
  if (info.bookmarkId) {
    let tmp = await browser.bookmarks.get(info.bookmarkId);
    if (tmp.length === 1) {
      tmp = tmp[0];
      if (tmp.url) {
        browser.menus.update(extname, { visible: true });
      } else {
        browser.menus.update(extname, { visible: false });
      }
    } else {
      browser.menus.update(extname, { visible: false });
    }
  } else {
    browser.menus.update(extname, { visible: true });
  }
  browser.menus.refresh();
});

async function onMessage(/*data , sender*/) {
  const tmp = clickDataStore;
  clickDataStore = undefined;
  return Promise.resolve(tmp);
}

browser.runtime.onMessage.addListener(onMessage);

browser.browserAction.onClicked.addListener((tab, info) => {
  openPopup();
});

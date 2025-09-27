/* global browser */

browser.menus.create({
  title: "Export as Text",
  contexts: ["bookmark"],
  visible: true,
  onclick: async function (info) {
    if (info.bookmarkId) {
      browser.tabs.create({
        active: true,
        url: "export.html?bmId=" + info.bookmarkId,
      });
    }
  },
});

browser.browserAction.onClicked.addListener(() => {
  browser.tabs.create({
    url: "export.html",
  });
});

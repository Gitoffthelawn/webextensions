/* global browser */

const FXVER = /rv:([0-9.]+)/.exec(navigator.userAgent)[1];
const MOBUA = `Mozilla/5.0 (Android 12; Mobile; rv:${FXVER}) Gecko/${FXVER} Firefox/${FXVER}`;

function setUrl(url) {
  browser.sidebarAction.setPanel({ panel: "about:blank" });
  setTimeout(() => {
    browser.sidebarAction.setPanel({ panel: url });
  }, 1000);
}

function setMOBUA(info) {
  let i, headers = info.requestHeaders;
  const hlen = headers.length;

  for (i = 0; i < hlen; i++) {
    if (headers[i].name.toLowerCase() === "user-agent") {
      headers[i].value = MOBUA;
      break;
    }
  }
  return { requestHeaders: headers };
}

const elements = {
  link: (info) => {
    setUrl(info.linkUrl);
  },
  page: (info) => {
    setUrl(info.linkUrl);
  },
  tab: (info) => {
    setUrl(info.linkUrl);
  },
  bookmark: async (info) => {
    setUrl((await browser.bookmarks.get(info.bookmarkId))[0].url);
  },
};

Object.keys(elements).forEach((e) => {
  browser.menus.create({
    id: e,
    title: "Open " + e[0].toUpperCase() + e.slice(1) + " in Sidebar",
    contexts: [e],
  });
});

browser.menus.onClicked.addListener((info, tab) => {
  browser.sidebarAction.open();
  elements[info.menuItemId](info);
});

const filter = {
  tabId: -1,
  types: ["main_frame"],
  urls: ["<all_urls>"],
};

browser.webRequest.onBeforeSendHeaders.addListener(setMOBUA, filter, [
  "blocking",
  "requestHeaders",
]);

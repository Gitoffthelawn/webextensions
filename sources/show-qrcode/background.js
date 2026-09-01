/* global browser */

let clickDataStore;
let reopenContentStore;

const manifest = browser.runtime.getManifest();
const extname = manifest.name;

/*
const types = new Map();
types.set("text","Text or URL");
types.set("mailto","Email Address");
types.set("tel","Phone Number ");
types.set("geo","Geo Location (float,float)");
*/

//types.forEach(function(value, key) {
browser.menus.create({
  id: extname,
  title: extname,
  contexts: ["bookmark", "selection", "link", "image", "tab", "page"],
  onclick: function (clickData /*,tab*/) {
    clickDataStore = clickData;
    browser.browserAction.openPopup();
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

async function onMessage(data, sender) {
  if (data && data.action === "focusOrOpenBoard") {
    await focusOrOpenBoard();
    return;
  }
  if (data && data.action === "reopenInPopup") {
    reopenContentStore = data.content;
    await browser.browserAction.openPopup();
    return;
  }
  if (data && data.action === "registerBoardTab") {
    if (sender.tab && typeof sender.tab.id === "number") {
      setBoardTabId(sender.tab.id);
    }
    return;
  }
  const clickData = clickDataStore;
  clickDataStore = undefined;
  const reopenContent = reopenContentStore;
  reopenContentStore = undefined;
  return Promise.resolve({ clickData, reopenContent });
}

browser.runtime.onMessage.addListener(onMessage);

// --- QR code board ------------------------------------------------------
//
// popup.js writes new entries directly to storage (all extension pages
// share access to it) and then asks us to make sure the board tab is
// open and focused. We track whichever tab last had view.html loaded
// into it — whether that happened via "Add to board" in the popup, the
// browser's own Options/Preferences entry for this extension (see
// options_ui in manifest.json), or the user just navigating there
// directly — so none of those paths ever pile up duplicate tabs.

let boardTabId = null;

function setBoardTabId(tabId) {
  boardTabId = tabId;
}

// Registered once, rather than per-open, so it stays correct no matter
// which code path set boardTabId most recently.
browser.tabs.onRemoved.addListener((closedId) => {
  if (closedId === boardTabId) {
    boardTabId = null;
  }
});

async function focusOrOpenBoard() {
  if (boardTabId !== null) {
    try {
      const tab = await browser.tabs.get(boardTabId);
      await browser.tabs.update(boardTabId, { active: true });
      await browser.windows.update(tab.windowId, { focused: true });
      return;
    } catch (e) {
      // Tab was closed without us noticing; fall through and open a
      // fresh one.
      boardTabId = null;
    }
  }

  const tab = await browser.tabs.create({
    url: browser.runtime.getURL("view.html"),
  });
  setBoardTabId(tab.id);
}

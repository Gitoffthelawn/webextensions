browser.menus.create({
  title: "Open in Window",
  contexts: ["browser_action"],
  onclick: async (info, tab) => {
    try {
      const tabs = await browser.tabs.query({
        windowType: "popup",
        url: browser.runtime.getURL(`popup.html?windowId=${tab.windowId}`),
      });

      console.debug(tab.windowId, tabs);

      if (tabs.length > 0) {
        browser.windows.update(tabs[0].windowId, {
          focused: true,
        });
        return;
      }
    } catch (e) {
      // Already gone somehow; nothing to close.
    }

    browser.windows.create({
      url: `popup.html?windowId=${tab.windowId}`,
      type: "popup",
      width: 520,
      height: 640,
    });
  },
});

browser.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === "install" || details.reason === "update") {
    // Keep the cached "default" stylesheet (used as a fallback, and as
    // the starting point for the options page's editable copy) in sync
    // with whatever popup.css actually ships now. Left stale, it would
    // get injected on top of the current popup.css a moment after load
    // and visibly override it — e.g. an old cached copy's sizing rules
    // overriding the current ones, making the toolbar panel jump to the
    // wrong size right after opening.
    let tmp = await fetch(browser.runtime.getURL("popup.css"));
    tmp = await tmp.text();
    browser.storage.local.set({ styles: tmp });

    browser.storage.local.set({ popupMode: "toolbar" });
  }
  applyPopupMode();
});

// Two ways to open the search, picked on the options page (see
// options.html/.js) and stored as "popupMode":
//  - "window" (default): the toolbar button's onClicked handler opens a
//    real, separate popup window (see below) — this is what lets a hit
//    stay open and interactive after selecting it.
//  - "toolbar": browserAction.setPopup points the button at popup.html
//    directly, so Firefox shows it as the classic anchored toolbar
//    panel instead of calling onClicked at all. The "mode=toolbar" query
//    param tells popup.js which mode it's running in — that page reacts
//    by closing itself immediately once a hit is selected instead of
//    trying to stay open, since a toolbar panel can't reliably keep
//    keyboard focus once another window is raised.
async function applyPopupMode() {
  const { popupMode } = await browser.storage.local.get("popupMode");
  if (popupMode === "toolbar") {
    await browser.browserAction.setPopup({ popup: "popup.html?mode=toolbar" });
  } else {
    await browser.browserAction.setPopup({ popup: "" });
  }
}

browser.runtime.onStartup.addListener(applyPopupMode);
applyPopupMode();

browser.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.popupMode) {
    applyPopupMode();
  }
});

// Only relevant in "window" mode (setPopup is empty, see applyPopupMode)
// — with a popup set, Firefox opens that popup itself and never fires
// onClicked. A genuine window keeps its own keyboard focus reliably (via
// windows.update) even while another tab/window is activated in the
// background — the old toolbar-panel approach fought with Firefox's own
// panel/tab focus handling and couldn't do that. Clicking the button (or
// its keyboard shortcut, which triggers this same listener) toggles it:
// opens it if closed, closes it if already open — regardless of which
// window currently has focus.
let popupWindowId = null;

browser.browserAction.onClicked.addListener(async (tab) => {
  try {
    const tabs = await browser.tabs.query({
      windowType: "popup",
      url: browser.runtime.getURL(`popup.html?windowId=${tab.windowId}`),
    });

    console.debug(tabs);

    if (tabs.length > 0) {
      browser.windows.update(tabs[0].windowId, {
        focused: true,
      });
      return;
    }
  } catch (e) {
    // Already gone somehow; nothing to close.
  }

  browser.windows.create({
    url: `popup.html?windowId=${tab.windowId}`,
    type: "popup",
    width: 520,
    height: 640,
  });
});

browser.windows.onRemoved.addListener((windowId) => {
  if (windowId === popupWindowId) {
    popupWindowId = null;
  }
});

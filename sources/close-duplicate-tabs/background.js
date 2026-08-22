/* global browser */

const DEFAULT_DEBOUNCE_MS = 5000;
const actionAPI = browser.browserAction;
const tabsAPI = browser.tabs;
let dupIds = [];

// find duplicate Tabs in a window
async function findDuplicateTabIds(winId) {
  const tabs = await tabsAPI.query({
    windowId: winId,
    hidden: false,
    pinned: false,
    status: "complete",
  });

  tabs.sort((a, b) => {
    // active tab goes first
    if (a.active && !b.active) {
      return -1;
    }
    if (!a.active && b.active) {
      return 1;
    }
    // otherwise we order from left to right => closing order
    return b.index - a.index;
  });

  const seen = new Set();
  const toClose = [];

  for (const t of tabs) {
    // container + (normlized)url
    const normalizedUrl = normalizeUrl(t.url);
    const key = `${t.cookieStoreId}|${normalizedUrl}`;
    if (seen.has(key)) {
      // we've seen this before, so this is a duplicate that can be closed
      toClose.push(t.id);
    } else {
      // first seen doenst get added
      seen.add(key);
    }
  }

  return toClose;
}

// normalize a URL igonore positional parameter changes and hashes
function normalizeUrl(url) {
  const urlObj = new URL(url);
  const params = new URLSearchParams(urlObj.search);

  // Build base of normalized URL directly
  let normalizedUrl = `${urlObj.origin}${urlObj.pathname}`;

  // Handle case with no parameters
  if (params.size === 0) {
    return normalizedUrl; // return immediately
  }

  // Handle case with one parameter
  if (params.size === 1) {
    normalizedUrl += `?${params.toString()}`;
  } else {
    // Sort the parameters if there are multiple
    const sortedParams = new URLSearchParams();
    Array.from(params.entries())
      .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
      .forEach(([key, value]) => sortedParams.append(key, value));

    // Extend the normalized URL with sorted parameters
    normalizedUrl += `?${sortedParams.toString()}`;
  }

  return normalizedUrl;
}

// hide the badge
function hideBadge(winId) {
  actionAPI.setTitle({ windowId: winId, title: null });
  actionAPI.setBadgeText({ windowId: winId, text: null });
}

// update the Badge in the last focused window
async function updateBadge() {
  const win = await browser.windows.getLastFocused({ populate: false });
  const winId = win.id;

  dupIds = await findDuplicateTabIds(winId);
  if (dupIds.length > 0) {
    actionAPI.setBadgeText({ windowId: winId, text: String(dupIds.length) });
    actionAPI.setTitle({
      windowId: winId,
      title: `Close ${dupIds.length} Duplicates`,
    });
  } else {
    hideBadge(winId);
  }
  setTimeout(updateBadge, DEFAULT_DEBOUNCE_MS);
}

actionAPI.onClicked.addListener(async (tab) => {
  if (dupIds.length > 0) {
    hideBadge(tab.windowId);
    await tabsAPI.remove(dupIds);
  }
});

// nicer contrast
actionAPI.setBadgeBackgroundColor({ color: "orange" });

// init
updateBadge();

// Restore icon when extension is installed
browser.runtime.onInstalled.addListener(async () => {
  await restoreIcon();
});

// Restore icon when browser starts
browser.runtime.onStartup.addListener(async () => {
  await restoreIcon();
});

async function restoreIcon() {
  try {
    const data = await browser.storage.local.get("savedIconData");
    if (data.savedIconData) {
      // Convert the stored Array back into a Uint8ClampedArray
      const clampedArray = new Uint8ClampedArray(data.savedIconData);
      const imageData = new ImageData(clampedArray, 128, 128);

      await browser.browserAction.setIcon({ imageData: imageData });
    }
  } catch (e) {
    //console.error(e);
  }
}

// Restore icon when re-enable addon
restoreIcon();

browser.menus.create({
  title: "Set custom icon",
  contexts: ["browser_action"],
  // The onclick callback is supported directly in the browser.menus API
  onclick: () => {
    browser.runtime.openOptionsPage();
  },
});

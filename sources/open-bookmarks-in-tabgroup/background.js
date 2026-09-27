/* global browser */

let last_visible = true;

let failed_urls = [];

const DEFAULTS = {
  collapseGroup: true,
  loadTabs: true,
};

async function getSettings() {
  return browser.storage.local.get(DEFAULTS);
}

browser.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    browser.runtime.openOptionsPage();
  }
});

// Colors supported by browser.tabGroups.update()
const GROUP_COLORS = [
  "blue",
  "cyan",
  "grey",
  "green",
  "pink",
  "purple",
  "red",
  "yellow",
  "orange",
];

// Simple, stable string hash (djb2) so the same folder name always
// maps to the same color.
function hashString(str) {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i);
  }
  return hash >>> 0; // force unsigned
}

function colorForName(name) {
  const idx = hashString(name) % GROUP_COLORS.length;
  return GROUP_COLORS[idx];
}

function isValidURL(str) {
  try {
    const newUrl = new URL(str);
    return newUrl.protocol === "http:" || newUrl.protocol === "https:";
  } catch (err) {
    //console.error(err);
    return false;
  }
}

browser.menus.onShown.addListener(async (info, tab) => {
  if (info.bookmarkId) {
    // prevent needless check
    const [btNode] = await browser.bookmarks.get(info.bookmarkId); // no idea why this returns an array
    let curr_visible = typeof btNode.url !== "string"; // only show on folders
    if (last_visible !== curr_visible) {
      // prevent needless update+refresh
      last_visible = curr_visible;
      await browser.menus.update("obatg", {
        visible: curr_visible,
      });
      browser.menus.refresh();
    }
  }
});

browser.menus.create({
  id: "obatg",
  title: "Open &Tabgroup",
  contexts: ["bookmark"],
  onclick: async (info, tab) => {
    const [btNode] = await browser.bookmarks.get(info.bookmarkId);
    const settings = await getSettings();

    // If a tab group with this name already exists, close it first so we
    // always end up with a single, freshly-opened group.
    const [existingGroup] = await browser.tabGroups.query({
      title: btNode.title,
    });
    if (existingGroup) {
      try {
        const existingTabs = await browser.tabs.query({
          groupId: existingGroup.id,
        });
        await browser.tabs.remove(existingTabs.map((t) => t.id));
      } catch (e) {
        //console.error(e);
        // noop
      }
    }

    const createdTabs = [];
    failed_urls = [];
    for (const c of await browser.bookmarks.getChildren(btNode.id)) {
      if (typeof c.url === "string") {
        let c_url = c.url;
        if (c_url.startsWith("about:reader?url=")) {
          c_url = decodeURIComponent(new URL(c_url).searchParams.get("url"));
        }
        if (isValidURL(c_url)) {
          try {
            const tabProps = { url: c_url, active: false };
            if (!settings.loadTabs) {
              // Discarded tabs need a title, since they won't be loaded
              // to derive one from the page itself.
              tabProps.discarded = true;
              tabProps.title = new URL(c_url).hostname || c_url;
            }
            const newTab = await browser.tabs.create(tabProps);
            createdTabs.push({ id: newTab.id, url: c_url });
            continue;
          } catch (e) {
            //console.error(e);
            // noop
          }
        }
        failed_urls.push(c.url);
      }
      // no a bookmark but a bookmark folder
    }
    if (createdTabs.length > 0) {
      try {
        const groupId = await browser.tabs.group({
          tabIds: createdTabs.map((t) => t.id),
        });

        await browser.tabGroups.update(groupId, {
          title: btNode.title,
          collapsed: settings.collapseGroup,
          color: colorForName(btNode.title),
        });
      } catch (e) {
        //console.error(e);
        // Grouping failed (e.g. unsupported); tabs are still open ungrouped.
      }
    }

    if (failed_urls.length > 0) {
      await browser.tabs.create({
        url: "/errors.html",
        active: true,
      });
    }
  },
});

browser.runtime.onMessage.addListener((data, sender) => {
  return Promise.resolve(failed_urls);
});

/* global browser */

let last_visible = true;

let failed_urls = [];

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
            const newTab = await browser.tabs.create({
              url: c_url,
              active: false,
            });
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
      const groupId = await browser.tabs.group({
        tabIds: createdTabs.map((t) => t.id),
      });

      browser.tabGroups.update(groupId, {
        title: btNode.title,
        collapsed: true,
      });
    }

    if (failed_urls.length > 0) {
      const newTab = await browser.tabs.create({
        url: "/errors.html",
        active: true,
      });
    }
  },
});

browser.runtime.onMessage.addListener((data, sender) => {
  return Promise.resolve(failed_urls);
});

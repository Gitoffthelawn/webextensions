/* global browser */

let last_visible = true;

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
    for (const c of await browser.bookmarks.getChildren(btNode.id)) {
      createdTabs.push(
        await browser.tabs.create({ url: c.url, active: false }),
      );
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
  },
});

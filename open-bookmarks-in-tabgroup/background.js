/* global browser */

const manifest = browser.runtime.getManifest();

browser.menus.create({
  title: manifest.name,
  contexts: ["bookmark"],
  onclick: async (info, tab) => {
    const [btNode] = await browser.bookmarks.get(info.bookmarkId);
    const createdTabs = [];
    if (typeof btNode.url === "string") {
      createdTabs.push(
        await browser.tabs.create({ url: btNode.url, active: false }),
      );
    } else {
      for (const c of await browser.bookmarks.getChildren(btNode.id)) {
        createdTabs.push(
          await browser.tabs.create({ url: c.url, active: false }),
        );
      }
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

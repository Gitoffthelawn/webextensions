/* global browser */

browser.menus.create({
  title: "Collapse All",
  contexts: ["tab"],
  onclick: async (clickdata, ctab) => {
    (await browser.tabGroups.query({})).forEach(async (tg) => {
      await browser.tabGroups.update(tg.id, {
        windowId: ctab.windowId,
        collapsed: true,
      });
    });
  }, // onclick
});

browser.menus.create({
  title: "Expand All",
  contexts: ["tab"],
  onclick: async (clickdata, tab) => {
    (await browser.tabGroups.query({})).forEach(async (tg) => {
      await browser.tabGroups.update(tg.id, {
        windowId: ctab.windowId,
        collapsed: false,
      });
    });
  },
});

browser.menus.create({
  title: "Collapse Selected",
  contexts: ["tab"],
  onclick: async (clickdata, ctab) => {
    if (!ctab.highlighted) {
      await browser.tabGroups.update(ctab.groupId, {
        windowId: ctab.windowId,
        collapsed: true,
      });
    } else {
      const processed = new Set();
      (
        await browser.tabs.query({
          highlighted: true,
          currentWindow: true,
          pinned: false,
          hidden: false,
        })
      ).forEach(async (t) => {
        if (t.groupId) {
          if (!processed.has(t.groupId)) {
            await browser.tabGroups.update(t.groupId, {
              collapsed: true,
            });
            processed.add(t.groupId);
          }
        }
      });
    }
  }, // onclick
});

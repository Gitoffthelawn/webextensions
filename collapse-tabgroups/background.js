/* global browser */

browser.browserAction.onClicked.addListener(async (ctab, info) => {
  (await browser.tabGroups.query({ windowId: ctab.windowId })).forEach(
    async (tg) => {
      await browser.tabGroups.update(tg.id, {
        collapsed: info.button !== 1 && !info.modifiers.includes("Ctrl"),
      });
    },
  );
});

browser.menus.create({
  title: "Collapse All",
  contexts: ["tab", "browser_action"],
  onclick: async (clickdata, ctab) => {
    (await browser.tabGroups.query({ windowId: ctab.windowId })).forEach(
      async (tg) => {
        await browser.tabGroups.update(tg.id, {
          collapsed: true,
        });
      },
    );
  }, // onclick
});

browser.menus.create({
  title: "Expand All",
  contexts: ["tab", "browser_action"],
  onclick: async (clickdata, ctab) => {
    (await browser.tabGroups.query({ windowId: ctab.windowId })).forEach(
      async (tg) => {
        await browser.tabGroups.update(tg.id, {
          collapsed: false,
        });
      },
    );
  },
});

browser.menus.create({
  title: "Collapse Selected",
  contexts: ["tab", "browser_action"],
  onclick: async (clickdata, ctab) => {
    if (!ctab.highlighted) {
      await browser.tabGroups.update(ctab.groupId, {
        collapsed: true,
      });
    } else {
      const hltgIds = new Set(
        (
          await browser.tabs.query({
            highlighted: true,
            currentWindow: true,
            pinned: false,
            hidden: false,
          })
        ).map((t) => t.groupId),
      );

      (await browser.tabGroups.query({ windowId: ctab.windowId })).forEach(
        async (tg) => {
          if (hltgIds.has(tg.id)) {
            await browser.tabGroups.update(tg.id, {
              collapsed: true,
            });
          }
        },
      );
    }
  }, // onclick
});

browser.menus.create({
  title: "Collapse NOT Selected",
  contexts: ["tab", "browser_action"],
  onclick: async (clickdata, ctab) => {
    if (!ctab.highlighted) {
      (await browser.tabGroups.query({ windowId: ctab.windowId })).forEach(
        async (tg) => {
          if (tg.id !== ctab.groupId) {
            await browser.tabGroups.update(tg.id, {
              collapsed: true,
            });
          }
        },
      );
    } else {
      const hltgIds = new Set(
        (
          await browser.tabs.query({
            highlighted: true,
            currentWindow: true,
            pinned: false,
            hidden: false,
          })
        ).map((t) => t.groupId),
      );
      (await browser.tabGroups.query({ windowId: ctab.windowId })).forEach(
        async (tg) => {
          if (!hltgIds.has(tg.id)) {
            await browser.tabGroups.update(tg.id, {
              collapsed: true,
            });
          }
        },
      );
    }
  }, // onclick
});

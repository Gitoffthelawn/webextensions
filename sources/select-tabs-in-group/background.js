/* global browser */

async function selectgroup(atab) {
  const tabIdxs = (
    await browser.tabs.query({
      windowId: atab.windowId,
      groupId: atab.groupId,
    })
  ).map((t) => t.index);

  browser.tabs.highlight({
    windowId: atab.windowId,
    tabs: tabIdxs,
  });
}

browser.menus.create({
  title: "Select Tabs in Group",
  contexts: ["tab"],
  onclick: async (clickdata, tab) => {
    selectgroup(tab);
  },
});

browser.browserAction.onClicked.addListener((tab) => {
  selectgroup(tab);
});

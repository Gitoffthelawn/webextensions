/* global browser */

async function grpTabsByCookieStore(all_tabs, cookieStoreIds) {
  cookieStoreIds.forEach(async (cookieStoreId) => {
    const tabIds = all_tabs
      .filter((t) => t.cookieStoreId === cookieStoreId)
      .map((t) => t.id);
    const grpId = await browser.tabs.group({ tabIds });

    try {
      const cIdentity = await browser.contextualIdentities.get(cookieStoreId);
      browser.tabGroups.update(grpId, {
        title: cIdentity.name,
        collapsed: true,
      });
    } catch (e) {
      // no container
      // lets leave the title blank
    }
  });
}

async function grpAllTabsByCookieStore() {
  // 1. get all tabs
  const all_tabs = await browser.tabs.query({
    currentWindow: true,
    pinned: false,
    hidden: false,
  });
  const cookieStoreIds_tabIds = new Map(); // str => set(ints)
  all_tabs.forEach((t) => {
    tmp = cookieStoreIds_tabIds.get(t.cookieStoreId);
    if (!tmp) {
      tmp = new Set();
    }
    tmp.add(t.id);
    cookieStoreIds_tabIds.set(t.cookieStoreId, tmp);
  });

  // create the groups and move the tabs
  for (const [k, v] of cookieStoreIds_tabIds) {
    console.debug(k, v);
    const grpId = await browser.tabs.group({
      tabIds: [...v],
    });

    try {
      const cIdentity = await browser.contextualIdentities.get(k);
      browser.tabGroups.update(grpId, {
        title: cIdentity.name,
        collapsed: true,
      });
    } catch (e) {
      // no container
      // lets leave the title blank
    }
  }
}

browser.menus.create({
  title: "This/These Tabs",
  contexts: ["tab"],
  onclick: async (clickdata, atab) => {
    const all_tabs = await browser.tabs.query({
      currentWindow: true,
      pinned: false,
      hidden: false,
    });

    if (!atab.highlighted) {
      const atab_origin = new URL(atab.url).origin;
      grpTabsByCookieStore(all_tabs, [atab_origin]);
    } else {
      const sites = new Set(
        all_tabs.filter((t) => t.highlighted).map((t) => t.cookieStoreId),
      );
      grpTabsByCookieStore(all_tabs, [...sites]);
    }
  },
});

browser.menus.create({
  title: "All Tabs",
  contexts: ["tab"],
  onclick: async (clickdata, tab) => {
    grpAllTabsByCookieStore();
  },
});

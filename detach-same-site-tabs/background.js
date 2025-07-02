/* global browser */

/*
const manifest = browser.runtime.getManifest();
const extname = manifest.name;
*/

// tabId => { url, cookiestore, lastAccessed, created }
const tabdata = new Map();

// tabId => [tabId, tabid  ]  dups
const dupdata = new Map();

const delayed_updateBA_timeout = 500;

let delayed_updateBA_timerId;

async function delayed_updateBA() {
  clearTimeout(delayed_updateBA_timerId);
  delayed_updateBA_timerId = setTimeout(async () => {
    updateBA();
  }, delayed_updateBA_timeout);
}

function updateDupData() {
  for (const [tabId, t0] of tabdata) {
    const t0_dups = [...tabdata]
      .filter(
        ([k, v]) =>
          k !== tabId &&
          new URL(t0.url).origin === new URL(v.url).origin &&
          //t0.cookieStoreId === v.cookieStoreId &&
          v.status !== "loading",
      )
      .map(([k]) => k);

    dupdata.set(tabId, t0_dups);
  }
}

//
async function seperateDups(tabId) {
  if (dupdata.has(tabId)) {
    const tmp = dupdata.get(tabId);
    if (tmp.length > 0) {
      let win = await browser.windows.create({
        tabId,
      });

      browser.tabs.move(tmp, {
        windowId: win.id,
        index: 0,
      });

      delayed_updateBA();
    }
  }
}

//
function updateBA() {
  updateDupData();
  for (const [k, v] of dupdata) {
    if (v.length > 0) {
      browser.browserAction.enable(k);
      browser.browserAction.setBadgeText({ tabId: k, text: "" + v.length });
      browser.browserAction.setTitle({
        tabId: k,
        title: "Detach Same Site Tabs",
      });
    } else {
      browser.browserAction.disable(k);
      browser.browserAction.setBadgeText({ tabId: k, text: "" });
      browser.browserAction.setTitle({ tabId: k, title: "" });
    }
  }
}

// init button + popuplate tabdata cache
(async () => {
  browser.browserAction.disable();
  browser.browserAction.setBadgeText({ text: "" });
  browser.browserAction.setBadgeBackgroundColor({ color: "orange" });
  browser.browserAction.setTitle({ title: "" });

  (
    await browser.tabs.query({
      hidden: false,
      pinned: false,
    })
  ).forEach((t) => {
    tabdata.set(t.id, {
      status: t.status,
      url: t.url,
      //cs: t.cookieStoreId,
    });
  });
  delayed_updateBA();
})();

// register listeners

// update cache
browser.tabs.onUpdated.addListener(
  (tabId, changeInfo, t) => {
    if (tabdata.has(t.id)) {
      let tmp = tabdata.get(t.id);
      if (typeof changeInfo.status === "string") {
        tmp.status = changeInfo.status;
      }
      if (typeof changeInfo.url === "string") {
        tmp.url = changeInfo.url;
      }
      tabdata.set(t.id, tmp);
      delayed_updateBA();
    }
  },
  { properties: ["url", "status"] },
);

// update cache
browser.tabs.onCreated.addListener((t) => {
  tabdata.set(t.id, {
    url: t.url,
    //cs: t.cookieStoreId,
    status: "created",
  });
  delayed_updateBA();
});

// remove tab from cache
browser.tabs.onRemoved.addListener((tabId) => {
  if (tabdata.has(tabId)) {
    tabdata.delete(tabId);
  }
  if (dupdata.has(tabId)) {
    dupdata.delete(tabId);
  }
  delayed_updateBA();
});

// trigger deletion
browser.browserAction.onClicked.addListener((tab) => {
  seperateDups(tab.id);
});

browser.menus.create({
  title: "Detach Same Site Tabs",
  contexts: ["tab"],
  onclick: async (clickdata, tab) => {
    seperateDups(tab.id);
  },
});

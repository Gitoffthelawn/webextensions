/* global browser */

let debounceTimer = null;
const DEFAULT_DEBOUNCE_MS = 1500;
const TAB_QUERY_OPTIONS = {
  currentWindow: true,
  hidden: false,
  pinned: false,
  status: "complete"
};

const actionAPI = browser.browserAction;
const tabsAPI = browser.tabs;

async function scheduleUpdateBadge(delayMs = DEFAULT_DEBOUNCE_MS) {
  //console.debug("scheduleUpdateBadge", Date.now());

  disableBadge();
  clearTimeout(debounceTimer);

  return new Promise((resolve) => {
    debounceTimer = setTimeout(async () => {
      //console.debug("scheduleUpdateBadge -> setTimeout", Date.now());
      resolve(await updateBadge());
    }, delayMs);
  });
}

async function findDuplicateTabIds() {
  const tabs = await tabsAPI.query(TAB_QUERY_OPTIONS);

  tabs.sort((a, b) => {
    if (a.active && !b.active) {
      return -1;
    }
    if (!a.active && b.active) {
      return 1;
    }
    return b.index - a.index;
  });

  const seen = new Set();
  const toClose = [];

  for (const t of tabs) {
    const key = `${t.cookieStoreId}|${t.url}`;
    if (seen.has(key)) {
      toClose.push(t.id);
    } else {
      seen.add(key);
    }
  }

  return toClose;
}

function disableBadge() {
  actionAPI.disable();
  actionAPI.setTitle({ title: null });
  actionAPI.setBadgeText({ text: null });
}

async function removeDuplicates() {
  const dupIds = await findDuplicateTabIds();
  if (dupIds.length > 0) {
    await tabsAPI.remove(dupIds);
  }
  disableBadge();
}

async function updateBadge() {
  //console.debug("updateBadge");
  const dupIds = await findDuplicateTabIds();
  if (dupIds.length > 0) {
    actionAPI.enable();
    actionAPI.setBadgeText({ text: String(dupIds.length) });
    actionAPI.setTitle({ title: `Close ${dupIds.length} Duplicates` });
    actionAPI.setBadgeBackgroundColor({ color: "orange" });
  } else {
    disableBadge();
  }
}

actionAPI.onClicked.addListener(async () => {
  await removeDuplicates();
});

["Removed", "Detached", "Attached", "Created"].forEach((e) => {
  tabsAPI[`on${e}`].addListener(async () => {
    await scheduleUpdateBadge();
  });
});

tabsAPI.onUpdated.addListener(
  async (tabId, changeInfo, tabInfo) => {
    if (typeof changeInfo.status === "string") {
      if (changeInfo.status === "complete") {
        await scheduleUpdateBadge();
      }
    } else {
      await scheduleUpdateBadge();
    }
  },
  {
    properties: ["url", "status", "pinned", "hidden"],
  },
);

// init

(async () => {
  await scheduleUpdateBadge();
})();

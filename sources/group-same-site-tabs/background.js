/* global browser */

let collapsed = true;

async function grpTabsForSites(tabs, sites) {
  (tabs = tabs.filter((t) => sites.has(new URL(t.url).hostname))),
    grpTabs(tabs);
}

async function grpSingleSite(site) {
  const tabs = await browser.tabs.query({
    currentWindow: true,
    pinned: false,
    hidden: false,
  });
  grpTabsForSites(tabs, new Set([site]));
}

async function grpSelectedSites() {
  const tabs = await browser.tabs.query({
    currentWindow: true,
    pinned: false,
    hidden: false,
  });
  const sites = new Set(
    tabs.filter((t) => t.highlighted).map((t) => new URL(t.url).hostname),
  );
  grpTabsForSites(tabs, sites);
}

async function grpAllSites() {
  const tabs = await browser.tabs.query({
    currentWindow: true,
    pinned: false,
    hidden: false,
  });
  grpTabs(tabs);
}

async function grpTabs(tabs) {
  const hostname_tabIds_map = new Map(); // str => set(ints)

  const storage = await import("./storage.js");
  const subdomain_list_mode = await storage.get(
    "boolean",
    "subdomain_list_mode",
    false,
  );
  const subdomain_list = (
    await storage.get("string", "subdomain_list", "")
  ).split("\n");

  tabs.forEach((t) => {
    if (typeof t.url !== "string" || !t.url.startsWith("http")) {
      return;
    }

    const t_urlobj = new URL(t.url);
    let t_hostname = t_urlobj.hostname;

    const foundIdx = subdomain_list.indexOf(t_hostname);

    // blacklist + on list  OR  whitelist + not on list
    if (
      (subdomain_list_mode && foundIdx > -1) ||
      (!subdomain_list_mode && foundIdx === -1)
    ) {
      t_hostname = t_hostname.split(".").slice(-2).join(".");
    }

    tmp = hostname_tabIds_map.get(t_hostname);

    if (!tmp) {
      tmp = new Set();
    }
    tmp.add(t.id);

    //
    hostname_tabIds_map.set(t_hostname, tmp);
  });

  // create the groups and move the tabs
  for (let [k, v] of hostname_tabIds_map) {
    const grpId = await browser.tabs.group({
      tabIds: [...v],
    });

    browser.tabGroups.update(grpId, {
      title: k,
      collapsed,
    });
  }
}

browser.menus.create({
  title: "Group by Site(s)",
  contexts: ["tab"],
  onclick: async (clickdata, atab) => {
    if (clickdata.button === 1) {
      collapsed = false;
    } else {
      collapsed = true;
    }
    if (!atab.highlighted) {
      grpSingleSite(new URL(atab.url).hostname);
    } else {
      grpSelectedSites();
    }
  },
});

browser.browserAction.onClicked.addListener((tab, clickdata) => {
  if (clickdata.button === 1) {
    collapsed = false;
  } else {
    collapsed = true;
  }
  grpAllSites();
});

browser.commands.onCommand.addListener((cmd) => {
  switch (cmd) {
    case "group-all":
      collapsed = true;
      grpAllSites();
      break;
    case "group-selected":
      collapsed = true;
      grpSelectedSites();
      break;
    case "group-all-uncollapsed":
      collapsed = false;
      grpAllSites();
      break;
    case "group-selected-uncollapsed":
      collapsed = false;
      grpSelectedSites();
      break;
    default:
      break;
  }
});

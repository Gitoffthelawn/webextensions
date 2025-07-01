/* global browser */

async function grpTabsBySite(all_tabs, sites) {
  sites.forEach(async (site) => {
    const tabIds = all_tabs
      .filter((t) => {
        const turl = new URL(t.url);
        return turl.hostname === site;
      })
      .map((t) => t.id);

    const grpId = await browser.tabs.group({ tabIds });

    site = site.startsWith("www.") ? site.slice(4) : site;
    browser.tabGroups.update(grpId, {
      title: site,
      collapsed: true,
    });
  });
}

async function grpSingleSite(site) {
  const all_tabs = await browser.tabs.query({
    currentWindow: true,
    pinned: false,
    hidden: false,
  });
  grpTabsBySite(all_tabs, [site]);
}

async function grpSelectedSites() {
  const all_tabs = await browser.tabs.query({
    currentWindow: true,
    pinned: false,
    hidden: false,
  });

  const sites = new Set(
    all_tabs.filter((t) => t.highlighted).map((t) => new URL(t.url).hostname),
  );

  grpTabsBySite(all_tabs, [...sites]);
}

async function grpAllSites() {
  const all_tabs = await browser.tabs.query({
    currentWindow: true,
    pinned: false,
    hidden: false,
  });

  const hostname_tabIds_map = new Map(); // str => set(ints)

  all_tabs.forEach((t) => {
    if (typeof t.url !== "string" || !t.url.startsWith("http")) {
      return;
    }

    const t_urlobj = new URL(t.url);
    const t_hostname = t_urlobj.hostname;

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

    k = k.startsWith("www.") ? k.slice(4) : k;
    browser.tabGroups.update(grpId, {
      title: k,
      collapsed: true,
    });
  }
}

browser.menus.create({
  title: "Selected Sites",
  contexts: ["tab"],
  onclick: async (clickdata, atab) => {
    if (!atab.highlighted) {
      grpSingleSite(new URL(atab.url).hostname);
    } else {
      grpSelectedSites();
    }
  },
});

browser.menus.create({
  title: "All Sites",
  contexts: ["tab"],
  onclick: async (clickdata, tab) => {
    grpAllSites();
  },
});

function onCommand(cmd) {
  switch (cmd) {
    case "group-all":
      grpAllSites();
      break;
    case "group-selected":
      grpSelectedSites();
      break;
    default:
      break;
  }
}

browser.browserAction.onClicked.addListener(grpAllSites);
browser.commands.onCommand.addListener(onCommand);

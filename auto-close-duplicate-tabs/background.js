/* global browser */

(async () => {
  let storage = await import("./storage.js");

  const manifest = browser.runtime.getManifest();
  const extname = manifest.name;

  let settings = {
    delayTimerId: null,
    isActive: true,
    ignoredREMatchers: [],
    ignoreWindowScope: false,
    ignoreContainerScope: false,
    ignoreGroupScope: false,
    ignoreURLPath: false,
    ignoreURLParams: false,
  };

  function serializeSearchParams(searchParams) {
    // Sort the key/value pairs
    searchParams.sort();
    let out = searchParams.toString();

    if (out !== "") {
      out = "?" + out;
    }
    return out;
  }

  async function storageString2REArray(storageId) {
    const out = [];
    (await storage.get("string", storageId, "")).split("\n").forEach((line) => {
      line = line.trim();
      if (line !== "") {
        try {
          out.push(new RegExp(line));
        } catch (e) {
          console.error(e);
        }
      }
    });
    return out;
  }

  function containsMatch(regexList, str) {
    for (let i = 0; i < regexList.length; i++) {
      if (regexList[i].test(str)) {
        return true;
      }
    }
    return false;
  }

  async function syncSetting(type, id, fallback) {
    settings[id] = await storage.get(type, id, fallback);
  }

  async function onStorageChanged() {
    settings.ignoredREMatchers = await storageString2REArray(
      "ignoredREMatchersString",
    );
    await syncSetting("boolean", "ignoreWindowScope", false);
    await syncSetting("boolean", "ignoreContainerScope", false);
    await syncSetting("boolean", "ignoreGroupScope", false);
    await syncSetting("boolean", "ignoreURLPath", false);
    await syncSetting("boolean", "ignoreURLParams", false);
    delayed_delDups();
  }

  async function delayed_delDups() {
    clearTimeout(settings.delayTimerId);
    settings.delayTimerId = setTimeout(delDups, 3500); // 3.5 seconds w/o tab status changes
  }

  async function delDups() {
    if (!settings.isActive) {
      return;
    }

    let qryobj = {
      pinned: false,
    };

    const allTabs = await browser.tabs.query(qryobj);

    // check if any tab is still loading , if so we wait
    if (allTabs.some((t) => t.status !== "complete")) {
      delayed_delDups();
      return;
    }

    // all tabs have finished loading at this point

    let focus_groups = [];

    const dup_groups = new Map();

    for (const t of allTabs) {
      if (!containsMatch(settings.ignoredREMatchers, t.url)) {
        const urlobj = new URL(t.url);
        //if (!settings.ignoredHostnames.includes(urlobj.hostname)) {
        let key = urlobj.origin;

        // -----

        if (!settings.ignoreURLPath) {
          key = key + "_" + urlobj.pathname;
        }
        if (!settings.ignoreURLParams) {
          key = key + "_" + serializeSearchParams(urlobj.searchParams);
        }
        if (!settings.ignoreContainerScope) {
          key = t.cookieStoreId + "_" + key;
        }
        if (!settings.ignoreWindowScope) {
          key = t.windowId + "_" + key;
        }
        if (!settings.ignoreGroupScope) {
          if (browser.tabGroups) {
            if (t.groupId) {
              key = t.groupId + "_" + key;
            }
          }
        }

        // -----

        if (!dup_groups.has(key)) {
          dup_groups.set(key, []);
        }
        dup_groups.get(key).push(t);
        if (t.active) {
          focus_groups.push(key);
        }
      }
    }

    let tabsToClose = [];

    for (const [k, v] of dup_groups) {
      // only if multiple tabs have the same key are they dups
      if (v.length > 1) {
        // we'll keep the tabs which are farest from the left side
        // or are active open
        v.sort((a, b) => {
          // close by index if the tabs are in the same window
          if (a.windowId === b.windowId) {
            if (focus_groups.includes(k)) {
              // prefer active
              if (a.active) {
                return -1;
              }
              if (b.active) {
                return 1;
              }
            }
            // close by index in same window
            return b.index - a.index;
          } else {
            // in this case BOTH could be active/focused in the window
            if (focus_groups.includes(k)) {
              if (!(a.active && b.active)) {
                // prefer active
                if (a.active) {
                  return -1;
                }
                if (b.active) {
                  return 1;
                }
              }
            }
          }
          // final fallback
          return b.lastAccessed - a.lastAccessed;
        });

        //out = out + " - " + (v.length - 1) + " x " + v[0].url + "\n";
        // close all tabs after the first element
        //browser.tabs.remove(v.slice(1).map((t) => t.id));
        tabsToClose = tabsToClose.concat(v.slice(1).map((t) => t.id));
      }
    }
    for (const tid of tabsToClose) {
      try {
        await browser.tabs.remove(tid);
      } catch (e) {}
    }
    settings.delayTimerId = null;
  }

  async function onBAClicked() {
    clearTimeout(settings.delayTimerId);
    settings.isActive = !settings.isActive;
    storage.set("isActive", settings.isActive);
    if (settings.isActive) {
      browser.browserAction.setBadgeBackgroundColor({ color: "green" });
      browser.browserAction.setBadgeText({ text: "on" });
      delayed_delDups();
    } else {
      browser.browserAction.setBadgeBackgroundColor({ color: "red" });
      browser.browserAction.setBadgeText({ text: "off" });
    }
  }

  // setup
  await onStorageChanged();
  settings.isActive = await storage.get(
    "boolean",
    "isActive",
    settings.isActive,
  );
  storage.set("isActive", settings.isActive);

  if (settings.isActive) {
    browser.browserAction.setBadgeBackgroundColor({ color: "green" });
    browser.browserAction.setBadgeText({ text: "on" });
  } else {
    browser.browserAction.setBadgeBackgroundColor({ color: "red" });
    browser.browserAction.setBadgeText({ text: "off" });
  }

  // add listeners
  browser.browserAction.onClicked.addListener(onBAClicked);
  browser.tabs.onUpdated.addListener(delayed_delDups, {
    properties: ["url", "status"],
  });
  browser.tabs.onCreated.addListener(delayed_delDups);
  browser.storage.onChanged.addListener(onStorageChanged);
  // tab moving might trigger group changes
  browser.tabs.onMoved.addListener(() => {
    if (!settings.ignoreGroupScope) {
      if (browser.tabGroups) {
        delayed_delDups();
      }
    }
  });
})();

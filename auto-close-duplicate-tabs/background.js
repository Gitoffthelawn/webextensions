/* global browser */

(async () => {
  let storage = await import("./storage.js");

  const manifest = browser.runtime.getManifest();
  const extname = manifest.name;

  let delayTimerId = null;
  let isActive = true;
  let regexList = null;
  let includeAllWindows = false;

  function serializeSearchParams(searchParams) {
    // Sort the key/value pairs
    searchParams.sort();
    let out = searchParams.toString();

    if (out !== "") {
      out = "?" + out;
    }
    return out;
  }

  async function buildRegExList() {
    const out = [];
    (await storage.get("string", "matchers", ""))
      .split("\n")
      .forEach((line) => {
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

  function isOnRegexList(url) {
    for (let i = 0; i < regexList.length; i++) {
      if (regexList[i].test(url)) {
        return true;
      }
    }
    return false;
  }

  async function onStorageChanged() {
    regexList = await buildRegExList();
    includeAllWindows = await storage.get(
      "boolean",
      "includeAllWindows",
      false,
    );
    console.debug(includeAllWindows);
  }

  async function delayed_delDups() {
    clearTimeout(delayTimerId);
    delayTimerId = setTimeout(delDups, 2500); // 2.5 seconds w/o tab status changes
  }

  async function delDups() {
    if (!isActive) {
      return;
    }

    let qryobj = {
      pinned: false,
    };

    if (!includeAllWindows) {
      qryobj["currentWindow"] = true;
    }

    const allTabs = await browser.tabs.query(qryobj);
    const last_focused_window = await browser.windows.getLastFocused({
      populate: false,
    });

    // check if any tab is still loading , if so we wait
    if (allTabs.some((t) => t.status !== "complete")) {
      delayed_delDups();
      return;
    }

    // all tabs have finished loading at this point

    let focus_groups = [];

    const dup_groups = new Map();

    for (const t of allTabs) {
      if (!isOnRegexList(t.url)) {
        const urlobj = new URL(t.url);
        tab_url =
          urlobj.origin +
          urlobj.pathname +
          serializeSearchParams(urlobj.searchParams);

        const key = t.cookieStoreId + "_" + tab_url;

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
              if (a.active && b.active) {
                // closeing neither would be a way to go or close the one in the inactive Window
                // But even if the window is inactive the user could have them open for comparision ...
                // this is kind of a not so straight forward decision
                // i mean the user could still pin the tabs that is a workaround at least

                // lets prefer the active one in the last focused window
                if (a.windowId === last_focused_window.id) {
                  return -1;
                }
                if (b.windowId === last_focused_window.id) {
                  return 1;
                }
                // if we get here, both tabs are in unfocused windows (cant have 2 focused windows AFAIK) ... what todo now?
                // lets just fall back to lastAccessed
                return b.lastAccessed - a.lastAccessed;
              }

              // prefer active
              if (a.active) {
                return -1;
              }
              if (b.active) {
                return 1;
              }
            }
            //return b.lastAccessed - a.lastAccessed;
          }
          // and last fallback
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
    delayTimerId = null;
  }

  async function onBAClicked() {
    clearTimeout(delayTimerId);
    isActive = !isActive;
    storage.set("isActive", isActive);
    if (isActive) {
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
  isActive = await storage.get("boolean", "isActive", isActive);
  storage.set("isActive", isActive);

  if (isActive) {
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
})();

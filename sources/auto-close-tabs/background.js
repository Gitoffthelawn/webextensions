/* global browser */

let closeThreshold = 7;
let saveFolder = "unfiled_____";
const ALARM_PREFIX = "tabCleanUp_";
// per-rule save folder marker meaning "close without bookmarking"
const SAVE_FOLDER_NONE = "__none__";
// alarm name -> rule parameters
let intervalRules = new Map();
let autostart = false;
let ignoreRules = [];

const asyncFilter = async (arr, predicate) => {
  const results = await Promise.all(arr.map(predicate));
  return arr.filter((_v, index) => results[index]);
};

function updateBadge(text, color) {
  browser.browserAction.setBadgeText({
    text,
  });
  browser.browserAction.setBadgeBackgroundColor({
    color,
  });
}

async function setToStorage(id, value) {
  let obj = {};
  obj[id] = value;
  return browser.storage.local.set(obj);
}

async function getFromStorage(type, id, fallback) {
  let tmp = await browser.storage.local.get(id);
  if (typeof tmp[id] === type) {
    return tmp[id];
  } else {
    setToStorage(id, fallback);
    return fallback;
  }
}

async function rebuildIgnoreRules(
  ignorerulesStr_container_regexs,
  ignorerulesStr_url_regexs,
) {
  ignoreRules = [];

  const container_regexs = ignorerulesStr_container_regexs.split("\n");
  const url_regexs = ignorerulesStr_url_regexs.split("\n");

  for (let i = 0; i < container_regexs.length && i < url_regexs.length; i++) {
    try {
      let left = container_regexs[i].trim();
      let right = url_regexs[i].trim();

      if (!left.startsWith("#") && !right.startsWith("#")) {
        const containerNameMatcher = left === "" ? null : new RegExp(left);
        const urlMatcher = right === "" ? null : new RegExp(right);
        if (urlMatcher !== null) {
          ignoreRules.push({ containerNameMatcher, urlMatcher });
        }
      }
    } catch (e) {
      console.error(e);
    }
  }
}

async function clearIntervalAlarms() {
  const alarms = await browser.alarms.getAll();
  for (const a of alarms) {
    if (a.name.startsWith(ALARM_PREFIX)) {
      await browser.alarms.clear(a.name);
    }
  }
  intervalRules.clear();
}

async function rebuildIntervalHandlers(
  intervalrulesStr_time_ms_and_container_regexs,
  intervalrulesStr_url_regexs,
  intervalrulesStr_save_folders,
) {
  // now lets rebuild and start the new alarms

  const time_ms_and_container_regexs =
    intervalrulesStr_time_ms_and_container_regexs.split("\n");
  const url_regexs = intervalrulesStr_url_regexs.split("\n");
  // one line per rule (same line index as the other two lists).
  // "" = use the default folder, SAVE_FOLDER_NONE = don't save, else a folder id.
  // Missing lines (config saved by an older version) mean "use the default".
  const save_folders = (intervalrulesStr_save_folders || "").split("\n");

  for (
    let i = 0;
    i < time_ms_and_container_regexs.length && i < url_regexs.length;
    i++
  ) {
    try {
      let left = time_ms_and_container_regexs[i].trim();
      let right = url_regexs[i].trim();

      if (
        !left.startsWith("#") &&
        !right.startsWith("#") &&
        right !== "" &&
        left !== ""
      ) {
        let left_parts = left.split(",");
        if (left_parts.length < 2) {
          continue;
        }

        const minIdleTimeMilliSecs = parseInt(left_parts[0].trim());
        if (
          !Number.isFinite(minIdleTimeMilliSecs) ||
          minIdleTimeMilliSecs <= 0
        ) {
          continue;
        }

        left = left_parts.slice(1).join(",");

        const containerNameMatcher = left === "" ? null : new RegExp(left);
        const urlMatcher = right === "" ? null : new RegExp(right);

        const name = ALARM_PREFIX + i;
        intervalRules.set(name, {
          minIdleTimeMilliSecs,
          containerNameMatcher,
          urlMatcher,
          saveFolder: (save_folders[i] || "").trim(),
          //consider_hasText,
        });

        const periodInMinutes = minIdleTimeMilliSecs / 60000;
        browser.alarms.create(name, {
          // first run after one period, like setInterval did
          delayInMinutes: periodInMinutes,
          periodInMinutes,
        });
      }
    } catch (e) {
      console.error(e);
    }
  }
}

async function getContainerNameFromCookieStoreId(csid) {
  try {
    const contextualIdentity = await browser.contextualIdentities.get(csid);
    return contextualIdentity.name;
  } catch (e) {
    // not inside a container
  }
  return null;
}

// Bookmarks the tab in the folder chosen by the rule. A rule can use the
// default folder (""), skip saving (SAVE_FOLDER_NONE) or name its own folder.
// If a rule's own folder no longer exists, fall back to the default folder
// so the tab is not lost.
async function saveTabAsBookmark(t, rule) {
  const ruleFolder = typeof rule.saveFolder === "string" ? rule.saveFolder : "";

  if (ruleFolder === SAVE_FOLDER_NONE) {
    return;
  }

  const candidates = [];
  if (ruleFolder !== "") {
    candidates.push(ruleFolder);
  }
  if (typeof saveFolder === "string" && saveFolder !== "") {
    if (!candidates.includes(saveFolder)) {
      candidates.push(saveFolder);
    }
  }

  for (const parentId of candidates) {
    try {
      await browser.bookmarks.create({
        title: t.title,
        url: t.url,
        parentId,
      });
      return;
    } catch (e) {
      console.error(e);
    }
  }
}

async function tabCleanUp(input) {
  if (!autostart) {
    return;
  }

  // to check idle time
  const epoch_now = new Date().getTime();

  let all_tabs = (
    await asyncFilter(
      await browser.tabs.query({
        // we dont want to suprise users and active tabs have no usable
        // lastAccessed time anyways
        active: false,
        // ignore audible
        audible: false,
        // ignore pinned
        pinned: false,
        // care only about normal windows
        windowType: "normal",
      }),
      async (t) => {
        // filter ignored tabs
        const cn = await getContainerNameFromCookieStoreId(t.cookieStoreId);
        for (const el of ignoreRules) {
          if (el.containerNameMatcher === null) {
            if (cn === null) {
              if (el.urlMatcher.test(t.url)) {
                return false;
              }
            }
            continue;
          }
          if (cn === null) {
            continue;
          }
          // both are not null, so lets check
          if (el.containerNameMatcher.test(cn)) {
            if (el.urlMatcher.test(t.url)) {
              return false;
            }
          }
        }
        return true;
      },
    )
  ).sort((a, b) => {
    return a.lastAccessed - b.lastAccessed;
  });

  //console.debug(all_tabs.map( t => t.cookieStoreId + "_" + t.url ));

  let max_nb_of_tabs_to_close = all_tabs.length - closeThreshold;

  if (max_nb_of_tabs_to_close < 1) {
    return;
  }

  for (const t of all_tabs) {
    // stop when we reach the closeThreshold
    if (max_nb_of_tabs_to_close < 1) {
      continue;
    }

    const cn = await getContainerNameFromCookieStoreId(t.cookieStoreId);
    // check the container
    if (input.containerNameMatcher !== null) {
      if (cn !== null) {
        if (!input.containerNameMatcher.test(cn)) {
          continue;
        }
      } else {
        // cn := null
        continue;
      }
    } else {
      // containerNameMatcher === null
      if (cn !== null) {
        continue;
      }
      // cn === containerNameMatcher
    }

    // check the URL
    if (input.urlMatcher !== null) {
      if (!input.urlMatcher.test(t.url)) {
        continue;
      }
    }

    // check the idle aka. last accessed time of the tab
    const delta = epoch_now - t.lastAccessed;
    if (delta < input.minIdleTimeMilliSecs) {
      continue;
    }

    await saveTabAsBookmark(t, input);
    await browser.tabs.remove(t.id);
    max_nb_of_tabs_to_close--;
  }
}

async function onBAClicked(tab) {
  setToStorage("autostart", !autostart);
  onStorageChanged();
}

async function onStorageChanged() {
  autostart = await getFromStorage("boolean", "autostart", false);
  saveFolder = await getFromStorage("string", "saveFolder", "unfiled_____");
  closeThreshold = await getFromStorage(
    "number",
    "closeThreshold",
    closeThreshold,
  );

  // stop all running alarms (also when switching to "off")
  await clearIntervalAlarms();

  if (autostart) {
    updateBadge("on", "green");

    await rebuildIgnoreRules(
      await getFromStorage("string", "ignorerules_container_regex", ""),
      await getFromStorage("string", "ignorerules_url_regex", ""),
    );
    await rebuildIntervalHandlers(
      await getFromStorage(
        "string",
        "intervalrules_time_ms_and_container_regex",
        "",
      ),
      await getFromStorage("string", "intervalrules_url_regex", ""),
      await getFromStorage("string", "intervalrules_save_folder", ""),
    );
  } else {
    updateBadge("off", "red");
  }
}

// must be registered synchronously at top level
browser.alarms.onAlarm.addListener((alarm) => {
  const rule = intervalRules.get(alarm.name);
  if (rule) {
    tabCleanUp(rule);
  }
});

(async () => {
  await onStorageChanged();
  browser.browserAction.onClicked.addListener(onBAClicked);
  browser.runtime.onMessage.addListener((data, sender) => {
    if (data.cmd === "storageChanged") {
      onStorageChanged();
    }
  });
})();

browser.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === "install") {
    browser.runtime.openOptionsPage();
  }
});

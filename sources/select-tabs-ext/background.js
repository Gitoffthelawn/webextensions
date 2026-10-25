/* global browser */

const extname = browser.runtime.getManifest().name;
const SELECTOR_URL = browser.runtime.getURL("selector.html");
const GROUP_PREFIX = "group:";

// ---------------------------------------------------------------------------
// helpers
//
// Every action is called as action(ctx, tab):
//   ctx.notify(msg)  where messages go (system notification or selector window)
//   ctx.narrow       true: "Same Container" narrows an existing multi selection
//   ctx.collect      optional dry run: called with the tabs that would be
//                    selected, nothing is highlighted
//   tab              the reference tab (the tab the selector window was
//                    opened for); its window is the window that gets changed
// and returns the number of selected tabs.
// ---------------------------------------------------------------------------

// fixed id => a new notification replaces the old one instead of stacking
function notify(message, title = extname) {
  return browser.notifications.create("select-tabs-ext", {
    type: "basic",
    iconUrl: "icon.png",
    title,
    message,
  });
}

// always query the window of the reference tab: when the selector window has
// the focus, "currentWindow" would be the selector window itself
function queryTabs(tab, extra = {}) {
  return browser.tabs.query({
    windowId: tab.windowId,
    hidden: false,
    ...extra,
  });
}

// tabs.highlight() makes the first tab of the list the active one,
// so put the clicked tab first to keep it active
function clickedFirst(tabs, tab) {
  return [...tabs].sort((a, b) =>
    a.id === tab.id ? -1 : b.id === tab.id ? 1 : 0,
  );
}

async function highlight(ctx, tabs) {
  if (ctx.collect) {
    ctx.collect(tabs);
    return tabs.length;
  }
  if (tabs.length < 1) {
    ctx.notify("no tabs matched, selection was not changed");
    return 0;
  }
  const byWindow = new Map();
  for (const t of tabs) {
    if (!byWindow.has(t.windowId)) {
      byWindow.set(t.windowId, []);
    }
    byWindow.get(t.windowId).push(t.index);
  }
  for (const [windowId, idxs] of byWindow) {
    await browser.tabs.highlight({ windowId, tabs: idxs, populate: false });
  }
  return tabs.length;
}

// factory for all simple "tabs where predicate(t, referenceTab) is true" actions
const selectWhere = (predicate) => async (ctx, tab) => {
  const tabs = (await queryTabs(tab)).filter((t) => predicate(t, tab));
  return highlight(ctx, clickedFirst(tabs, tab));
};

// ---------------------------------------------------------------------------
// URL helpers
// ---------------------------------------------------------------------------

const DEFAULT_PORTS = {
  "http:": "80",
  "https:": "443",
  "ftp:": "21",
  "ws:": "80",
  "wss:": "443",
};

function parseUrl(t) {
  try {
    return new URL(t.url);
  } catch (e) {
    return null;
  }
}

// opaque origins (about:, moz-extension:, ...) all report "null"
function originOf(u) {
  return u.origin !== "null" ? u.origin : u.protocol + "//" + u.host;
}

const urlProps = {
  origin: originOf,
  hostname: (u) => u.hostname,
  protocol: (u) => u.protocol,
  port: (u) => u.port || DEFAULT_PORTS[u.protocol] || "",
};

const sameUrlProp = (prop) => async (ctx, tab) => {
  const ref = parseUrl(tab);
  if (!ref) {
    ctx.notify("the reference tab has no usable URL");
    return 0;
  }
  const get = urlProps[prop];
  const refVal = get(ref);
  return selectWhere((t) => {
    const u = parseUrl(t);
    return u !== null && get(u) === refVal;
  })(ctx, tab);
};

// ---------------------------------------------------------------------------
// relationship helpers (pure functions, no shared global state)
// ---------------------------------------------------------------------------

// openerTabId is only present if the opener tab still exists
// and is in the same window.
function childrenOf(tabs, id) {
  return tabs.filter((t) => t.openerTabId === id);
}

function descendantsOf(tabs, id) {
  const out = [];
  const seen = new Set([id]);
  const stack = [id];
  while (stack.length > 0) {
    const cur = stack.pop();
    for (const t of tabs) {
      if (t.openerTabId === cur && !seen.has(t.id)) {
        seen.add(t.id);
        out.push(t);
        stack.push(t.id);
      }
    }
  }
  return out.sort((a, b) => a.index - b.index);
}

// the reference tab itself comes first, followed by parent, grandparent, ...
function ancestorsOf(tabs, tab) {
  const byId = new Map(tabs.map((t) => [t.id, t]));
  const out = [tab];
  const seen = new Set([tab.id]);
  let cur = tab;
  while (typeof cur.openerTabId === "number" && byId.has(cur.openerTabId)) {
    cur = byId.get(cur.openerTabId);
    if (seen.has(cur.id)) {
      break;
    }
    seen.add(cur.id);
    out.push(cur);
  }
  return out;
}

// ---------------------------------------------------------------------------
// user defined rules
// ---------------------------------------------------------------------------

const TAB_FIELDS = [
  "id",
  "url",
  "active",
  "attention",
  "audible",
  "autoDiscardable",
  "cookieStoreId",
  "discarded",
  "favIconUrl",
  "height",
  "hidden",
  "highlighted",
  "incognito",
  "index",
  "isArticle",
  "isInReaderMode",
  "lastAccessed",
  "openerTabId",
  "pinned",
  "sessionId",
  "status",
  "successorTabId",
  "title",
  "width",
  "windowId",
];

function snapshot(t) {
  const o = {};
  for (const k of TAB_FIELDS) {
    o[k] = t[k];
  }
  return o;
}

// rules that actually have code
function allRules(store) {
  return (Array.isArray(store.selectors) ? store.selectors : []).filter(
    (r) => typeof r.code === "string" && r.code.trim() !== "",
  );
}

function groupOf(rule) {
  return typeof rule.group === "string" ? rule.group.trim() : "";
}

// Tab data is passed as JSON, so titles/URLs containing quotes or newlines
// can neither break the script nor inject code.
// The closing "}());" is on its own line so that a trailing "// comment"
// in the user's code can't swallow it.
function buildScript(code, clkTab, cmpTab) {
  return `(function() {
const clkTab = ${JSON.stringify(snapshot(clkTab))};
const cmpTab = ${JSON.stringify(snapshot(cmpTab))};
${code}
}());`;
}

async function matchesAllRules(rules, clkTab, cmpTab, stats) {
  for (const rule of rules) {
    let res;
    try {
      res = await browser.tabs.executeScript(cmpTab.id, {
        code: buildScript(rule.code, clkTab, cmpTab),
      });
    } catch (e) {
      // restricted page, tab closed meanwhile, or error in the user's code
      stats.errors++;
      console.error(`rule failed on tab ${cmpTab.id} (${cmpTab.url}):`, e);
      return false;
    }
    if (!Array.isArray(res) || res[0] !== true) {
      return false;
    }
  }
  return true;
}

// Only enabled rules are ever executed:
// opts.group === undefined: AND of all enabled rules
// opts.group is a string:    AND of the enabled rules of that group
async function selectByUserRules(ctx, tab, opts = {}) {
  let store;
  try {
    store = await browser.storage.local.get("selectors");
  } catch (e) {
    console.error("access to rule storage failed", e);
    ctx.notify("could not read the rules from storage");
    return 0;
  }

  const forGroup = typeof opts.group === "string";
  const rules = allRules(store).filter(
    (r) => r.enabled === true && (!forGroup || groupOf(r) === opts.group),
  );
  if (rules.length === 0) {
    ctx.notify(
      forGroup
        ? "this group has no enabled rules, enable some on the options page"
        : "no enabled rules found, add some on the options page",
    );
    return 0;
  }

  const tabs = await queryTabs(tab, { url: "<all_urls>" });
  const stats = { errors: 0 };
  const results = await Promise.all(
    tabs.map(async (t) =>
      (await matchesAllRules(rules, tab, t, stats)) ? t : null,
    ),
  );
  const matched = results.filter((t) => t !== null);

  if (stats.errors > 0 && matched.length === 0) {
    ctx.notify(
      `no tabs matched, ${stats.errors} tab(s) could not be evaluated (see the console)`,
    );
    return 0;
  }
  return highlight(ctx, clickedFirst(matched, tab));
}

// ---------------------------------------------------------------------------
// actions (keys must match the command names in manifest.json and the ids
// used by selector.js)
// ---------------------------------------------------------------------------

const run = {
  All: async (ctx, tab) => highlight(ctx, await queryTabs(tab)),

  // Previously highlighted tabs not included in tabs stop being highlighted.
  Invert: async (ctx, tab) =>
    highlight(ctx, await queryTabs(tab, { highlighted: false })),

  "Same Container": async (ctx, tab) => {
    if (!tab.cookieStoreId) {
      ctx.notify("no container information available");
      return 0;
    }
    // from the menu / a shortcut: with a multi selection, narrow it down
    // instead of widening it
    const multi =
      ctx.narrow && (await queryTabs(tab, { highlighted: true })).length > 1;
    const tabs = await queryTabs(tab, {
      cookieStoreId: tab.cookieStoreId,
      ...(multi ? { highlighted: true } : {}),
    });
    return highlight(ctx, clickedFirst(tabs, tab));
  },

  "Same Group": async (ctx, tab) => {
    if (typeof tab.groupId !== "number") {
      ctx.notify("tab groups are not supported by this browser version");
      return 0;
    }
    const tabs = await queryTabs(tab, { groupId: tab.groupId });
    return highlight(ctx, clickedFirst(tabs, tab));
  },

  Bookmarked: async (ctx, tab) => {
    const urls = new Set();
    for (const b of await browser.bookmarks.search({})) {
      if (typeof b.url === "string") {
        urls.add(b.url.trim());
      }
    }
    return selectWhere((t) => urls.has(t.url))(ctx, tab);
  },

  // --- relationship ---
  Descendents: async (ctx, tab) =>
    highlight(ctx, descendantsOf(await queryTabs(tab), tab.id)),

  Siblings: async (ctx, tab) => {
    if (typeof tab.openerTabId !== "number") {
      ctx.notify("the reference tab has no opener, so it has no siblings");
      return 0;
    }
    const tabs = childrenOf(await queryTabs(tab), tab.openerTabId).filter(
      (t) => t.id !== tab.id,
    );
    return highlight(ctx, tabs);
  },

  Children: async (ctx, tab) =>
    highlight(ctx, childrenOf(await queryTabs(tab), tab.id)),

  Parent: async (ctx, tab) =>
    highlight(
      ctx,
      (await queryTabs(tab)).filter((t) => t.id === tab.openerTabId),
    ),

  Ancestors: async (ctx, tab) =>
    highlight(ctx, ancestorsOf(await queryTabs(tab), tab)),

  // --- URL property ---
  "Same URL": selectWhere((t, tab) => t.url === tab.url),
  "Same Origin": sameUrlProp("origin"),
  "Same Domain": sameUrlProp("hostname"),
  "Same Port": sameUrlProp("port"),
  "Same Protocol": sameUrlProp("protocol"),

  // --- directional (nearest tab first) ---
  "To the Left": async (ctx, tab) => {
    const tabs = (await queryTabs(tab))
      .filter((t) => t.index < tab.index)
      .sort((a, b) => b.index - a.index);
    return highlight(ctx, tabs);
  },

  "To the Right": async (ctx, tab) => {
    const tabs = (await queryTabs(tab))
      .filter((t) => t.index > tab.index)
      .sort((a, b) => a.index - b.index);
    return highlight(ctx, tabs);
  },

  // --- state ---
  Pinned: selectWhere((t) => t.pinned),
  Muted: selectWhere((t) => t.mutedInfo && t.mutedInfo.muted),
  Loading: selectWhere((t) => t.status === "loading"),
  Complete: selectWhere((t) => t.status === "complete"),
  Audible: selectWhere((t) => t.audible),
  "Auto Discardable": selectWhere((t) => t.autoDiscardable),

  UserScripts: (ctx, tab) => selectByUserRules(ctx, tab),
};

// "group:<name>" runs the rules of one rule group, everything else is in `run`
function runAction(name, ctx, tab) {
  if (name.startsWith(GROUP_PREFIX)) {
    return selectByUserRules(ctx, tab, {
      group: name.slice(GROUP_PREFIX.length),
    });
  }
  const action = Object.prototype.hasOwnProperty.call(run, name)
    ? run[name]
    : null;
  if (typeof action !== "function") {
    throw new Error("unknown action: " + name);
  }
  return action(ctx, tab);
}

// ---------------------------------------------------------------------------
// selector window: stays open while filters are applied
// ---------------------------------------------------------------------------

let selectorWindowId = null;

async function openSelector(tab) {
  // one window at a time, it is re-created for the window it was opened from
  if (selectorWindowId !== null) {
    try {
      await browser.windows.remove(selectorWindowId);
    } catch (e) {
      // already closed
    }
    selectorWindowId = null;
  }

  const width = 940;
  const height = 640;
  const opts = {
    url: `${SELECTOR_URL}?windowId=${tab.windowId}&tabId=${tab.id}`,
    type: "popup",
    width,
    height,
  };
  try {
    // place it at the right edge of the window it controls
    const parent = await browser.windows.get(tab.windowId);
    if (Number.isFinite(parent.left) && Number.isFinite(parent.width)) {
      opts.left = Math.max(0, parent.left + parent.width - width - 24);
      opts.top = Math.max(0, (parent.top || 0) + 48);
    }
  } catch (e) {
    // let the browser pick a position
  }
  const created = await browser.windows.create(opts);
  selectorWindowId = created.id;
}

browser.windows.onRemoved.addListener((id) => {
  if (id === selectorWindowId) {
    selectorWindowId = null;
  }
});

// requests from the selector window: evaluate a filter without selecting
// anything and return the tabs it would select, in the order they would be
// handed to tabs.highlight() (the first one becomes the active tab)
async function previewFromSelector(msg) {
  let tab = null;
  try {
    tab = await browser.tabs.get(msg.tabId);
  } catch (e) {
    // the reference tab is gone
  }
  if (!tab || tab.windowId !== msg.windowId) {
    tab = (
      await browser.tabs.query({ windowId: msg.windowId, active: true })
    )[0];
  }
  if (!tab) {
    return { tabs: [], message: "the target window has no tabs" };
  }

  const messages = [];
  let collected = [];
  const ctx = {
    notify: (m) => messages.push(m),
    narrow: false,
    collect: (tabs) => {
      collected = tabs;
    },
  };
  try {
    await runAction(msg.id, ctx, tab);
  } catch (e) {
    console.error(msg.id, e);
    return { tabs: [], message: `failed: ${e.message || e}`, tabId: tab.id };
  }
  return {
    tabs: collected.map((t) => ({
      id: t.id,
      index: t.index,
      title: t.title,
      url: t.url,
      favIconUrl: t.favIconUrl,
    })),
    message: messages.join(" "),
    tabId: tab.id,
  };
}

// exact page match (ignoring ?query and #hash), a plain startsWith() would
// also accept e.g. ".../selector.html.other"
function isSelectorPage(url) {
  try {
    const u = new URL(url);
    return `${u.protocol}//${u.host}${u.pathname}` === SELECTOR_URL;
  } catch (e) {
    return false;
  }
}

browser.runtime.onMessage.addListener((msg, sender) => {
  // only our own selector page may ask for a selection (the code of user
  // rules runs as a content script inside web pages and must not be able to)
  if (
    !sender.url ||
    !isSelectorPage(sender.url) ||
    !msg ||
    msg.cmd !== "preview" ||
    typeof msg.id !== "string" ||
    !Number.isInteger(msg.windowId) ||
    !Number.isInteger(msg.tabId)
  ) {
    return undefined;
  }
  return previewFromSelector(msg);
});

// ---------------------------------------------------------------------------
// toolbar button: opens the selector window, all filters live in there
// ---------------------------------------------------------------------------

// `tab` is the active tab of the window the button was clicked in
browser.browserAction.onClicked.addListener((tab) => {
  dispatch("Open Selector", tab);
});

// ---------------------------------------------------------------------------
// dispatch for the toolbar button and the keyboard shortcuts
// ---------------------------------------------------------------------------

async function dispatch(name, tab) {
  try {
    if (!tab) {
      tab = (
        await browser.tabs.query({ currentWindow: true, active: true })
      )[0];
    }
    if (!tab) {
      return;
    }
    if (name === "Open Selector") {
      await openSelector(tab);
      return;
    }
    await runAction(name, { notify, narrow: true }, tab);
  } catch (e) {
    console.error(name, e);
    notify(`"${name}" failed: ${e.message || e}`);
  }
}

browser.commands.onCommand.addListener((command, tab) => {
  dispatch(command, tab);
});

// On a fresh install without any rules, add the (disabled) example rules
browser.runtime.onInstalled.addListener(async (details) => {
  if (details.reason !== "install") {
    return;
  }
  try {
    const { selectors } = await browser.storage.local.get("selectors");
    if (Array.isArray(selectors) && selectors.length > 0) {
      return;
    }
    const res = await fetch(browser.runtime.getURL("examples.json"));
    const examples = await res.json();
    await browser.storage.local.set({
      selectors: examples.map((e, idx) => ({ ...e, idx })),
    });
  } catch (e) {
    console.error("adding the example rules failed", e);
  }
});

// EOF

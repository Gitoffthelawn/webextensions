/* global browser */

const params = new URLSearchParams(location.search);
const windowId = Number(params.get("windowId"));
let refTabId = Number(params.get("tabId"));

const $ = (id) => document.getElementById(id);
const statusEl = $("status");
const GROUP_PREFIX = "group:";

const isRuleFilter = (id) => id.startsWith(GROUP_PREFIX);
// rule filters that have something to run (at least one enabled rule);
// every other rule filter can neither be previewed nor applied
let activeRuleIds = new Set();

// [action id, label] -- ids are the keys of `run` in background.js
const SECTIONS = [
  {
    title: "General",
    items: [
      ["All", "All"],
      ["Invert", "Invert Selection"],
      ["Same Container", "Same Container"],
      ["Same Group", "Same Group"],
      ["Bookmarked", "Bookmarked"],
    ],
  },
  {
    title: "Relationship",
    items: [
      ["Descendents", "Descendants"],
      ["Siblings", "Siblings"],
      ["Children", "Children"],
      ["Parent", "Parent"],
      ["Ancestors", "Ancestors"],
    ],
  },
  {
    title: "Directional",
    items: [
      ["To the Left", "To the Left"],
      ["To the Right", "To the Right"],
    ],
  },
  {
    title: "URL Property",
    items: [
      ["Same URL", "Same URL"],
      ["Same Origin", "Same Origin"],
      ["Same Domain", "Same Domain"],
      ["Same Port", "Same Port"],
      ["Same Protocol", "Same Protocol"],
    ],
  },
  {
    title: "State",
    items: [
      ["Pinned", "Pinned"],
      ["Muted", "Muted"],
      ["Loading", "Loading"],
      ["Complete", "Complete"],
      ["Audible", "Audible"],
      ["Auto Discardable", "Auto Discardable"],
    ],
  },
];

// ---------------------------------------------------------------------------
// remembered UI state (open sections, size of the preview)
// ---------------------------------------------------------------------------

const UI_KEY = "select-tabs-ext:ui";

function loadUi() {
  try {
    return JSON.parse(localStorage.getItem(UI_KEY)) || {};
  } catch (e) {
    return {};
  }
}

function saveUi(patch) {
  try {
    localStorage.setItem(UI_KEY, JSON.stringify({ ...loadUi(), ...patch }));
  } catch (e) {
    // storage not available, the window just forgets its layout
  }
}

// ---------------------------------------------------------------------------
// status line
// ---------------------------------------------------------------------------

let lastId = null; // the filter that is previewed right now

// clicks are handled one after the other, so results can't interleave
let queue = Promise.resolve();

function setPressed(id) {
  lastId = id;
  for (const b of document.querySelectorAll("button[data-id]")) {
    b.setAttribute("aria-pressed", b.dataset.id === id ? "true" : "false");
  }
}

// kind: "info" (preview), "ok" (applied), "warn"
function setStatus(text, kind = "info") {
  statusEl.textContent = text;
  statusEl.className = kind;
}

// ---------------------------------------------------------------------------
// favicons: only http(s)/data images, anything else (chrome:, moz-extension:)
// can't be loaded by this page and would show a broken image
// ---------------------------------------------------------------------------

const SAFE_ICON = /^(https?:|data:image\/)/i;

function placeholderIcon() {
  const s = document.createElement("span");
  s.className = "fav ph";
  return s;
}

function iconEl(url) {
  if (typeof url !== "string" || !SAFE_ICON.test(url)) {
    return placeholderIcon();
  }
  const img = document.createElement("img");
  img.className = "fav";
  img.alt = "";
  img.width = 16;
  img.height = 16;
  img.addEventListener("error", () => img.replaceWith(placeholderIcon()));
  img.src = url;
  return img;
}

// ---------------------------------------------------------------------------
// two steps: 1. preview (nothing changes)  2. Apply (tabs get selected)
// ---------------------------------------------------------------------------

const MAX_ROWS = 1000;

// the tabs that would be selected, in the order they are handed to
// tabs.highlight() (the first one becomes the active tab):
// { label, tabs: [{ id, index, title, url, favIconUrl }] }
let preview = null;
// how to rebuild the preview: { kind: "filter", id, label } | { kind: "range" }
let source = null;

const toRow = (t) => ({
  id: t.id,
  index: t.index,
  title: t.title,
  url: t.url,
  favIconUrl: t.favIconUrl,
});

// the preview is to the right of the filters, only in a narrow window
// (see the media query in selector.html) it moves below them
const NARROW = "(max-width: 640px)";
const isStacked = () =>
  !!window.matchMedia && window.matchMedia(NARROW).matches;

function emptyRow(text) {
  const li = document.createElement("li");
  li.className = "empty";
  li.textContent = text;
  return li;
}

function renderPreview() {
  const list = $("previewList");
  list.replaceChildren();
  const n = preview ? preview.tabs.length : 0;

  $("previewTitle").textContent = preview
    ? `${preview.label}: ${n} tab(s)`
    : "Preview";
  $("applyBtn").disabled = n === 0;
  $("applyBtn").textContent = n > 0 ? `Apply (${n})` : "Apply";
  $("refreshBtn").disabled = source === null;

  if (!preview) {
    list.append(
      emptyRow(
        `Pick a filter ${isStacked() ? "above" : "on the left"} to see which tabs it would select.`,
      ),
    );
    return;
  }
  if (n === 0) {
    list.append(emptyRow("No tabs match this filter."));
    return;
  }

  // shown in tab order, applied in the order given by the filter
  const rows = [...preview.tabs].sort((a, b) => a.index - b.index);
  for (const t of rows.slice(0, MAX_ROWS)) {
    const li = document.createElement("li");
    li.title = `${t.title || ""}\n${t.url || ""}`;

    const idx = document.createElement("span");
    idx.className = "idx";
    idx.textContent = String(t.index);

    const txt = document.createElement("div");
    txt.className = "txt";
    const trow = document.createElement("div");
    trow.className = "trow";
    const title = document.createElement("div");
    title.className = "t";
    title.textContent = t.title || "(no title)";
    trow.append(title);
    if (t.id === refTabId) {
      const tag = document.createElement("span");
      tag.className = "tag";
      tag.textContent = "reference";
      trow.append(tag);
    }
    const url = document.createElement("div");
    url.className = "u";
    url.textContent = t.url || "";
    txt.append(trow, url);

    li.append(idx, iconEl(t.favIconUrl), txt);
    list.append(li);
  }
  if (rows.length > MAX_ROWS) {
    const li = document.createElement("li");
    li.className = "more";
    li.textContent = `\u2026 and ${rows.length - MAX_ROWS} more`;
    list.append(li);
  }
}

function clearPreview() {
  preview = null;
  source = null;
  setPressed(null);
  renderPreview();
}

const NO_ENABLED_RULES = "no enabled rules, enable some on the options page";

// step 1 for the filter buttons: ask the background script what a filter
// would select
async function previewFilter(id, label) {
  if (isRuleFilter(id) && !activeRuleIds.has(id)) {
    // e.g. a button that was clicked while its last enabled rule got disabled
    setStatus(`${label}: ${NO_ENABLED_RULES}`, "warn");
    return;
  }
  setPressed(id);
  source = { kind: "filter", id, label };
  let res;
  try {
    res = await browser.runtime.sendMessage({
      cmd: "preview",
      id,
      windowId,
      tabId: refTabId,
    });
  } catch (e) {
    res = { tabs: [], message: String(e) };
  }
  if (!res) {
    res = { tabs: [], message: "no answer from the background script" };
  }
  if (typeof res.tabId === "number" && res.tabId !== refTabId) {
    refTabId = res.tabId; // the old reference tab was closed
    updateRef();
  }
  const tabs = Array.isArray(res.tabs) ? res.tabs : [];
  preview = { label, tabs };
  renderPreview();
  if (tabs.length > 0) {
    setStatus(
      `${label}: ${tabs.length} tab(s) would be selected, press Apply`,
      "info",
    );
  } else {
    setStatus(
      `${label}: ${res.message || "no tabs would be selected"}`,
      "warn",
    );
  }
}

// step 2: select exactly the previewed tabs
async function applyPreview() {
  if (!preview || preview.tabs.length === 0) {
    return;
  }
  if (
    source &&
    source.kind === "filter" &&
    isRuleFilter(source.id) &&
    !activeRuleIds.has(source.id)
  ) {
    setStatus(`${preview.label}: ${NO_ENABLED_RULES}`, "warn");
    return;
  }
  try {
    // fresh data: tabs may have been moved or closed since the preview
    const fresh = new Map(
      (await browser.tabs.query({ windowId, hidden: false })).map((t) => [
        t.id,
        t,
      ]),
    );
    const tabs = preview.tabs.map((t) => fresh.get(t.id)).filter(Boolean);
    if (tabs.length === 0) {
      setStatus(
        `${preview.label}: the previewed tabs do not exist any more, press Refresh`,
        "warn",
      );
      return;
    }
    await browser.tabs.highlight({
      windowId,
      tabs: tabs.map((t) => t.index),
      populate: false,
    });
    const gone = preview.tabs.length - tabs.length;
    preview = { label: preview.label, tabs: tabs.map(toRow) }; // current indexes
    renderPreview();
    setStatus(
      `${preview.label}: ${tabs.length} tab(s) selected` +
        (gone > 0 ? ` (${gone} closed since the preview)` : ""),
      "ok",
    );
  } catch (e) {
    setStatus(`failed: ${e.message || e}`, "warn");
  }
}

function refreshPreview() {
  if (!source) {
    return Promise.resolve();
  }
  return source.kind === "range"
    ? previewRange()
    : previewFilter(source.id, source.label);
}

$("applyBtn").addEventListener("click", () => {
  queue = queue.then(applyPreview);
});
$("refreshBtn").addEventListener("click", () => {
  queue = queue.then(refreshPreview);
});

// Ctrl+Enter applies the preview from anywhere in the window
document.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
    e.preventDefault();
    if (!$("applyBtn").disabled) {
      $("applyBtn").click();
    }
  }
});

function makeButton(id, label, tip) {
  const b = document.createElement("button");
  b.type = "button";
  b.textContent = label;
  b.dataset.id = id;
  b.dataset.label = label;
  if (tip) {
    b.title = tip;
  }
  b.setAttribute("aria-pressed", id === lastId ? "true" : "false");
  b.addEventListener("click", () => {
    queue = queue.then(() => previewFilter(id, label));
  });
  return b;
}

// ---------------------------------------------------------------------------
// reference tab
// ---------------------------------------------------------------------------

async function updateRef() {
  try {
    const tab = await browser.tabs.get(refTabId);
    $("refTitle").textContent = tab.title || tab.url;
    $("refTitle").title = tab.url;
    $("refUrl").textContent = tab.url || "";
    $("refIcon").replaceChildren(iconEl(tab.favIconUrl));
  } catch (e) {
    $("refTitle").textContent = "(closed, the active tab is used)";
    $("refTitle").title = "";
    $("refUrl").textContent = "";
    $("refIcon").replaceChildren(placeholderIcon());
  }
}

$("useActive").addEventListener("click", async () => {
  const [tab] = await browser.tabs.query({ windowId, active: true });
  if (tab) {
    refTabId = tab.id;
    updateRef();
  }
});

// ---------------------------------------------------------------------------
// sections: an accordion, exactly one section is open at a time (or none);
// opening a section closes the others, the open one is remembered
// ---------------------------------------------------------------------------

const DEFAULT_SECTION = "General";
let openTitle = null; // title of the open section, null: all collapsed

const sectionEls = () => [...document.querySelectorAll("#sections > details")];
const isSearching = () => document.body.classList.contains("searching");

function showOnly(title) {
  openTitle = title;
  for (const sec of sectionEls()) {
    sec.open = sec.dataset.title === title;
  }
}

// mouse click, Enter and Space all end up here (summary activation)
function onSummaryClick(e) {
  e.preventDefault(); // the open state is managed here, not by the browser
  const sec = e.currentTarget.parentElement;
  if (isSearching()) {
    // matches are spread over several sections: open/close them freely and
    // keep the remembered section for when the search is cleared
    sec.open = !sec.open;
    return;
  }
  showOnly(sec.open ? null : sec.dataset.title);
  saveUi({ openSection: openTitle });
  if (sec.open && sec.scrollIntoView) {
    sec.scrollIntoView({ block: "nearest" });
  }
}

function prepareSummary(sum) {
  sum.tabIndex = 0;
  sum.addEventListener("click", onSummaryClick);
}

// Up/Down/Home/End move between the section headers
document.addEventListener("keydown", (e) => {
  if (!e.target || e.target.tagName !== "SUMMARY") {
    return;
  }
  const sums = sectionEls()
    .filter((s) => !s.hidden)
    .map((s) => s.querySelector("summary"));
  const i = sums.indexOf(e.target);
  const to =
    e.key === "ArrowDown"
      ? sums[i + 1]
      : e.key === "ArrowUp"
        ? sums[i - 1]
        : e.key === "Home"
          ? sums[0]
          : e.key === "End"
            ? sums[sums.length - 1]
            : undefined;
  if (to) {
    e.preventDefault();
    to.focus();
  }
});

function section(title) {
  const wrap = document.createElement("details");
  wrap.dataset.title = title;
  const sum = document.createElement("summary");
  sum.textContent = title;
  prepareSummary(sum);
  const box = document.createElement("div");
  box.className = "chips";
  wrap.append(sum, box);
  return { wrap, box };
}

const userSection = section("User Scripts");
userSection.wrap.id = "userRules";

// footer row: explanation on the left, the way to the rules on the right
const rulesHint = document.createElement("p");
rulesHint.className = "hint";
const rulesBtn = document.createElement("button");
rulesBtn.type = "button";
rulesBtn.id = "openOptions";
rulesBtn.className = "btn";
rulesBtn.textContent = "\u2699 Scripts\u2026";
rulesBtn.title =
  "open the options page to add, edit, enable or disable user scripts";
rulesBtn.addEventListener("click", () => {
  browser.runtime.openOptionsPage();
});
const rulesFoot = document.createElement("div");
rulesFoot.className = "rulesFoot";
rulesFoot.append(rulesHint, rulesBtn);
userSection.wrap.append(rulesFoot);

async function renderUserRules() {
  const { box } = userSection;
  box.replaceChildren();
  activeRuleIds = new Set();

  try {
    let selectors = [];
    try {
      const store = await browser.storage.local.get("selectors");
      if (Array.isArray(store.selectors)) {
        selectors = store.selectors;
      }
    } catch (e) {
      // treated like "no rules"
    }
    const rules = selectors.filter(
      (r) => typeof r.code === "string" && r.code.trim() !== "",
    );

    if (rules.length === 0) {
      rulesHint.textContent = "No rules yet, add some on the options page.";
      return;
    }

    const groupOf = (r) => (typeof r.group === "string" ? r.group.trim() : "");
    const counts = new Map(); // group -> { total, enabled }
    for (const r of rules) {
      const c = counts.get(groupOf(r)) || { total: 0, enabled: 0 };
      c.total++;
      if (r.enabled === true) {
        c.enabled++;
      }
      counts.set(groupOf(r), c);
    }
    const enabled = rules.filter((r) => r.enabled === true).length;
    if (enabled === 0) {
      rulesHint.textContent =
        "None of your rules is enabled, enable some on the options page.";
      return;
    }

    // only groups that have something to run
    const groups = [...counts.keys()]
      .filter((g) => counts.get(g).enabled > 0)
      .sort((a, b) => (a === "" ? 1 : b === "" ? -1 : a.localeCompare(b)));
    for (const g of groups) {
      const c = counts.get(g);
      activeRuleIds.add(GROUP_PREFIX + g);
      box.append(
        makeButton(
          GROUP_PREFIX + g,
          g === "" ? "(no group)" : g,
          `${c.enabled} of ${c.total} rule(s) enabled, a tab must match all enabled ones`,
        ),
      );
    }
    rulesHint.textContent =
      "Only enabled rules run. A group matches tabs that satisfy all of its enabled rules; groups without enabled rules are not listed.";
  } finally {
    applySearch(); // keep an active search consistent with the new buttons
  }
}

// ---------------------------------------------------------------------------
// search: narrows the filter buttons down while typing
// ---------------------------------------------------------------------------

const TIME_KEYWORDS =
  "last access time range slider recent old minutes hours days presets";
const RULES_KEYWORDS =
  "user scripts rules userscripts options edit add enable disable";

function applySearch() {
  const tokens = $("filterSearch")
    .value.toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
  const searching = tokens.length > 0;
  const wasSearching = document.body.classList.contains("searching");
  document.body.classList.toggle("searching", searching);

  let anyVisible = false;
  for (const sec of document.querySelectorAll("#sections > details")) {
    if (searching && !wasSearching) {
      sec.open = true; // matches in a collapsed section must be visible
    }

    let visible = 0;
    if (sec.id === "timeSection") {
      visible = tokens.every((t) => TIME_KEYWORDS.includes(t)) ? 1 : 0;
    } else {
      const title = (sec.dataset.title || "").toLowerCase();
      for (const b of sec.querySelectorAll("button[data-id]")) {
        const hay = `${b.dataset.label} ${title}`.toLowerCase();
        const match = tokens.every((t) => hay.includes(t));
        b.hidden = !match;
        if (match) {
          visible++;
        }
      }
      if (sec.id === "userRules" && visible === 0) {
        // stays reachable without a search, and for searches like "edit" or
        // "options", because it holds the button that opens the options page
        if (!searching || tokens.every((t) => RULES_KEYWORDS.includes(t))) {
          visible = 1;
        }
      }
    }
    sec.hidden = visible === 0;
    if (visible > 0) {
      anyVisible = true;
    }
  }
  $("noMatch").hidden = anyVisible;
  if (!searching && wasSearching) {
    showOnly(openTitle); // back to the single remembered section
  }
}

$("filterSearch").addEventListener("input", applySearch);
$("filterSearch").addEventListener("keydown", (e) => {
  if (e.key === "Escape" && $("filterSearch").value !== "") {
    e.preventDefault();
    $("filterSearch").value = "";
    applySearch();
  } else if (e.key === "Enter" && !e.ctrlKey && !e.metaKey) {
    const first = document.querySelector(
      "#sections button[data-id]:not([hidden])",
    );
    if (first) {
      e.preventDefault();
      first.click();
    }
  }
});

// ---------------------------------------------------------------------------
// last access time: two thumbs, left = oldest access, right = newest access
// ---------------------------------------------------------------------------

const MINUTE = 60 * 1000;
const oldInput = $("rangeOld");
const newInput = $("rangeNew");
const fill = $("fill");

let entries = []; // [{ id, age }]  age = minutes since the last access
let hi = 1; // age (minutes) at the left end of the slider
let span = 1; // slider length in minutes, one step = one minute

// [key, label, older bound, newer bound] in minutes; the bounds of a preset
// may lie outside of the range the open tabs cover, so they are kept exactly
// instead of being derived from the (clamped) thumb positions
const PRESETS = [
  ["hour", "Last hour", 60, 0],
  ["day", "Last 24 h", 1440, 0],
  ["older-day", "Older than 1 day", Infinity, 1440],
  ["older-week", "Older than 1 week", Infinity, 10080],
];
let preset = null; // { key, older, newer } while a preset is active

function fmtAge(min) {
  min = Math.round(min);
  if (min <= 0) {
    return "now";
  }
  const d = Math.floor(min / 1440);
  const h = Math.floor((min % 1440) / 60);
  const m = min % 60;
  const parts = [];
  if (d) {
    parts.push(d + " d");
  }
  if (h) {
    parts.push(h + " h");
  }
  if (m && d === 0) {
    parts.push(m + " min");
  }
  return parts.join(" ") + " ago";
}

// slider position p (0..span) <-> age in minutes (hi .. hi - span)
const ageAt = (p) => hi - p;

function bounds() {
  if (preset) {
    return { older: preset.older, newer: preset.newer };
  }
  return {
    older: ageAt(Number(oldInput.value)),
    newer: ageAt(Number(newInput.value)),
  };
}

function matchedEntries() {
  const { older, newer } = bounds();
  return entries.filter((e) => e.age <= older && e.age >= newer);
}

function updateRange(changed) {
  if (changed) {
    preset = null; // moving a thumb leaves the preset
  }
  let a = Number(oldInput.value);
  let b = Number(newInput.value);

  // the thumbs may touch but not cross
  if (a > b) {
    if (changed === oldInput) {
      a = b;
    } else {
      b = a;
    }
    oldInput.value = a;
    newInput.value = b;
  }

  // keep the thumb that can still move on top when both overlap
  oldInput.style.zIndex = a > span / 2 ? 2 : 1;
  newInput.style.zIndex = a > span / 2 ? 1 : 2;

  fill.style.left = (a / span) * 100 + "%";
  fill.style.width = ((b - a) / span) * 100 + "%";

  const { older, newer } = bounds();
  $("labelOld").textContent = fmtAge(Math.min(older, hi));
  $("labelNew").textContent = fmtAge(newer);
  $("rangeCount").textContent =
    `${matchedEntries().length} of ${entries.length} tabs`;
  for (const b2 of document.querySelectorAll("button[data-preset]")) {
    b2.setAttribute(
      "aria-pressed",
      preset && b2.dataset.preset === preset.key ? "true" : "false",
    );
  }
}

function applyPreset([key, , older, newer]) {
  preset = { key, older, newer };
  // move the thumbs as close to the bounds as the range allows (display only)
  const clamp = (p) => Math.max(0, Math.min(span, Math.round(p)));
  oldInput.value = clamp(hi - Math.min(older, hi));
  newInput.value = clamp(hi - newer);
  updateRange();
  queue = queue.then(previewRange);
}

function buildPresets() {
  const box = $("presets");
  box.replaceChildren();
  for (const p of PRESETS) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "btn";
    b.textContent = p[1];
    b.dataset.preset = p[0];
    b.setAttribute("aria-pressed", "false");
    b.addEventListener("click", () => applyPreset(p));
    box.append(b);
  }
}

// (re)fit the slider to the tabs of the controlled window
async function initRange() {
  preset = null;
  const tabs = await browser.tabs.query({ windowId, hidden: false });
  const now = Date.now();
  entries = tabs.map((t) => ({
    id: t.id,
    age: Math.max(0, (now - t.lastAccessed) / MINUTE),
  }));

  const ticks = $("ticks");
  ticks.replaceChildren();
  if (entries.length === 0) {
    $("rangeCount").textContent = "no tabs";
    return;
  }

  // left end = oldest tab, right end = newest tab
  const ages = entries.map((e) => e.age);
  const lo = Math.floor(Math.min(...ages));
  hi = Math.ceil(Math.max(...ages));
  if (hi <= lo) {
    hi = lo + 1;
  }
  span = hi - lo;

  for (const input of [oldInput, newInput]) {
    input.min = 0;
    input.max = span;
  }
  oldInput.value = 0; // everything by default
  newInput.value = span;

  $("endOld").textContent = fmtAge(hi);
  $("endNew").textContent = fmtAge(lo);

  // one tick per tab shows how the tabs are distributed over time
  for (const e of entries) {
    const tick = document.createElement("div");
    tick.className = "tick";
    tick.style.left = ((hi - e.age) / span) * 100 + "%";
    ticks.appendChild(tick);
  }
  updateRange();
}

async function previewRange() {
  setPressed(null);
  source = { kind: "range" };
  try {
    const base = { windowId, hidden: false };
    // fresh tab data, tabs may have been moved or closed in the meantime
    const fresh = new Map(
      (await browser.tabs.query(base)).map((t) => [t.id, t]),
    );
    let ids = matchedEntries().map((e) => e.id);
    if ($("rangeNarrow").checked) {
      const hl = await browser.tabs.query({ ...base, highlighted: true });
      if (hl.length > 1) {
        const keep = new Set(hl.map((t) => t.id));
        ids = ids.filter((id) => keep.has(id));
      }
    }
    const tabs = ids
      .map((id) => fresh.get(id))
      .filter(Boolean)
      .sort((a, b) => a.index - b.index);
    const label = preset
      ? `Last access (${PRESETS.find((p) => p[0] === preset.key)[1].toLowerCase()})`
      : "Last access";
    preview = { label, tabs: tabs.map(toRow) };
    renderPreview();
    if (tabs.length > 0) {
      setStatus(
        `${label}: ${tabs.length} tab(s) would be selected, press Apply`,
        "info",
      );
    } else {
      setStatus(`${label}: no tab in this range`, "warn");
    }
  } catch (e) {
    setStatus(`Last access: failed: ${e.message || e}`, "warn");
  }
}

oldInput.addEventListener("input", () => updateRange(oldInput));
newInput.addEventListener("input", () => updateRange(newInput));
for (const input of [oldInput, newInput]) {
  // "change" fires when a thumb is released (or a key press moved it)
  input.addEventListener("change", () => {
    queue = queue.then(previewRange);
  });
}
$("rangeRefresh").addEventListener("click", () => {
  initRange();
});

// ---------------------------------------------------------------------------
// splitter between the filters (left) and the preview (right)
// ---------------------------------------------------------------------------

const MIN_PREVIEW_W = 260;
const MIN_FILTERS_W = 300;
const KEY_STEP = 24;
let previewWidth = 400;

function setPreviewWidth(px, persist) {
  const max = Math.max(MIN_PREVIEW_W, window.innerWidth - MIN_FILTERS_W);
  previewWidth = Math.max(MIN_PREVIEW_W, Math.min(max, Math.round(px)));
  $("previewPanel").style.flexBasis = previewWidth + "px";
  $("splitter").setAttribute("aria-valuenow", String(previewWidth));
  if (persist) {
    saveUi({ previewWidth });
  }
}

// dragging to the left makes the preview wider
$("splitter").addEventListener("mousedown", (e) => {
  e.preventDefault();
  const startX = e.clientX;
  const startW = previewWidth;
  const move = (ev) => setPreviewWidth(startW + (startX - ev.clientX), false);
  const up = () => {
    document.removeEventListener("mousemove", move);
    document.removeEventListener("mouseup", up);
    saveUi({ previewWidth });
  };
  document.addEventListener("mousemove", move);
  document.addEventListener("mouseup", up);
});

$("splitter").addEventListener("keydown", (e) => {
  if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
    e.preventDefault();
    setPreviewWidth(
      previewWidth + (e.key === "ArrowLeft" ? KEY_STEP : -KEY_STEP),
      true,
    );
  }
});

// keep the preview within bounds when the window is resized
window.addEventListener("resize", () => {
  setPreviewWidth(previewWidth, false);
  if (!preview) {
    renderPreview(); // the position word in the hint depends on the layout
  }
});

// ---------------------------------------------------------------------------
// start
// ---------------------------------------------------------------------------

function build() {
  const root = $("sections");
  const anchor = $("noMatch");
  for (const s of SECTIONS) {
    const { wrap, box } = section(s.title);
    for (const [id, label] of s.items) {
      box.append(makeButton(id, label));
    }
    root.insertBefore(wrap, anchor);
  }
  prepareSummary($("timeSection").querySelector("summary"));
  root.insertBefore($("timeSection"), anchor);
  root.insertBefore(userSection.wrap, anchor);

  // the remembered section (also "none"), the first start opens the first one
  let remembered = loadUi().openSection;
  if (remembered === "User rules") {
    remembered = "User Scripts"; // renamed in 1.10.1
  }
  showOnly(remembered === undefined ? DEFAULT_SECTION : remembered);

  buildPresets();
  const saved = loadUi().previewWidth;
  setPreviewWidth(Number.isFinite(saved) ? saved : previewWidth, false);
  renderPreview();
  renderUserRules();
  initRange();
}

// rules saved on the options page show up without reopening the window
browser.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.selectors) {
    queue = queue.then(async () => {
      await renderUserRules();
      // a previewed rule filter would otherwise show an outdated result,
      // or stay applicable although it has nothing to run any more
      if (source && source.kind === "filter" && isRuleFilter(source.id)) {
        if (activeRuleIds.has(source.id)) {
          await previewFilter(source.id, source.label);
        } else {
          const label = source.label;
          clearPreview();
          setStatus(`${label}: no enabled rules any more`, "warn");
        }
      }
    });
  }
});

// nothing left to control once the browser window is gone
browser.windows.onRemoved.addListener((id) => {
  if (id === windowId) {
    window.close();
  }
});

build();
updateRef();
$("filterSearch").focus();

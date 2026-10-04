/* global browser */

const $ = (id) => document.getElementById(id);

const state = {
  feeds: [], // every feed found, flagged removed / selected
  checked: [], // every candidate URL that was checked, found or not
  filterType: "all",
  filterText: "",
  sort: "default",
  subscribeTemplate: "",
  pageUrl: "",
};

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

async function openFeedInTab(evt) {
  evt.stopPropagation();
  evt.preventDefault();
  const url = evt.currentTarget.href;
  // open blank first, so the background script can register the tab
  // before the feed request is made
  const tab = await browser.tabs.create({ active: true, url: "about:blank" });
  await browser.runtime.sendMessage({ action: "forceText", tabId: tab.id });
  browser.tabs.update(tab.id, { url });
}

function openPreview(url) {
  browser.tabs.create({
    active: true,
    url:
      browser.runtime.getURL("preview.html") +
      "?url=" +
      encodeURIComponent(url),
  });
}

function subscribeUrl(feedUrl) {
  const tpl = state.subscribeTemplate.trim();
  if (tpl === "") {
    return null;
  }
  const target = tpl
    .replace(/\{rawurl\}/g, feedUrl)
    .replace(/\{url\}/g, encodeURIComponent(feedUrl));
  try {
    const u = new URL(target);
    return u.protocol === "http:" || u.protocol === "https:" ? u.href : null;
  } catch (e) {
    return null;
  }
}

function flashButton(btn, text) {
  const original = btn.dataset.flashing
    ? btn.dataset.original
    : btn.textContent;
  btn.dataset.flashing = "1";
  btn.dataset.original = original;
  btn.textContent = text;
  clearTimeout(btn._flashTimer);
  btn._flashTimer = setTimeout(() => {
    delete btn.dataset.flashing;
    btn.textContent = btn.dataset.original;
    refreshToolbar();
  }, 1200);
}

function copyText(text, btn, doneLabel) {
  navigator.clipboard
    .writeText(text)
    .then(() => flashButton(btn, doneLabel))
    .catch(() => {
      // clipboard API unavailable/blocked; nothing more we can do here
    });
}

function xmlEscape(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildOpml(feeds) {
  const lines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<opml version="2.0">',
    "  <head>",
    "    <title>" + xmlEscape("Feeds found on " + state.pageUrl) + "</title>",
    "    <dateCreated>" + new Date().toUTCString() + "</dateCreated>",
    "  </head>",
    "  <body>",
  ];
  for (const f of feeds) {
    const name = xmlEscape(f.title || f.url);
    let line =
      '    <outline type="rss" text="' +
      name +
      '" title="' +
      name +
      '" xmlUrl="' +
      xmlEscape(f.url) +
      '"';
    if (f.link) {
      line += ' htmlUrl="' + xmlEscape(f.link) + '"';
    }
    lines.push(line + " />");
  }
  lines.push("  </body>", "</opml>", "");
  return lines.join("\n");
}

function downloadFile(filename, text, mime) {
  const url = URL.createObjectURL(new Blob([text], { type: mime }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

function exportOpml() {
  const feeds = visibleFeeds();
  if (feeds.length < 1) {
    return;
  }
  let host = "feeds";
  try {
    host = new URL(state.pageUrl).hostname.replace(/[^\w.-]/g, "_") || host;
  } catch (e) {
    // keep default
  }
  downloadFile(
    "feeds-" + host + ".opml",
    buildOpml(feeds),
    "text/x-opml;charset=utf-8",
  );
}

// ---------------------------------------------------------------------------
// State helpers
// ---------------------------------------------------------------------------

function activeFeeds() {
  return state.feeds.filter((f) => !f.removed);
}

function isFiltered() {
  return state.filterType !== "all" || state.filterText.trim() !== "";
}

function matchesFilter(f) {
  if (state.filterType !== "all" && f.type !== state.filterType) {
    return false;
  }
  const q = state.filterText.trim().toLowerCase();
  return (
    q === "" ||
    f.url.toLowerCase().includes(q) ||
    (f.title || "").toLowerCase().includes(q)
  );
}

const byOrder = (a, b) => a.order - b.order;

const sorters = {
  default: (a, b) => Number(b.declared) - Number(a.declared) || byOrder(a, b),
  title: (a, b) =>
    (a.title || a.url).localeCompare(b.title || b.url) || byOrder(a, b),
  type: (a, b) => a.type.localeCompare(b.type) || byOrder(a, b),
  newest: (a, b) => (b.latest || 0) - (a.latest || 0) || byOrder(a, b),
};

function visibleFeeds() {
  return activeFeeds().filter(matchesFilter).sort(sorters[state.sort]);
}

function selectedFeeds() {
  return visibleFeeds().filter((f) => f.selected);
}

function removeFeed(entry) {
  entry.removed = true;
  entry.selected = false;
  render();
}

function restoreFeed(entry) {
  entry.removed = false;
  render();
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

function makeButton(className, label, title, onClick) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "row-btn " + className;
  btn.textContent = label;
  if (title) {
    btn.title = title;
  }
  btn.addEventListener("click", onClick, false);
  return btn;
}

function createRow(entry, removed) {
  const li = document.createElement("li");

  if (!removed) {
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.className = "row-select";
    cb.title = "Select";
    cb.checked = entry.selected;
    cb.addEventListener("change", () => {
      entry.selected = cb.checked;
      refreshToolbar();
    });
    li.appendChild(cb);
  }

  const badge = document.createElement("span");
  badge.className = "type-badge " + (entry.type === "json" ? "json" : "xml");
  badge.textContent = entry.type;
  li.appendChild(badge);

  if (entry.declared) {
    const tag = document.createElement("span");
    tag.className = "declared-tag";
    tag.textContent = "declared";
    tag.title = 'Declared by the page itself in a <link rel="alternate"> tag';
    li.appendChild(tag);
  }

  const main = document.createElement("div");
  main.className = "feed-main";
  if (entry.title) {
    const title = document.createElement("div");
    title.className = "feed-title";
    title.textContent = entry.title;
    title.title = entry.title;
    main.appendChild(title);
  }
  const link = document.createElement("a");
  link.className = "feed-link";
  link.href = entry.url;
  link.textContent = entry.url;
  link.title = entry.url;
  link.addEventListener("click", openFeedInTab, false);
  main.appendChild(link);

  const meta = [];
  if (typeof entry.items === "number") {
    meta.push(entry.items + (entry.items === 1 ? " item" : " items"));
  }
  if (entry.latest) {
    meta.push("latest " + new Date(entry.latest).toLocaleDateString());
  }
  if (meta.length > 0) {
    const m = document.createElement("div");
    m.className = "feed-meta";
    m.textContent = meta.join(" · ");
    main.appendChild(m);
  }
  li.appendChild(main);

  li.appendChild(
    makeButton(
      "preview-btn",
      "Preview",
      "Open a rendered preview of this feed in a new tab",
      () => openPreview(entry.url),
    ),
  );

  const sub = subscribeUrl(entry.url);
  if (sub) {
    li.appendChild(
      makeButton("subscribe-btn", "Subscribe", sub, () =>
        browser.tabs.create({ active: true, url: sub }),
      ),
    );
  }

  const copyBtn = makeButton("copy-btn", "Copy", "", (evt) => {
    evt.stopPropagation();
    evt.preventDefault();
    copyText(entry.url, copyBtn, "Copied");
  });
  li.appendChild(copyBtn);

  li.appendChild(
    makeButton(
      "remove-btn",
      "Remove",
      "Move to the removed list (excluded from Copy all)",
      () => removeFeed(entry),
    ),
  );
  li.appendChild(
    makeButton("restore-btn", "Restore", "", () => restoreFeed(entry)),
  );
  return li;
}

function render() {
  const list = $("feedlist");
  const removedList = $("removedlist");
  list.replaceChildren();
  removedList.replaceChildren();
  for (const f of visibleFeeds()) {
    list.appendChild(createRow(f, false));
  }
  for (const f of state.feeds.filter((x) => x.removed).sort(byOrder)) {
    removedList.appendChild(createRow(f, true));
  }
  refreshToolbar();
}

function refreshToolbar() {
  const active = activeFeeds();
  const visible = visibleFeeds();
  const removedCount = state.feeds.length - active.length;

  $("toolbar").hidden = active.length < 1;

  const copyAll = $("copyAllBtn");
  const opml = $("exportOpmlBtn");
  copyAll.hidden = active.length < 1;
  opml.hidden = active.length < 1;
  copyAll.disabled = visible.length < 1;
  opml.disabled = visible.length < 1;
  if (!copyAll.dataset.flashing) {
    copyAll.textContent =
      (isFiltered() ? "Copy shown (" : "Copy all (") + visible.length + ")";
  }

  $("noMatch").hidden = !(active.length > 0 && visible.length < 1);

  const selected = visible.filter((f) => f.selected);
  $("selectionBar").hidden = selected.length < 1;
  $("selectionCount").textContent = selected.length + " selected";
  const selectAll = $("selectAll");
  selectAll.checked = visible.length > 0 && selected.length === visible.length;
  selectAll.indeterminate =
    selected.length > 0 && selected.length < visible.length;

  $("removedSection").hidden = removedCount < 1;
  $("removedTitle").textContent = "Removed (" + removedCount + ")";
}

function renderChecked() {
  const rows = state.checked.filter(Boolean);
  const details = $("checkedDetails");
  details.hidden = rows.length < 1;
  $("checkedSummary").textContent = "Checked URLs (" + rows.length + ")";
  const ul = $("checkedlist");
  ul.replaceChildren();
  for (const c of rows) {
    const li = document.createElement("li");
    const mark = document.createElement("span");
    mark.className = "mark " + (c.ok ? "ok" : "fail");
    mark.textContent = c.ok ? "✓" : "✗";
    const url = document.createElement("span");
    url.className = "url";
    url.textContent = c.url;
    const reason = document.createElement("span");
    reason.className = "reason";
    reason.textContent = c.ok ? "feed" : c.reason;
    li.appendChild(mark);
    li.appendChild(url);
    li.appendChild(reason);
    ul.appendChild(li);
  }
  if (state.feeds.length < 1) {
    details.open = true;
  }
}

function addFeed(obj, order) {
  state.feeds.push({
    url: obj.url,
    type: obj.type === "json" ? "json" : "xml",
    title: obj.title || "",
    items: obj.items,
    latest: obj.latest || null,
    link: obj.link || "",
    declared: obj.declared === true,
    order: typeof order === "number" ? order : state.feeds.length,
    removed: false,
    selected: false,
  });
  render();
}

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------

function decodeQueryParam(p) {
  return decodeURIComponent(p.replace(/\+/g, " "));
}

function setupToolbar() {
  $("copyAllBtn").addEventListener("click", (evt) => {
    evt.stopPropagation();
    evt.preventDefault();
    const urls = visibleFeeds().map((f) => f.url);
    copyText(
      urls.join("\n"),
      evt.currentTarget,
      "Copied " + urls.length + (urls.length === 1 ? " URL" : " URLs"),
    );
  });
  $("exportOpmlBtn").addEventListener("click", exportOpml);

  for (const chip of document.querySelectorAll(".chip")) {
    chip.addEventListener("click", () => {
      state.filterType = chip.dataset.type;
      for (const c of document.querySelectorAll(".chip")) {
        c.classList.toggle("is-active", c === chip);
      }
      render();
    });
  }
  $("filterText").addEventListener("input", (evt) => {
    state.filterText = evt.target.value;
    render();
  });
  $("sortSelect").addEventListener("change", (evt) => {
    state.sort = evt.target.value;
    render();
  });

  $("selectAll").addEventListener("change", (evt) => {
    for (const f of visibleFeeds()) {
      f.selected = evt.target.checked;
    }
    render();
  });
  $("copySelectedBtn").addEventListener("click", (evt) => {
    const urls = selectedFeeds().map((f) => f.url);
    copyText(urls.join("\n"), evt.currentTarget, "Copied " + urls.length);
  });
  $("removeSelectedBtn").addEventListener("click", () => {
    for (const f of selectedFeeds()) {
      f.removed = true;
      f.selected = false;
    }
    render();
  });
  $("clearSelectionBtn").addEventListener("click", () => {
    for (const f of state.feeds) {
      f.selected = false;
    }
    render();
  });
  $("restoreAllBtn").addEventListener("click", () => {
    for (const f of state.feeds) {
      f.removed = false;
    }
    render();
  });
}

async function loadSubscribeTemplate() {
  try {
    const res = await browser.storage.local.get("subscribeTemplate");
    if (typeof res.subscribeTemplate === "string") {
      state.subscribeTemplate = res.subscribeTemplate;
    }
  } catch (e) {
    console.debug(e);
  }
  browser.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes.subscribeTemplate) {
      state.subscribeTemplate = changes.subscribeTemplate.newValue || "";
      render();
    }
  });
}

async function init() {
  const msg = $("msg");
  const target = $("target");
  const progress = $("urls2checkProgress");

  setupToolbar();
  await loadSubscribeTemplate();

  // every find window receives all runtime messages, so tag this window's
  // request with a unique id and ignore progress meant for other windows
  const requestId = crypto.randomUUID();

  browser.runtime.onMessage.addListener((data) => {
    if (!data || data.requestId !== requestId) {
      return;
    }
    if (data.nburls2check) {
      progress.setAttribute("max", parseInt(data.nburls2check));
    }
    if (data.checked && typeof data.order === "number") {
      state.checked[data.order] = data.checked;
    }
    if (data.urls2checkProgress) {
      progress.setAttribute("value", data.urls2checkProgress);
      if (data.feed !== false) {
        addFeed(data.feed, data.order);
      }
    }
  });

  const popupsearchparams = new URL(document.location.href).searchParams;
  const pageUrl = decodeQueryParam(popupsearchparams.get("url"));
  state.pageUrl = pageUrl;

  msg.textContent = "Looking for feed-like URLs";
  target.textContent = pageUrl;
  document.title = pageUrl;

  const found = await browser.runtime.sendMessage({
    requestId,
    tabId: popupsearchparams.get("tabId"),
    url: pageUrl,
  });

  progress.style.display = "none";
  renderChecked();

  if (found < 1) {
    msg.textContent = "No feed-like URLs found on";
    $("emptyState").hidden = false;
    return;
  }
  msg.textContent =
    found +
    (found === 1 ? " feed-like URL found on" : " feed-like URLs found on");
}

init();

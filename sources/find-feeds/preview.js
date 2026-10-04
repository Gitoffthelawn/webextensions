/* global FeedParser */

const MAX_ITEMS = 100;
const MAX_SUMMARY_CHARS = 600;
const MAX_ENCLOSURES = 3;
const MAX_RAW_CHARS = 500000;
const FETCH_TIMEOUT_MS = 15000;

const $ = (id) => document.getElementById(id);

const view = {
  sourceUrl: "",
  raw: "",
  entries: [], // items plus pre-computed summary text / search haystack
  query: "",
  showRaw: false,
};

// ---------- helpers ----------

function el(tag, className, text) {
  const e = document.createElement(tag);
  if (className) {
    e.className = className;
  }
  if (text !== undefined) {
    e.textContent = text;
  }
  return e;
}

function linkOrText(parent, text, href) {
  if (href) {
    const a = el("a", "", text);
    a.href = href;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    parent.appendChild(a);
  } else {
    parent.appendChild(document.createTextNode(text));
  }
}

function formatDate(str) {
  if (!str) {
    return "";
  }
  const t = FeedParser.parseTimestamp(str);
  return t === null ? str : new Date(t).toLocaleString();
}

function formatBytes(n) {
  if (!n || n < 0) {
    return "";
  }
  if (n < 1024) {
    return n + " B";
  }
  if (n < 1024 * 1024) {
    return (n / 1024).toFixed(0) + " KB";
  }
  return (n / (1024 * 1024)).toFixed(1) + " MB";
}

// ---------- rendering ----------

function renderHead(feed) {
  const head = $("feedHead");
  const titleText = feed.meta.title || "(untitled feed)";

  const row = el("div", "title-row");
  const h1 = el("h1");
  linkOrText(h1, titleText, FeedParser.safeUrl(feed.meta.link, view.sourceUrl));
  row.appendChild(h1);
  row.appendChild(el("span", "type-badge " + feed.type, feed.type));
  head.appendChild(row);

  if (feed.meta.description) {
    head.appendChild(
      el(
        "p",
        "feed-desc",
        FeedParser.truncate(FeedParser.htmlToText(feed.meta.description), 400),
      ),
    );
  }
  head.appendChild(el("p", "feed-source", view.sourceUrl));

  const count = el("p", "feed-count");
  count.id = "feedCount";
  head.appendChild(count);

  const latest = FeedParser.latestTimestamp(feed);
  view.updatedText = latest === null ? "" : new Date(latest).toLocaleString();

  head.hidden = false;
  document.title = titleText + " – Feed preview";
}

function updateCount(shown) {
  const total = view.entries.length;
  const parts = [total + (total === 1 ? " item" : " items")];
  if (view.query !== "") {
    parts[0] = shown + " of " + parts[0] + " match";
  }
  if (view.updatedText) {
    parts.push("updated " + view.updatedText);
  }
  $("feedCount").textContent = parts.join(" · ");
}

function renderEnclosures(li, item) {
  const list = (item.enclosures || [])
    .map((e) => ({ ...e, href: FeedParser.safeUrl(e.url, view.sourceUrl) }))
    .filter((e) => e.href)
    .slice(0, MAX_ENCLOSURES);
  if (list.length < 1) {
    return;
  }
  const box = el("div", "item-enclosures");
  for (const e of list) {
    const label = [e.type || "attachment", formatBytes(e.length)]
      .filter(Boolean)
      .join(", ");
    const line = el("div");
    linkOrText(line, "⬇ " + label, e.href);
    box.appendChild(line);
    if (/^audio\//i.test(e.type)) {
      // nothing is loaded until the user presses play
      const audio = el("audio");
      audio.controls = true;
      audio.preload = "none";
      audio.src = e.href;
      box.appendChild(audio);
    }
  }
  li.appendChild(box);
}

function renderItems() {
  const q = view.query.trim().toLowerCase();
  const list = $("items");
  list.replaceChildren();

  const matching = view.entries.filter((e) => q === "" || e.hay.includes(q));
  for (const item of matching.slice(0, MAX_ITEMS)) {
    const li = el("li");

    const title = el("h2", "item-title");
    linkOrText(
      title,
      item.title || item.link || "(untitled)",
      FeedParser.safeUrl(item.link, view.sourceUrl),
    );
    li.appendChild(title);

    const meta = [formatDate(item.date), item.author]
      .filter(Boolean)
      .join(" · ");
    if (meta) {
      li.appendChild(el("p", "item-meta", meta));
    }
    if (item.summaryText) {
      li.appendChild(
        el(
          "p",
          "item-summary",
          FeedParser.truncate(item.summaryText, MAX_SUMMARY_CHARS),
        ),
      );
    }
    renderEnclosures(li, item);
    list.appendChild(li);
  }

  $("noMatch").hidden = !(q !== "" && matching.length < 1);
  const note = $("note");
  if (matching.length > MAX_ITEMS) {
    note.textContent =
      "Showing the first " + MAX_ITEMS + " of " + matching.length + " items.";
    note.hidden = false;
  } else {
    note.hidden = true;
  }
  updateCount(matching.length);
}

function applyRawToggle() {
  const toggle = $("rawToggle");
  $("items").hidden = view.showRaw;
  $("noMatch").hidden = view.showRaw || $("noMatch").hidden;
  $("search").hidden = view.showRaw;
  $("raw").hidden = !view.showRaw;
  toggle.textContent = view.showRaw
    ? "Show rendered preview"
    : "Show raw source";
  if (view.showRaw) {
    $("note").hidden = true;
    const raw = $("raw");
    if (raw.textContent === "") {
      raw.textContent =
        view.raw.length > MAX_RAW_CHARS
          ? view.raw.slice(0, MAX_RAW_CHARS) + "\n\n… (truncated)"
          : view.raw;
    }
  } else {
    renderItems();
  }
}

function renderFeed(feed) {
  renderHead(feed);
  view.entries = feed.items.map((it) => {
    const summaryText = it.summary ? FeedParser.htmlToText(it.summary) : "";
    return {
      ...it,
      summaryText,
      hay: [it.title, it.author, summaryText].join(" ").toLowerCase(),
    };
  });
  $("toolbar").hidden = false;
  $("search").addEventListener("input", (evt) => {
    view.query = evt.target.value;
    renderItems();
  });
  $("rawToggle").addEventListener("click", () => {
    view.showRaw = !view.showRaw;
    applyRawToggle();
  });
  renderItems();
}

function showError(message, sourceUrl) {
  const status = $("status");
  status.className = "error";
  status.textContent = message;
  const href = sourceUrl && FeedParser.safeUrl(sourceUrl);
  if (href) {
    status.appendChild(document.createTextNode(" "));
    const a = el("a", "", "Open the URL directly");
    a.href = href;
    status.appendChild(a);
  }
}

// ---------- init ----------

async function init() {
  const status = $("status");
  const sourceUrl = new URL(document.location.href).searchParams.get("url");

  if (!sourceUrl || !FeedParser.safeUrl(sourceUrl)) {
    showError("No valid http(s) feed URL was given.");
    return;
  }
  view.sourceUrl = sourceUrl;

  try {
    const res = await fetch(sourceUrl, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) {
      throw new Error("The server answered with HTTP " + res.status + ".");
    }
    const bytes = new Uint8Array(await res.arrayBuffer());
    view.raw = FeedParser.decodeBytes(bytes, res.headers.get("content-type"));
    const feed = FeedParser.parseFeed(view.raw);
    status.hidden = true;
    renderFeed(feed);
  } catch (e) {
    showError("Could not preview this feed: " + e.message, sourceUrl);
  }
}

init();

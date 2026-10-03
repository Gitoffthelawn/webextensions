/* global browser */

const ROOT_ID = "root________";
const out = document.getElementById("output");
const formatSel = document.getElementById("format");
const countEl = document.getElementById("count");
const wrapCb = document.getElementById("wrap");
const emptyCb = document.getElementById("empty");
const editedEl = document.getElementById("edited");

// Text as last generated from the bookmark tree, used to detect user edits
let generated = "";
let lastFormat;

const isEdited = () => out.value !== generated;
const updateIndicator = () => {
  editedEl.hidden = !isEdited();
};
// Regenerating the text overwrites edits, so ask first
const confirmDiscard = () =>
  !isEdited() || confirm("Discard your edits and regenerate the text?");

let tree = null;

// Titles may contain newlines or odd whitespace; keep each entry on one line.
const clean = (s) => (s || "").replace(/\s+/g, " ").trim();
const pad = (d) => "  ".repeat(d);

const formats = {
  text: {
    ext: "txt",
    base: 1, // top-level folders are indented under the header line
    header: (t) => `> ${t}`,
    folder: (n, d) => `${pad(d)}> ${clean(n.title) || "(no title)"}`,
    link: (n, d) => `${pad(d)}${clean(n.title) || n.url} : ${n.url}`,
  },
  markdown: {
    ext: "md",
    base: 0,
    header: (t) => `# ${t}\n`,
    folder: (n, d) => `${pad(d)}- **${clean(n.title) || "(no title)"}**`,
    link: (n, d) => {
      const t = (clean(n.title) || n.url).replace(/([[\]])/g, "\\$1");
      return `${pad(d)}- [${t}](${n.url})`;
    },
  },
  urls: {
    ext: "txt",
    base: 0,
    header: null,
    folder: null,
    link: (n) => n.url,
  },
};

// A folder counts as empty if no bookmark exists anywhere beneath it
// (folders holding only separators or only empty subfolders are empty too)
function hasBookmarks(node) {
  if (node.type === "separator") return false;
  if (typeof node.url === "string") return true;
  return (node.children || []).some(hasBookmarks);
}

function walk(node, depth, fmt, lines, stats) {
  if (node.type === "separator") return;

  if (typeof node.url === "string") {
    lines.push(fmt.link(node, depth));
    stats.bookmarks++;
    return;
  }

  // Folder: skip empty ones (and everything under them) unless requested
  if (!emptyCb.checked && !hasBookmarks(node)) return;
  if (node.id !== ROOT_ID && fmt.folder) {
    lines.push(fmt.folder(node, depth));
    stats.folders++;
  }
  const childDepth = node.id !== ROOT_ID && fmt.folder ? depth + 1 : depth;
  for (const child of node.children || []) {
    walk(child, childDepth, fmt, lines, stats);
  }
}

function datePrefix() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function render() {
  if (!tree) return;
  const fmt = formats[formatSel.value];
  const title = `${datePrefix()} Export Bookmarks as Text`;
  const lines = [];
  const stats = { bookmarks: 0, folders: 0 };

  if (fmt.header) lines.push(fmt.header(title));
  walk(tree, fmt.base, fmt, lines, stats);

  document.title = title;
  out.value = lines.join("\n");
  generated = out.value;
  updateIndicator();
  countEl.textContent = `${stats.bookmarks} bookmarks, ${stats.folders} folders`;
}

async function refresh(force = false) {
  if (!force && !confirmDiscard()) return;
  try {
    const [root] = await browser.bookmarks.getTree();
    tree = root;
    render();
  } catch (err) {
    console.error(err);
    out.value = "Failed to load bookmarks: " + err;
    generated = out.value;
    updateIndicator();
  }
}

let copyTimer;
async function copy() {
  const btn = document.getElementById("copy");
  clearTimeout(copyTimer);
  try {
    await navigator.clipboard.writeText(out.value);
    btn.textContent = "Copied!";
  } catch (err) {
    console.error(err);
    btn.textContent = "Copy failed";
  }
  copyTimer = setTimeout(() => {
    btn.textContent = "Copy";
  }, 1500);
}

function download() {
  const fmt = formats[formatSel.value];
  const blob = new Blob([out.value], { type: "text/plain;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${datePrefix()}-bookmarks.${fmt.ext}`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

document.addEventListener("DOMContentLoaded", () => {
  try {
    const saved = localStorage.getItem("format");
    if (saved && formats[saved]) formatSel.value = saved;
  } catch (e) {
    /* storage unavailable, use default */
  }

  try {
    wrapCb.checked = localStorage.getItem("wrap") === "1";
    emptyCb.checked = localStorage.getItem("empty") === "1"; // default: hidden
  } catch (e) {
    /* use defaults */
  }
  out.classList.toggle("wrap", wrapCb.checked);
  wrapCb.addEventListener("change", () => {
    out.classList.toggle("wrap", wrapCb.checked);
    try {
      localStorage.setItem("wrap", wrapCb.checked ? "1" : "0");
    } catch (e) {
      /* ignore */
    }
  });

  lastFormat = formatSel.value;
  emptyCb.addEventListener("change", () => {
    if (!confirmDiscard()) {
      emptyCb.checked = !emptyCb.checked;
      return;
    }
    try {
      localStorage.setItem("empty", emptyCb.checked ? "1" : "0");
    } catch (e) {
      /* ignore */
    }
    render();
  });
  formatSel.addEventListener("change", () => {
    if (!confirmDiscard()) {
      formatSel.value = lastFormat;
      return;
    }
    lastFormat = formatSel.value;
    try {
      localStorage.setItem("format", formatSel.value);
    } catch (e) {
      /* ignore */
    }
    render();
  });

  out.addEventListener("input", updateIndicator);
  document.getElementById("copy").addEventListener("click", copy);
  document.getElementById("download").addEventListener("click", download);

  document.getElementById("refresh").addEventListener("click", () => refresh());

  // Icon click while this page is already open: reload the tree on request only
  browser.runtime.onMessage.addListener((m) => {
    if (m && m.cmd === "refresh") refresh();
  });

  refresh(true); // initial load: nothing to discard yet
});

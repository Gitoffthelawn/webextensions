/*global browser */

const WHITELIST_HINT =
  "Whitelist mode: only tabs matching a pattern below are allowed to load in the background. Everything else stays discarded until selected.";
const BLACKLIST_HINT =
  "Blacklist mode: tabs matching a pattern below are discarded until selected. Everything else is allowed to load normally.";

let savedHintTimer = null;

function isComment(line) {
  return line.trim().startsWith("#");
}

function parseLines(text) {
  // Returns array of { raw, trimmed, isComment, isEmpty, regex, error }
  return text.split("\n").map((raw) => {
    const trimmed = raw.trim();
    const entry = {
      raw,
      trimmed,
      isComment: isComment(trimmed),
      isEmpty: trimmed === "",
      regex: null,
      error: null,
    };
    if (!entry.isEmpty && !entry.isComment) {
      try {
        entry.regex = new RegExp(trimmed);
      } catch (e) {
        entry.error = e.message;
      }
    }
    return entry;
  });
}

function updateModeHint() {
  const modeEl = document.getElementById("mode");
  const hintEl = document.getElementById("mode-hint");
  hintEl.textContent = modeEl.checked ? BLACKLIST_HINT : WHITELIST_HINT;
}

function renderGutter(lines, matchIndices) {
  const gutter = document.getElementById("gutter");
  matchIndices = matchIndices || new Set();
  gutter.innerHTML = "";
  lines.forEach((line, idx) => {
    const div = document.createElement("div");
    div.className = "line";
    if (line.error) {
      div.className += " error";
      div.title = line.error;
    } else if (line.isComment) {
      div.className += " comment";
    }
    if (matchIndices.has(idx)) {
      div.className += " match";
    }
    div.textContent = String(idx + 1);
    gutter.appendChild(div);
  });
}

function updatePatternStatus() {
  const textEl = document.getElementById("matchers");
  const countEl = document.getElementById("pattern-count");
  const errEl = document.getElementById("pattern-errors");

  const lines = parseLines(textEl.value);
  const valid = lines.filter((l) => l.regex).length;
  const errors = lines
    .map((l, idx) => (l.error ? idx + 1 : null))
    .filter((n) => n !== null);

  countEl.textContent = `${valid} pattern${valid === 1 ? "" : "s"}`;
  errEl.textContent =
    errors.length > 0
      ? `Invalid regex on line${errors.length > 1 ? "s" : ""} ${errors.join(", ")}`
      : "";

  runUrlTest(); // keep the tester + gutter highlighting in sync with pattern edits
  return lines;
}

function syncGutterScroll() {
  const textEl = document.getElementById("matchers");
  const gutter = document.getElementById("gutter");
  gutter.scrollTop = textEl.scrollTop;
}

function runUrlTest() {
  const urlEl = document.getElementById("test-url");
  const resultEl = document.getElementById("test-result");
  const modeEl = document.getElementById("mode");
  const textEl = document.getElementById("matchers");

  const url = urlEl.value.trim();
  const lines = parseLines(textEl.value);

  if (url === "") {
    resultEl.textContent = "";
    resultEl.className = "test-result";
    renderGutter(lines);
    syncGutterScroll();
    return;
  }

  const matchIndices = new Set();
  lines.forEach((line, idx) => {
    if (line.regex && line.regex.test(url)) {
      matchIndices.add(idx);
    }
  });
  const matched = matchIndices.size > 0;
  const blacklistMode = modeEl.checked;

  // Same logic as background.js: mode(true)=blacklist, mode(false)=whitelist
  const wouldBeDiscarded =
    (blacklistMode && matched) || (!blacklistMode && !matched);

  if (!url.startsWith("http")) {
    resultEl.textContent =
      "Not an http(s) URL — this extension only acts on http/https tabs.";
    resultEl.className = "test-result";
  } else if (wouldBeDiscarded) {
    resultEl.textContent = matched
      ? `Would be discarded — matches line${matchIndices.size > 1 ? "s" : ""} ${[...matchIndices].map((i) => i + 1).join(", ")}`
      : "Would be discarded — no pattern matches (whitelist mode).";
    resultEl.className = "test-result blocked";
  } else {
    resultEl.textContent = matched
      ? `Would load normally — matches line${matchIndices.size > 1 ? "s" : ""} ${[...matchIndices].map((i) => i + 1).join(", ")}`
      : "Would load normally — no pattern matches (blacklist mode).";
    resultEl.className = "test-result allowed";
  }

  renderGutter(lines, matchIndices);
  syncGutterScroll();
}

function showSavedHint() {
  const el = document.getElementById("saved-hint");
  el.classList.add("visible");
  if (savedHintTimer) {
    clearTimeout(savedHintTimer);
  }
  savedHintTimer = setTimeout(() => {
    el.classList.remove("visible");
  }, 1200);
}

function saveField(id, value) {
  let obj = {};
  obj[id] = value;
  return browser.storage.local
    .set(obj)
    .then(showSavedHint)
    .catch(console.error);
}

function onChange(evt) {
  const id = evt.target.id;
  let el = document.getElementById(id);

  let value = el.type === "checkbox" ? el.checked : el.value;
  if (typeof value === "string") {
    value = value.trim(); // strip whitespace
  }

  saveField(id, value);

  if (id === "mode") {
    updateModeHint();
    runUrlTest();
  }
  if (id === "matchers") {
    updatePatternStatus();
  }
}

function onTidy() {
  const textEl = document.getElementById("matchers");
  const seen = new Set();
  const cleaned = [];

  textEl.value.split("\n").forEach((raw) => {
    const trimmed = raw.trim();
    if (trimmed === "") return; // drop blank lines
    if (seen.has(trimmed)) return; // drop exact duplicates
    seen.add(trimmed);
    cleaned.push(trimmed);
  });

  textEl.value = cleaned.join("\n");
  saveField("matchers", textEl.value);
  updatePatternStatus();
}

async function onLoad() {
  const textEl = document.getElementById("matchers");
  const urlEl = document.getElementById("test-url");
  const tidyBtn = document.getElementById("tidy-btn");

  ["matchers", "mode"].forEach((id) => {
    browser.storage.local
      .get(id)
      .then((obj) => {
        let el = document.getElementById(id);
        let val = obj[id];

        if (typeof val !== "undefined") {
          if (el.type === "checkbox") {
            el.checked = val;
          } else {
            el.value = val;
          }
        }
        updateModeHint();
        updatePatternStatus();
      })
      .catch(console.error);

    let el = document.getElementById(id);
    el.addEventListener("click", onChange);
    el.addEventListener("input", onChange);
  });

  textEl.addEventListener("scroll", syncGutterScroll);
  urlEl.addEventListener("input", runUrlTest);
  tidyBtn.addEventListener("click", onTidy);
}

document.addEventListener("DOMContentLoaded", onLoad);

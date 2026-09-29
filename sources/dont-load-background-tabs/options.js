/*global browser */

let storage;
let savedTimer;

const $ = (id) => document.getElementById(id);

function findInvalidLines(text) {
  const invalid = [];
  text.split("\n").forEach((raw, i) => {
    const line = raw.trim();
    if (!line) {
      return;
    }
    try {
      new RegExp(line);
    } catch (error) {
      invalid.push({ line: i + 1, message: error.message });
    }
  });
  return invalid;
}

function countPatterns(text) {
  return text.split("\n").filter((l) => l.trim()).length;
}

function flashSaved() {
  const el = $("saved");
  el.classList.add("show");
  clearTimeout(savedTimer);
  savedTimer = setTimeout(() => el.classList.remove("show"), 1200);
}

function renderMatcherInfo() {
  const text = $("matchers").value;
  const n = countPatterns(text);
  $("count").textContent = n + (n === 1 ? " pattern" : " patterns");

  const invalid = findInvalidLines(text);
  $("matchers").classList.toggle("invalid", invalid.length > 0);
  $("validation").textContent = invalid.length
    ? "Line " +
      invalid[0].line +
      ": " +
      invalid[0].message +
      (invalid.length > 1 ? " (+" + (invalid.length - 1) + " more)" : "")
    : "";
}

function renderMode(blacklist) {
  $("mode-blacklist").checked = blacklist;
  $("mode-whitelist").checked = !blacklist;
  $("card-blacklist").classList.toggle("selected", blacklist);
  $("card-whitelist").classList.toggle("selected", !blacklist);
}

function renderStatus(paused) {
  const el = $("status");
  el.textContent = paused ? "Paused" : "Active";
  el.className = "status " + (paused ? "off" : "on");
  el.title = "Click the toolbar button to " + (paused ? "resume" : "pause");
}

async function onMatchersInput() {
  renderMatcherInfo();
  await storage.set("matchers", $("matchers").value.trim());
  flashSaved();
}

async function onModeChange() {
  const blacklist = $("mode-blacklist").checked;
  renderMode(blacklist);
  await storage.set("mode", blacklist);
  flashSaved();
}

async function onDismiss() {
  $("welcome").classList.remove("show");
  await storage.set("show_welcome", false);
}

async function onLoad() {
  // show the defaults immediately, so a selection is always visible
  renderMode(false);

  storage = await import("./storage.js");

  const matchers = await storage.get("string", "matchers", "");
  const blacklist = await storage.get("boolean", "mode", false);
  const paused = await storage.get("boolean", "manually_disabled", false);
  const welcome = await storage.get("boolean", "show_welcome", false);

  $("matchers").value = matchers;
  renderMode(blacklist);
  renderMatcherInfo();
  renderStatus(paused);
  if (welcome) {
    $("welcome").classList.add("show");
  }

  $("matchers").addEventListener("input", onMatchersInput);
  $("mode-blacklist").addEventListener("change", onModeChange);
  $("mode-whitelist").addEventListener("change", onModeChange);
  $("dismiss").addEventListener("click", onDismiss);

  // keep the status pill in sync with the toolbar button
  browser.storage.onChanged.addListener((changes) => {
    if (changes.manually_disabled) {
      renderStatus(changes.manually_disabled.newValue === true);
    }
  });
}

document.addEventListener("DOMContentLoaded", onLoad);

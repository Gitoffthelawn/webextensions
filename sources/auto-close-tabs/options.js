/* global browser */

const saveFolderEl = document.getElementById("saveFolder");
const closeThresholdEl = document.getElementById("closeThreshold");
const savebtn = document.getElementById("savebtn");
const statusEl = document.getElementById("status");
const closeRulesListEl = document.getElementById("closeRulesList");
const ignoreRulesListEl = document.getElementById("ignoreRulesList");

// Units offered for the idle-time input. Value = milliseconds per unit.
// Seconds is the smallest granularity offered — nothing below 1s.
const TIME_UNITS = [
  { ms: 1000, label: "seconds" },
  { ms: 60000, label: "minutes" },
  { ms: 3600000, label: "hours" },
];

// In-memory rule state. Each close rule: {value, unitMs, container, url}
// Each ignore rule: {container, url}
let closeRules = [];
let ignoreRules = [];
let isDirty = false;
let isLoading = true; // suppress dirty-marking while populating the form on load

const unsavedBannerEl = document.getElementById("unsavedBanner");

function markDirty() {
  if (isLoading) return;
  isDirty = true;
  unsavedBannerEl.classList.add("show");
  document.body.classList.add("has-unsaved-banner");
  savebtn.classList.add("dirty");
}

function markClean() {
  isDirty = false;
  unsavedBannerEl.classList.remove("show");
  document.body.classList.remove("has-unsaved-banner");
  savebtn.classList.remove("dirty");
}

window.addEventListener("beforeunload", (evt) => {
  if (!isDirty) return;
  evt.preventDefault();
  evt.returnValue = "";
  return "";
});

function regex101Url(regexStr) {
  const params = new URLSearchParams();
  if (regexStr) params.set("regex", regexStr);
  params.set("flavor", "javascript");
  return `https://regex101.com/?${params.toString()}`;
}

// --- bookmark folder select --------------------------------------------

function recGetFolders(node, depth = 0) {
  let out = new Map();
  if (typeof node.url !== "string") {
    if (node.id !== "root________") {
      out.set(node.id, { depth: depth, title: node.title });
    }
    if (node.children) {
      for (let child of node.children) {
        out = new Map([...out, ...recGetFolders(child, depth + 1)]);
      }
    }
  }
  return out;
}

async function initSaveFolderSelect() {
  const nodes = await browser.bookmarks.getTree();
  let out = new Map();
  let depth = 1;
  for (const node of nodes) {
    out = new Map([...out, ...recGetFolders(node, depth)]);
  }
  for (const [k, v] of out) {
    saveFolderEl.add(new Option("-".repeat(v.depth) + " " + v.title, k));
  }
}

// --- parsing legacy storage strings into rule rows ---------------------

function bestFitUnit(timeMs) {
  for (let i = TIME_UNITS.length - 1; i >= 0; i--) {
    if (timeMs % TIME_UNITS[i].ms === 0) return TIME_UNITS[i].ms;
  }
  // No exact unit division (e.g. a value saved in ms by an older version) —
  // fall back to the smallest available unit (seconds) and let the
  // resulting value be fractional rather than reintroducing an ms option.
  return TIME_UNITS[0].ms;
}

function parseCloseRulesStorage(leftStr, rightStr) {
  const left = leftStr.split("\n");
  const right = rightStr.split("\n");
  const rows = [];

  for (let i = 0; i < left.length && i < right.length; i++) {
    const l = left[i].trim();
    const r = right[i].trim();
    if (l === "" && r === "") continue;
    if (l.startsWith("#") || r.startsWith("#")) continue;

    const parts = l.split(",");
    if (parts.length < 2) continue;

    const timeMs = parseInt(parts[0].trim());
    if (isNaN(timeMs)) continue;
    const container = parts.slice(1).join(",").trim();

    const unitMs = bestFitUnit(timeMs);
    rows.push({
      value: Math.max(1, Math.round(timeMs / unitMs)),
      unitMs,
      container,
      url: r,
    });
  }
  return rows;
}

function parseIgnoreRulesStorage(leftStr, rightStr) {
  const left = leftStr.split("\n");
  const right = rightStr.split("\n");
  const rows = [];

  for (let i = 0; i < left.length && i < right.length; i++) {
    const l = left[i].trim();
    const r = right[i].trim();
    if (l === "" && r === "") continue;
    if (l.startsWith("#") || r.startsWith("#")) continue;

    rows.push({ container: l, url: r });
  }
  return rows;
}

function serializeCloseRules(rows) {
  return {
    left: rows
      .map((r) => `${Math.round(r.value * r.unitMs)},${r.container}`)
      .join("\n"),
    right: rows.map((r) => r.url).join("\n"),
  };
}

function serializeIgnoreRules(rows) {
  return {
    left: rows.map((r) => r.container).join("\n"),
    right: rows.map((r) => r.url).join("\n"),
  };
}

// --- regex validity helper ----------------------------------------------

function isValidRegexOrEmpty(str) {
  if (str === "") return true;
  try {
    new RegExp(str);
    return true;
  } catch (e) {
    return false;
  }
}

// --- rendering ------------------------------------------------------------

function containerPreset(container) {
  if (container === "") return "";
  if (container === ".*") return ".*";
  return "__custom__";
}

// --- safe DOM builders (no innerHTML / no HTML string parsing) -----------

function buildTimeUnitSelect(selectedMs) {
  const select = document.createElement("select");
  select.className = "rr-time-unit";
  TIME_UNITS.forEach((u) => {
    const opt = document.createElement("option");
    opt.value = String(u.ms);
    opt.textContent = u.label;
    if (u.ms === selectedMs) opt.selected = true;
    select.appendChild(opt);
  });
  return select;
}

function buildContainerPresetSelect(preset) {
  const select = document.createElement("select");
  select.className = "rr-container-preset";
  [
    ["", "No container"],
    [".*", "Any container"],
    ["__custom__", "Custom pattern…"],
  ].forEach(([value, label]) => {
    const opt = document.createElement("option");
    opt.value = value;
    opt.textContent = label;
    if (value === preset) opt.selected = true;
    select.appendChild(opt);
  });
  return select;
}

function buildContainerCustomInput(rule, isCustom, placeholder) {
  const input = document.createElement("input");
  input.type = "text";
  input.className = "rr-container-custom";
  input.placeholder = placeholder;
  input.value = isCustom ? rule.container : "";
  input.style.display = isCustom ? "inline-block" : "none";
  return input;
}

function buildRegexHelpLink(regexStr) {
  const a = document.createElement("a");
  a.className = "regex-help";
  a.href = regex101Url(regexStr);
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  a.textContent = "test on regex101 ↗";
  return a;
}

function buildUrlField(rule) {
  const wrapper = document.createElement("div");
  wrapper.className = "rule-field rule-field-grow";

  const label = document.createElement("label");
  label.appendChild(document.createTextNode("URL matches (required) "));
  label.appendChild(buildRegexHelpLink(rule.url));
  wrapper.appendChild(label);

  const input = document.createElement("input");
  input.type = "text";
  input.className = "rr-url";
  input.setAttribute("list", "urlRegexSuggestions");
  input.placeholder = "^https?:\\/\\/.*";
  input.value = rule.url;
  wrapper.appendChild(input);

  return wrapper;
}

function buildRemoveButton() {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "rule-remove";
  btn.title = "Remove rule";
  btn.textContent = "✕";
  return btn;
}

function renderCloseRules() {
  closeRulesListEl.replaceChildren();
  if (closeRules.length === 0) {
    const empty = document.createElement("div");
    empty.className = "rule-empty";
    empty.textContent =
      "No close rules yet — tabs will only close once you add one.";
    closeRulesListEl.appendChild(empty);
  }
  closeRules.forEach((rule, index) => {
    closeRulesListEl.appendChild(renderCloseRuleRow(rule, index));
  });
  validateAll();
}

function renderIgnoreRules() {
  ignoreRulesListEl.replaceChildren();
  if (ignoreRules.length === 0) {
    const empty = document.createElement("div");
    empty.className = "rule-empty";
    empty.textContent =
      "No ignore rules — nothing is exempted from close rules.";
    ignoreRulesListEl.appendChild(empty);
  }
  ignoreRules.forEach((rule, index) => {
    ignoreRulesListEl.appendChild(renderIgnoreRuleRow(rule, index));
  });
  validateAll();
}

function renderCloseRuleRow(rule, index) {
  const row = document.createElement("div");
  row.className = "rule-row";
  row.dataset.index = index;
  row.dataset.kind = "close";

  const fields = document.createElement("div");
  fields.className = "rule-row-fields";

  // idle time
  const timeField = document.createElement("div");
  timeField.className = "rule-field";
  const timeLabel = document.createElement("label");
  timeLabel.textContent = "Idle for";
  timeField.appendChild(timeLabel);

  const timeInputsWrap = document.createElement("div");
  timeInputsWrap.className = "time-inputs";
  const timeValueInput = document.createElement("input");
  timeValueInput.type = "number";
  timeValueInput.className = "rr-time-value";
  timeValueInput.min = "1";
  timeValueInput.step = "1";
  timeValueInput.value = rule.value;
  timeValueInput.style.width = "64px";
  timeInputsWrap.appendChild(timeValueInput);
  timeInputsWrap.appendChild(buildTimeUnitSelect(rule.unitMs));
  timeField.appendChild(timeInputsWrap);
  fields.appendChild(timeField);

  // container
  const preset = containerPreset(rule.container);
  const isCustom = preset === "__custom__";
  const containerField = document.createElement("div");
  containerField.className = "rule-field";
  const containerLabel = document.createElement("label");
  containerLabel.textContent = "Container";
  containerField.appendChild(containerLabel);

  const containerInputsWrap = document.createElement("div");
  containerInputsWrap.className = "container-inputs";
  containerInputsWrap.appendChild(buildContainerPresetSelect(preset));
  containerInputsWrap.appendChild(
    buildContainerCustomInput(rule, isCustom, "e.g. ^Tmp.*"),
  );
  containerField.appendChild(containerInputsWrap);
  fields.appendChild(containerField);

  // url
  fields.appendChild(buildUrlField(rule));

  row.appendChild(fields);
  row.appendChild(buildRemoveButton());

  const errEl = document.createElement("div");
  errEl.className = "rule-row-error";
  row.appendChild(errEl);

  return row;
}

function renderIgnoreRuleRow(rule, index) {
  const row = document.createElement("div");
  row.className = "rule-row";
  row.dataset.index = index;
  row.dataset.kind = "ignore";

  const fields = document.createElement("div");
  fields.className = "rule-row-fields";

  // container
  const preset = containerPreset(rule.container);
  const isCustom = preset === "__custom__";
  const containerField = document.createElement("div");
  containerField.className = "rule-field";
  const containerLabel = document.createElement("label");
  containerLabel.textContent = "Container";
  containerField.appendChild(containerLabel);

  const containerInputsWrap = document.createElement("div");
  containerInputsWrap.className = "container-inputs";
  containerInputsWrap.appendChild(buildContainerPresetSelect(preset));
  containerInputsWrap.appendChild(
    buildContainerCustomInput(rule, isCustom, "e.g. ^Personal$"),
  );
  containerField.appendChild(containerInputsWrap);
  fields.appendChild(containerField);

  // url
  fields.appendChild(buildUrlField(rule));

  row.appendChild(fields);
  row.appendChild(buildRemoveButton());

  const errEl = document.createElement("div");
  errEl.className = "rule-row-error";
  row.appendChild(errEl);

  return row;
}

// --- event delegation for rule rows ---------------------------------------

function getRuleArrayForList(listEl) {
  return listEl === closeRulesListEl ? closeRules : ignoreRules;
}

function attachListHandlers(listEl) {
  listEl.addEventListener("input", (evt) => {
    const row = evt.target.closest(".rule-row");
    if (!row) return;
    const rules = getRuleArrayForList(listEl);
    const rule = rules[Number(row.dataset.index)];
    if (!rule) return;

    if (evt.target.classList.contains("rr-time-value")) {
      rule.value = parseInt(evt.target.value, 10);
    } else if (evt.target.classList.contains("rr-container-custom")) {
      rule.container = evt.target.value;
    } else if (evt.target.classList.contains("rr-url")) {
      rule.url = evt.target.value;
      const helpLink = row.querySelector(".regex-help");
      if (helpLink) helpLink.href = regex101Url(rule.url);
    }
    markDirty();
    validateAll();
  });

  listEl.addEventListener("change", (evt) => {
    const row = evt.target.closest(".rule-row");
    if (!row) return;
    const rules = getRuleArrayForList(listEl);
    const rule = rules[Number(row.dataset.index)];
    if (!rule) return;

    if (evt.target.classList.contains("rr-time-unit")) {
      rule.unitMs = parseInt(evt.target.value);
      markDirty();
      validateAll();
    } else if (evt.target.classList.contains("rr-container-preset")) {
      const val = evt.target.value;
      const customInput = row.querySelector(".rr-container-custom");
      if (val === "__custom__") {
        customInput.style.display = "inline-block";
        customInput.focus();
        rule.container = customInput.value;
      } else {
        customInput.style.display = "none";
        rule.container = val;
      }
      markDirty();
      validateAll();
    }
  });

  listEl.addEventListener("click", (evt) => {
    if (!evt.target.classList.contains("rule-remove")) return;
    const row = evt.target.closest(".rule-row");
    if (!row) return;
    const index = Number(row.dataset.index);
    if (listEl === closeRulesListEl) {
      closeRules.splice(index, 1);
      renderCloseRules();
    } else {
      ignoreRules.splice(index, 1);
      renderIgnoreRules();
    }
    markDirty();
  });
}

// --- validation -------------------------------------------------------

function validateAll() {
  let allOk = true;

  document.querySelectorAll(".rule-row").forEach((row) => {
    const kind = row.dataset.kind;
    const rules = kind === "close" ? closeRules : ignoreRules;
    const rule = rules[Number(row.dataset.index)];
    const errEl = row.querySelector(".rule-row-error");
    const urlInput = row.querySelector(".rr-url");
    const containerCustomInput = row.querySelector(".rr-container-custom");
    const timeInput = row.querySelector(".rr-time-value");

    let msg = "";

    if (!rule.url || rule.url.trim() === "") {
      msg = "URL pattern is required.";
    } else if (!isValidRegexOrEmpty(rule.url)) {
      msg = "URL pattern is not a valid regular expression.";
    } else if (
      containerCustomInput &&
      containerCustomInput.style.display !== "none" &&
      !isValidRegexOrEmpty(rule.container)
    ) {
      msg = "Container pattern is not a valid regular expression.";
    } else if (
      kind === "close" &&
      (!Number.isInteger(rule.value) || rule.value < 1)
    ) {
      msg = "Idle time must be a whole number of at least 1.";
    }

    urlInput.classList.toggle(
      "invalid",
      !rule.url || !isValidRegexOrEmpty(rule.url),
    );
    if (containerCustomInput) {
      containerCustomInput.classList.toggle(
        "invalid",
        containerCustomInput.style.display !== "none" &&
          !isValidRegexOrEmpty(rule.container),
      );
    }
    if (timeInput) {
      timeInput.classList.toggle(
        "invalid",
        kind === "close" && (!Number.isInteger(rule.value) || rule.value < 1),
      );
    }

    errEl.textContent = msg;
    if (msg) allOk = false;
  });

  savebtn.disabled = !allOk;
  return allOk;
}

// --- add rule buttons -----------------------------------------------------

document.getElementById("addCloseRule").addEventListener("click", () => {
  closeRules.push({ value: 10, unitMs: 60000, container: "", url: "" });
  renderCloseRules();
  markDirty();
  const inputs = closeRulesListEl.querySelectorAll(".rr-url");
  inputs[inputs.length - 1].focus();
});

document.getElementById("addIgnoreRule").addEventListener("click", () => {
  ignoreRules.push({ container: "", url: "" });
  renderIgnoreRules();
  markDirty();
  const inputs = ignoreRulesListEl.querySelectorAll(".rr-url");
  inputs[inputs.length - 1].focus();
});

attachListHandlers(closeRulesListEl);
attachListHandlers(ignoreRulesListEl);

// --- closeThreshold / saveFolder (unchanged behavior, auto-save) ---------

function normalizeNumberField(el) {
  let value = el.value;
  try {
    value = parseInt(value);
    if (isNaN(value)) value = el.min;
    if (value < el.min) value = el.min;
  } catch (e) {
    value = el.min;
  }
  return value;
}

closeThresholdEl.addEventListener("change", () => {
  markDirty();
});

saveFolderEl.addEventListener("change", () => {
  markDirty();
});

// --- save / status ----------------------------------------------------

let statusTimeout = null;
function flashStatus(text, isError) {
  statusEl.textContent = text;
  statusEl.style.color = isError ? "var(--danger)" : "var(--ok)";
  statusEl.classList.add("show");
  clearTimeout(statusTimeout);
  statusTimeout = setTimeout(() => {
    statusEl.classList.remove("show");
  }, 1800);
}

async function saveAll() {
  if (!validateAll()) {
    flashStatus("Fix the highlighted rules before saving", true);
    return;
  }

  const closeSerialized = serializeCloseRules(closeRules);
  const ignoreSerialized = serializeIgnoreRules(ignoreRules);

  await browser.storage.local.set({
    closeThreshold: normalizeNumberField(closeThresholdEl),
    saveFolder: saveFolderEl.value,
    intervalrules_time_ms_and_container_regex: closeSerialized.left,
    intervalrules_url_regex: closeSerialized.right,
    ignorerules_container_regex: ignoreSerialized.left,
    ignorerules_url_regex: ignoreSerialized.right,
  });

  browser.runtime.sendMessage({ cmd: "storageChanged" });
  markClean();
  flashStatus("Saved", false);
}

savebtn.addEventListener("click", saveAll);

// --- suggestions from currently open tabs ---------------------------------

// Builds a simple "any page on this domain" regex per unique hostname
// among currently open tabs, and appends them to the URL datalist so they
// show up in the browser's native autocomplete alongside the static ones.
async function loadOpenTabSuggestions() {
  const datalist = document.getElementById("urlRegexSuggestions");
  if (!datalist) return;

  let tabs = [];
  try {
    tabs = await browser.tabs.query({});
  } catch (e) {
    console.error(e);
    return;
  }

  const hostnames = new Set();
  for (const t of tabs) {
    if (!t.url) continue;
    let u;
    try {
      u = new URL(t.url);
    } catch (e) {
      continue;
    }
    if (u.protocol !== "http:" && u.protocol !== "https:") continue;
    const host = u.hostname.startsWith("www.")
      ? u.hostname.slice(4)
      : u.hostname;
    hostnames.add(host);
  }

  [...hostnames].sort().forEach((host) => {
    const escaped = host.replace(/\./g, "\\.");
    const opt = document.createElement("option");
    opt.value = `^https?:\\/\\/(www\\.)?${escaped}\\/.*`;
    opt.textContent = `open tab: ${host}`;
    datalist.appendChild(opt);
  });
}

// --- load ---------------------------------------------------------------

async function onLoad() {
  try {
    await initSaveFolderSelect();
  } catch (e) {
    console.error(e);
  }

  loadOpenTabSuggestions();

  try {
    const obj = await browser.storage.local.get([
      "closeThreshold",
      "saveFolder",
      "intervalrules_time_ms_and_container_regex",
      "intervalrules_url_regex",
      "ignorerules_container_regex",
      "ignorerules_url_regex",
    ]);

    if (typeof obj.closeThreshold !== "undefined") {
      closeThresholdEl.value = obj.closeThreshold;
    }
    if (typeof obj.saveFolder !== "undefined") {
      saveFolderEl.value = obj.saveFolder;
    }

    closeRules = parseCloseRulesStorage(
      obj.intervalrules_time_ms_and_container_regex || "",
      obj.intervalrules_url_regex || "",
    );
    ignoreRules = parseIgnoreRulesStorage(
      obj.ignorerules_container_regex || "",
      obj.ignorerules_url_regex || "",
    );
  } catch (e) {
    console.error(e);
  }

  renderCloseRules();
  renderIgnoreRules();
  isLoading = false;
}

document.addEventListener("DOMContentLoaded", onLoad);

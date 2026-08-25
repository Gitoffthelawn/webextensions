/* global browser */

const saveFolderEl = document.getElementById("saveFolder");
const closeThresholdEl = document.getElementById("closeThreshold");
const savebtn = document.getElementById("savebtn");
const resetbtn = document.getElementById("resetbtn");
const statusEl = document.getElementById("status");
const closeRulesListEl = document.getElementById("closeRulesList");
const ignoreRulesListEl = document.getElementById("ignoreRulesList");
const closeRulesSection = document.getElementById("closeRulesSection");
const ignoreRulesSection = document.getElementById("ignoreRulesSection");
const closeRulesToggle = document.getElementById("closeRulesToggle");
const ignoreRulesToggle = document.getElementById("ignoreRulesToggle");
const closeRulesCountEl = document.getElementById("closeRulesCount");
const ignoreRulesCountEl = document.getElementById("ignoreRulesCount");
const statusPillEl = document.getElementById("statusPill");
const toggleAutostartBtn = document.getElementById("toggleAutostart");
const exportBtn = document.getElementById("exportBtn");
const importBtn = document.getElementById("importBtn");
const importFileEl = document.getElementById("importFile");
const importExportMsgEl = document.getElementById("importExportMsg");

// Full URLs of currently open tabs, used for the "matches N open tabs"
// live hint next to each URL regex field. Populated by loadOpenTabSuggestions.
let openTabUrls = [];

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
const bannerResetBtn = document.getElementById("bannerResetBtn");

function markDirty() {
  if (isLoading) return;
  isDirty = true;
  unsavedBannerEl.classList.add("show");
  document.body.classList.add("has-unsaved-banner");
  savebtn.classList.add("dirty");
  resetbtn.disabled = false;
}

function markClean() {
  isDirty = false;
  unsavedBannerEl.classList.remove("show");
  document.body.classList.remove("has-unsaved-banner");
  savebtn.classList.remove("dirty");
  resetbtn.disabled = true;
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

// --- autostart status pill / toggle --------------------------------------
// Mirrors clicking the toolbar button — reads/writes storage directly and
// notifies background.js, without going through the Save button (this is
// an instant action, same as the toolbar icon, not a pending edit).

async function refreshAutostartStatus() {
  let autostart = false;
  try {
    const obj = await browser.storage.local.get("autostart");
    autostart = obj.autostart === true;
  } catch (e) {
    console.error(e);
  }
  statusPillEl.textContent = autostart
    ? "Auto-close is ON"
    : "Auto-close is OFF";
  statusPillEl.classList.toggle("on", autostart);
  statusPillEl.classList.toggle("off", !autostart);
  return autostart;
}

toggleAutostartBtn.addEventListener("click", async () => {
  toggleAutostartBtn.disabled = true;
  try {
    const current = await refreshAutostartStatus();
    await browser.storage.local.set({ autostart: !current });
    browser.runtime.sendMessage({ cmd: "storageChanged" });
    await refreshAutostartStatus();
  } catch (e) {
    console.error(e);
  } finally {
    toggleAutostartBtn.disabled = false;
  }
});

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
    left: rows.map((r) => `${Math.round(r.value * r.unitMs)},${r.container}`).join("\n"),
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

// --- collapsible rule sections ---------------------------------------

function setSectionExpanded(section, toggleEl, expanded) {
  section.classList.toggle("expanded", expanded);
  toggleEl.setAttribute("aria-expanded", String(expanded));
}

function toggleSection(section, toggleEl, otherSection, otherToggleEl) {
  const willExpand = !section.classList.contains("expanded");
  setSectionExpanded(section, toggleEl, willExpand);
  // only one section open at a time, to keep the page short
  if (willExpand) setSectionExpanded(otherSection, otherToggleEl, false);
}

function sectionHasErrors(section) {
  return [...section.querySelectorAll(".rule-row-error")].some(
    (el) => el.textContent.trim() !== "",
  );
}

closeRulesToggle.addEventListener("click", () =>
  toggleSection(
    closeRulesSection,
    closeRulesToggle,
    ignoreRulesSection,
    ignoreRulesToggle,
  ),
);
ignoreRulesToggle.addEventListener("click", () =>
  toggleSection(
    ignoreRulesSection,
    ignoreRulesToggle,
    closeRulesSection,
    closeRulesToggle,
  ),
);

[closeRulesToggle, ignoreRulesToggle].forEach((el) => {
  el.addEventListener("keydown", (evt) => {
    if (evt.key === "Enter" || evt.key === " ") {
      evt.preventDefault();
      el.click();
    }
  });
});

function updateRuleCountBadges() {
  closeRulesCountEl.textContent = `${closeRules.length} rule${closeRules.length === 1 ? "" : "s"}`;
  ignoreRulesCountEl.textContent = `${ignoreRules.length} rule${ignoreRules.length === 1 ? "" : "s"}`;
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

  const matchHint = document.createElement("div");
  matchHint.className = "rule-url-match-hint";
  wrapper.appendChild(matchHint);

  return wrapper;
}

// Updates the "matches N open tabs" hint for a rule row's URL field.
function updateMatchHint(row, urlStr) {
  const hintEl = row.querySelector(".rule-url-match-hint");
  if (!hintEl) return;

  if (!urlStr || !isValidRegexOrEmpty(urlStr)) {
    hintEl.textContent = "";
    return;
  }
  if (openTabUrls.length === 0) {
    hintEl.textContent = "";
    return;
  }

  let re;
  try {
    re = new RegExp(urlStr);
  } catch (e) {
    hintEl.textContent = "";
    return;
  }

  const count = openTabUrls.filter((u) => re.test(u)).length;
  hintEl.textContent =
    count === 0
      ? "Matches none of your open tabs"
      : `Matches ${count} of your ${openTabUrls.length} open tab${openTabUrls.length === 1 ? "" : "s"}`;
}

function refreshAllMatchHints() {
  document.querySelectorAll(".rule-row").forEach((row) => {
    const kind = row.dataset.kind;
    const rules = kind === "close" ? closeRules : ignoreRules;
    const rule = rules[Number(row.dataset.index)];
    if (rule) updateMatchHint(row, rule.url);
  });
}

function buildRuleActions(index, total) {
  const wrap = document.createElement("div");
  wrap.className = "rule-actions";

  const up = document.createElement("button");
  up.type = "button";
  up.className = "rule-move-up";
  up.title = "Move rule up";
  up.textContent = "↑";
  up.disabled = index === 0;
  wrap.appendChild(up);

  const down = document.createElement("button");
  down.type = "button";
  down.className = "rule-move-down";
  down.title = "Move rule down";
  down.textContent = "↓";
  down.disabled = index === total - 1;
  wrap.appendChild(down);

  const dup = document.createElement("button");
  dup.type = "button";
  dup.className = "rule-duplicate";
  dup.title = "Duplicate rule";
  dup.textContent = "⧉";
  wrap.appendChild(dup);

  const remove = document.createElement("button");
  remove.type = "button";
  remove.className = "rule-remove";
  remove.title = "Remove rule";
  remove.textContent = "✕";
  wrap.appendChild(remove);

  return wrap;
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
  updateRuleCountBadges();
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
  updateRuleCountBadges();
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
  row.appendChild(buildRuleActions(index, closeRules.length));

  const errEl = document.createElement("div");
  errEl.className = "rule-row-error";
  row.appendChild(errEl);

  updateMatchHint(row, rule.url);

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
  row.appendChild(buildRuleActions(index, ignoreRules.length));

  const errEl = document.createElement("div");
  errEl.className = "rule-row-error";
  row.appendChild(errEl);

  updateMatchHint(row, rule.url);

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
      updateMatchHint(row, rule.url);
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
    const row = evt.target.closest(".rule-row");
    if (!row) return;
    const index = Number(row.dataset.index);
    const rules = getRuleArrayForList(listEl);
    const rerender =
      listEl === closeRulesListEl ? renderCloseRules : renderIgnoreRules;

    if (evt.target.classList.contains("rule-remove")) {
      if (!window.confirm("Remove this rule?")) return;
      rules.splice(index, 1);
      rerender();
      markDirty();
    } else if (evt.target.classList.contains("rule-duplicate")) {
      rules.splice(index + 1, 0, structuredClone(rules[index]));
      rerender();
      markDirty();
    } else if (evt.target.classList.contains("rule-move-up")) {
      if (index === 0) return;
      [rules[index - 1], rules[index]] = [rules[index], rules[index - 1]];
      rerender();
      markDirty();
    } else if (evt.target.classList.contains("rule-move-down")) {
      if (index === rules.length - 1) return;
      [rules[index + 1], rules[index]] = [rules[index], rules[index + 1]];
      rerender();
      markDirty();
    }
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
    } else if (kind === "close" && (!Number.isInteger(rule.value) || rule.value < 1)) {
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

// --- discard-changes snapshot -------------------------------------------
// Captures the last known persisted state (on load, and again after every
// successful save) so "Discard changes" can restore it without a reload.

let lastSavedState = null;

function snapshotSavedState() {
  lastSavedState = {
    closeThreshold: normalizeNumberField(closeThresholdEl),
    saveFolder: saveFolderEl.value,
    closeRules: structuredClone(closeRules),
    ignoreRules: structuredClone(ignoreRules),
  };
}

resetbtn.addEventListener("click", () => {
  if (!lastSavedState) return;
  if (isDirty && !window.confirm("Discard all unsaved changes?")) return;

  closeThresholdEl.value = lastSavedState.closeThreshold;
  saveFolderEl.value = lastSavedState.saveFolder;
  closeRules = structuredClone(lastSavedState.closeRules);
  ignoreRules = structuredClone(lastSavedState.ignoreRules);

  renderCloseRules();
  renderIgnoreRules();
  markClean();
  flashStatus("Changes discarded", false);
});

bannerResetBtn.addEventListener("click", () => resetbtn.click());

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
    if (sectionHasErrors(closeRulesSection)) {
      setSectionExpanded(closeRulesSection, closeRulesToggle, true);
    }
    if (sectionHasErrors(ignoreRulesSection)) {
      setSectionExpanded(ignoreRulesSection, ignoreRulesToggle, true);
    }
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
  snapshotSavedState();
  flashStatus("Saved", false);
}

savebtn.addEventListener("click", saveAll);

// --- import / export config as JSON ---------------------------------------

const CONFIG_FORMAT_VERSION = 1;

function buildExportObject() {
  return {
    version: CONFIG_FORMAT_VERSION,
    closeThreshold: normalizeNumberField(closeThresholdEl),
    saveFolder: saveFolderEl.value,
    closeRules: closeRules.map((r) => ({
      value: r.value,
      unitMs: r.unitMs,
      container: r.container,
      url: r.url,
    })),
    ignoreRules: ignoreRules.map((r) => ({
      container: r.container,
      url: r.url,
    })),
  };
}

function flashImportExportMsg(text, isError) {
  importExportMsgEl.textContent = text;
  importExportMsgEl.classList.toggle("error", !!isError);
}

exportBtn.addEventListener("click", () => {
  const json = JSON.stringify(buildExportObject(), null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "auto-close-tabs-config.json";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  flashImportExportMsg("Config exported.", false);
});

importBtn.addEventListener("click", () => {
  importFileEl.click();
});

importFileEl.addEventListener("change", async () => {
  const file = importFileEl.files && importFileEl.files[0];
  importFileEl.value = ""; // allow re-selecting the same file later
  if (!file) return;

  let data;
  try {
    const text = await file.text();
    data = JSON.parse(text);
  } catch (e) {
    flashImportExportMsg("That file isn't valid JSON.", true);
    return;
  }

  if (
    typeof data !== "object" ||
    data === null ||
    !Array.isArray(data.closeRules) ||
    !Array.isArray(data.ignoreRules)
  ) {
    flashImportExportMsg("That file doesn't look like a valid config.", true);
    return;
  }

  const validUnit = (ms) => TIME_UNITS.some((u) => u.ms === ms);

  closeRules = data.closeRules
    .filter((r) => r && typeof r.url === "string")
    .map((r) => ({
      value:
        Number.isInteger(r.value) && r.value >= 1 ? r.value : 10,
      unitMs: validUnit(r.unitMs) ? r.unitMs : 60000,
      container: typeof r.container === "string" ? r.container : "",
      url: r.url,
    }));

  ignoreRules = data.ignoreRules
    .filter((r) => r && typeof r.url === "string")
    .map((r) => ({
      container: typeof r.container === "string" ? r.container : "",
      url: r.url,
    }));

  if (typeof data.closeThreshold === "number") {
    closeThresholdEl.value = Math.max(0, Math.round(data.closeThreshold));
  }
  if (typeof data.saveFolder === "string") {
    // only apply if it's a real option in the select (bookmark folder ids
    // are user/profile-specific and may not exist here)
    const hasOption = [...saveFolderEl.options].some(
      (o) => o.value === data.saveFolder,
    );
    if (hasOption) saveFolderEl.value = data.saveFolder;
  }

  renderCloseRules();
  renderIgnoreRules();
  setSectionExpanded(closeRulesSection, closeRulesToggle, true);
  setSectionExpanded(ignoreRulesSection, ignoreRulesToggle, true);
  markDirty();
  flashImportExportMsg(
    "Config imported — review and click Save changes to apply.",
    false,
  );
});

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
  const urls = [];
  for (const t of tabs) {
    if (!t.url) continue;
    let u;
    try {
      u = new URL(t.url);
    } catch (e) {
      continue;
    }
    if (u.protocol !== "http:" && u.protocol !== "https:") continue;
    urls.push(t.url);
    const host = u.hostname.startsWith("www.")
      ? u.hostname.slice(4)
      : u.hostname;
    hostnames.add(host);
  }
  openTabUrls = urls;

  [...hostnames]
    .sort()
    .forEach((host) => {
      const escaped = host.replace(/\./g, "\\.");
      const opt = document.createElement("option");
      opt.value = `^https?:\\/\\/(www\\.)?${escaped}\\/.*`;
      opt.textContent = `open tab: ${host}`;
      datalist.appendChild(opt);
    });

  refreshAllMatchHints();
}

// --- load ---------------------------------------------------------------

async function onLoad() {
  refreshAutostartStatus();

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
  snapshotSavedState();
}

document.addEventListener("DOMContentLoaded", onLoad);

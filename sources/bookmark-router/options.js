/* global browser */

let bookmarkFolders = new Map();
let statusTimerId;

const mainForm = document.getElementById("mainForm");
const mainTableBody = document.getElementById("mainTableBody");
const statusEl = document.getElementById("status");
const testUrlInput = document.getElementById("testurl");
const notificationsEl = document.getElementById("notifications");

/* ---------- status toast ---------- */

function showStatus(message, isError = false) {
  clearTimeout(statusTimerId);
  statusEl.textContent = message;
  statusEl.classList.toggle("error", isError);
  statusEl.classList.remove("hidden");
  statusTimerId = setTimeout(() => {
    statusEl.classList.add("hidden");
  }, 2500);
}

/* ---------- regex helper ---------- */

function tryCompileRegex(pattern) {
  try {
    return { valid: true, re: new RegExp(pattern) };
  } catch (e) {
    return { valid: false, error: e.message };
  }
}

/* ---------- table rendering ---------- */

function buildFolderSelect(selectedId) {
  const select = document.createElement("select");
  select.className = "bookmarkId";

  if (bookmarkFolders.size === 0) {
    select.add(new Option("(no folders found)", "", true, true));
    select.disabled = true;
    return select;
  }

  for (const [id, info] of bookmarkFolders) {
    select.add(new Option(">".repeat(info.depth) + " " + info.title, id));
  }
  if (selectedId && bookmarkFolders.has(selectedId)) {
    select.value = selectedId;
  }
  return select;
}

function buildRow(selector) {
  const tr = mainTableBody.insertRow();

  // Enabled
  const activInput = document.createElement("input");
  activInput.type = "checkbox";
  activInput.className = "activ";
  activInput.checked =
    typeof selector.activ === "boolean" ? selector.activ : true;
  activInput.addEventListener("change", () => {
    updateTestMatches();
    persistTable();
  });
  tr.insertCell().appendChild(activInput);

  // Bookmark folder
  const folderSelect = buildFolderSelect(selector.bookmarkId);
  folderSelect.addEventListener("change", () => {
    updateTestMatches();
    persistTable();
  });
  const folderCell = tr.insertCell();
  folderCell.appendChild(folderSelect);
  const badge = document.createElement("span");
  badge.className = "match-badge";
  badge.style.display = "none";
  badge.textContent = "Wins";
  folderCell.appendChild(badge);

  // URL regex
  const regexInput = document.createElement("input");
  regexInput.type = "text";
  regexInput.className = "url_regex";
  regexInput.placeholder = "e.g. ^https://github\\.com/";
  regexInput.value = selector.url_regex || "";
  regexInput.addEventListener("input", () => {
    validateRegexInput(regexInput);
    updateTestMatches();
  });
  regexInput.addEventListener("change", persistTable);
  validateRegexInput(regexInput);
  tr.insertCell().appendChild(regexInput);

  // Actions
  const actionsCell = tr.insertCell();
  actionsCell.className = "row-actions";
  const delBtn = document.createElement("button");
  delBtn.type = "button";
  delBtn.className = "danger icon";
  delBtn.textContent = "\u2715";
  delBtn.title = "Delete rule";
  delBtn.addEventListener("click", () => {
    tr.remove();
    if (mainTableBody.rows.length === 0) {
      renderEmptyState();
    }
    persistTable();
  });
  actionsCell.appendChild(delBtn);

  return tr;
}

function renderEmptyState() {
  const tr = mainTableBody.insertRow();
  tr.className = "empty-row";
  const td = document.createElement("td");
  td.colSpan = 4;
  td.textContent = "No rules yet — click \u201c+ New Rule\u201d to add one.";
  tr.appendChild(td);
}

function renderTable(selectors) {
  mainTableBody.innerHTML = "";
  if (selectors.length === 0) {
    renderEmptyState();
  } else {
    for (const selector of selectors) {
      buildRow(selector);
    }
  }
  updateTestMatches();
}

function validateRegexInput(input) {
  const pattern = input.value.trim();
  if (pattern === "") {
    input.classList.remove("invalid");
    input.title = "";
    return true;
  }
  const result = tryCompileRegex(pattern);
  input.classList.toggle("invalid", !result.valid);
  input.title = result.valid
    ? ""
    : "Invalid regular expression: " + result.error;
  return result.valid;
}

/* ---------- collecting / persisting rules ---------- */

function dataRows() {
  return Array.from(mainTableBody.rows).filter(
    (row) => !row.classList.contains("empty-row"),
  );
}

function collectConfig() {
  const feeds = [];
  let hasInvalid = false;

  for (const row of dataRows()) {
    const url_regex = row.querySelector(".url_regex").value.trim();
    const bookmarkId = row.querySelector(".bookmarkId").value || "";
    const activ = row.querySelector(".activ").checked;

    if (url_regex === "" && bookmarkId === "") {
      continue;
    }
    if (!validateRegexInput(row.querySelector(".url_regex"))) {
      hasInvalid = true;
      continue;
    }
    if (url_regex === "" || bookmarkId === "") {
      // incomplete row - skip silently, nothing to route on
      continue;
    }

    feeds.push({ activ, url_regex, bookmarkId });
  }

  return { feeds, hasInvalid };
}

async function persistTable() {
  const { feeds, hasInvalid } = collectConfig();
  await browser.storage.local.set({ selectors: feeds });
  if (hasInvalid) {
    showStatus("Saved (some rows had invalid regex and were skipped)", true);
  } else {
    showStatus("Saved");
  }
  return feeds;
}

async function onSaveSubmit(e) {
  e.preventDefault();
  await persistTable();
}

/* ---------- test-URL live preview ---------- */

function updateTestMatches() {
  const url = testUrlInput.value.trim();
  let firstMatchFound = false;

  for (const row of dataRows()) {
    const badge = row.querySelector(".match-badge");
    row.classList.remove("match", "match-first");
    badge.style.display = "none";

    if (url === "") {
      continue;
    }

    const activ = row.querySelector(".activ").checked;
    const pattern = row.querySelector(".url_regex").value.trim();
    if (!activ || pattern === "") {
      continue;
    }

    const result = tryCompileRegex(pattern);
    if (!result.valid || !result.re.test(url)) {
      continue;
    }

    row.classList.add("match");
    if (!firstMatchFound) {
      row.classList.add("match-first");
      badge.style.display = "";
      firstMatchFound = true;
    }
  }
}

/* ---------- import / export ---------- */

const impbtnWrp = document.getElementById("impbtn_wrapper");
const impbtn = document.getElementById("impbtn");
const expbtn = document.getElementById("expbtn");
const syncSetbtn = document.getElementById("syncsetbtn");
const syncGetbtn = document.getElementById("syncgetbtn");

impbtnWrp.addEventListener("click", () => impbtn.click());

impbtn.addEventListener("input", function () {
  const file = this.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async function () {
    try {
      const config = JSON.parse(reader.result);
      if (!Array.isArray(config)) {
        throw new Error("expected a JSON array of rules");
      }
      await browser.storage.local.set({ selectors: config });
      renderTable(config);
      showStatus("Imported " + config.length + " rule(s)");
    } catch (e) {
      console.error("error loading file:", e);
      showStatus("Import failed: " + e.message, true);
    } finally {
      impbtn.value = "";
    }
  };
  reader.readAsText(file);
});

expbtn.addEventListener("click", async () => {
  const res = await browser.storage.local.get("selectors");
  const content = JSON.stringify(res.selectors || [], null, 4);
  const dl = document.createElement("a");
  dl.href =
    "data:application/json;charset=utf-8," + encodeURIComponent(content);
  dl.download = "bookmark-router-rules.json";
  document.body.appendChild(dl);
  dl.click();
  dl.remove();
});

syncGetbtn.addEventListener("click", async () => {
  const result = await browser.storage.sync.get("selectors");
  if (Array.isArray(result.selectors)) {
    await browser.storage.local.set({ selectors: result.selectors });
    renderTable(result.selectors);
    showStatus("Restored " + result.selectors.length + " rule(s) from Sync");
  } else {
    showStatus("No rules found in Firefox Sync", true);
  }
});

syncSetbtn.addEventListener("click", async () => {
  if (
    !confirm(
      "This will overwrite your Firefox Sync backup with your current local rules. Continue?",
    )
  ) {
    return;
  }
  const result = await browser.storage.local.get("selectors");
  await browser.storage.sync.set({ selectors: result.selectors || [] });
  showStatus("Backed up to Firefox Sync");
});

/* ---------- notifications checkbox ---------- */

notificationsEl.addEventListener("change", () => {
  browser.storage.local
    .set({ notifications: notificationsEl.checked })
    .catch(console.error);
});

/* ---------- guided rule wizard ---------- */

const newRuleBtn = document.getElementById("newRuleBtn");
const wizardOverlay = document.getElementById("wizardOverlay");
const wizardCloseBtn = document.getElementById("wizardClose");
const wizardBackBtn = document.getElementById("wizardBack");
const wizardNextBtn = document.getElementById("wizardNext");
const wizardFinishBtn = document.getElementById("wizardFinish");
const wizardFolderEl = document.getElementById("wizardFolder");
const wizardFolderHint = document.getElementById("wizardFolderHint");
const wizardRegexEl = document.getElementById("wizardRegex");
const wizardRegexHint = document.getElementById("wizardRegexHint");
const wizardTestUrlEl = document.getElementById("wizardTestUrl");
const wizardTestHint = document.getElementById("wizardTestHint");
const wizardActivEl = document.getElementById("wizardActiv");
const summaryFolderEl = document.getElementById("summaryFolder");
const summaryRegexEl = document.getElementById("summaryRegex");

const WIZARD_STEP_COUNT = 3;
let wizardStep = 1;

function setHint(el, message, kind) {
  el.textContent = message;
  el.className = kind ? "hint " + kind : "hint";
}

function openWizard() {
  if (bookmarkFolders.size === 0) {
    showStatus(
      "No bookmark folders found - create one in your bookmarks first",
      true,
    );
    return;
  }

  wizardFolderEl.innerHTML = "";
  for (const [id, info] of bookmarkFolders) {
    wizardFolderEl.add(
      new Option(">".repeat(info.depth) + " " + info.title, id),
    );
  }
  setHint(wizardFolderHint, "");
  wizardRegexEl.value = "";
  wizardRegexEl.classList.remove("invalid");
  setHint(wizardRegexHint, "");
  wizardTestUrlEl.value = "";
  setHint(wizardTestHint, "");
  wizardActivEl.checked = true;

  goToWizardStep(1);
  wizardOverlay.classList.remove("hidden");
  wizardFolderEl.focus();
}

function closeWizard() {
  wizardOverlay.classList.add("hidden");
}

function goToWizardStep(step) {
  wizardStep = step;

  document.querySelectorAll(".wizard-step").forEach((el) => {
    el.hidden = Number(el.dataset.step) !== step;
  });
  document.querySelectorAll(".step-dot").forEach((dot) => {
    const n = Number(dot.dataset.step);
    dot.classList.toggle("active", n === step);
    dot.classList.toggle("done", n < step);
  });

  wizardBackBtn.disabled = step === 1;
  wizardNextBtn.hidden = step === WIZARD_STEP_COUNT;
  wizardFinishBtn.hidden = step !== WIZARD_STEP_COUNT;

  if (step === WIZARD_STEP_COUNT) {
    const selectedOption = wizardFolderEl.selectedOptions[0];
    summaryFolderEl.textContent = selectedOption
      ? selectedOption.textContent.trim()
      : "";
    summaryRegexEl.textContent = wizardRegexEl.value.trim();
  }
}

function validateWizardStep(step) {
  if (step === 1) {
    if (!wizardFolderEl.value) {
      setHint(wizardFolderHint, "Choose a destination folder", "error");
      return false;
    }
    setHint(wizardFolderHint, "");
    return true;
  }
  if (step === 2) {
    const pattern = wizardRegexEl.value.trim();
    if (pattern === "") {
      wizardRegexEl.classList.add("invalid");
      setHint(
        wizardRegexHint,
        "Enter a URL pattern (regular expression)",
        "error",
      );
      return false;
    }
    const result = tryCompileRegex(pattern);
    wizardRegexEl.classList.toggle("invalid", !result.valid);
    if (!result.valid) {
      setHint(
        wizardRegexHint,
        "Invalid regular expression: " + result.error,
        "error",
      );
      return false;
    }
    setHint(wizardRegexHint, "");
    return true;
  }
  return true;
}

function updateWizardTestHint() {
  const url = wizardTestUrlEl.value.trim();
  const pattern = wizardRegexEl.value.trim();
  if (url === "" || pattern === "") {
    setHint(wizardTestHint, "");
    return;
  }
  const result = tryCompileRegex(pattern);
  if (!result.valid) {
    setHint(wizardTestHint, "");
    return;
  }
  if (result.re.test(url)) {
    setHint(wizardTestHint, "\u2713 Matches this URL", "success");
  } else {
    setHint(wizardTestHint, "\u2717 Does not match this URL", "error");
  }
}

newRuleBtn.addEventListener("click", openWizard);
wizardCloseBtn.addEventListener("click", closeWizard);
wizardOverlay.addEventListener("click", (e) => {
  if (e.target === wizardOverlay) closeWizard();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !wizardOverlay.classList.contains("hidden")) {
    closeWizard();
  }
});

wizardFolderEl.addEventListener("change", () => setHint(wizardFolderHint, ""));

wizardRegexEl.addEventListener("input", () => {
  const pattern = wizardRegexEl.value.trim();
  if (pattern === "") {
    wizardRegexEl.classList.remove("invalid");
    setHint(wizardRegexHint, "");
  } else {
    const result = tryCompileRegex(pattern);
    wizardRegexEl.classList.toggle("invalid", !result.valid);
    setHint(
      wizardRegexHint,
      result.valid ? "" : "Invalid regular expression: " + result.error,
      result.valid ? "" : "error",
    );
  }
  updateWizardTestHint();
});

wizardTestUrlEl.addEventListener("input", updateWizardTestHint);

wizardBackBtn.addEventListener("click", () => {
  if (wizardStep > 1) goToWizardStep(wizardStep - 1);
});

wizardNextBtn.addEventListener("click", () => {
  if (validateWizardStep(wizardStep)) {
    goToWizardStep(wizardStep + 1);
  }
});

wizardFinishBtn.addEventListener("click", async () => {
  if (!validateWizardStep(1) || !validateWizardStep(2)) {
    return;
  }
  const newRule = {
    activ: wizardActivEl.checked,
    url_regex: wizardRegexEl.value.trim(),
    bookmarkId: wizardFolderEl.value,
  };
  const res = await browser.storage.local.get("selectors");
  const selectors = Array.isArray(res.selectors) ? res.selectors : [];
  selectors.push(newRule);
  await browser.storage.local.set({ selectors });
  renderTable(selectors);
  closeWizard();
  showStatus("Rule added");
});

/* ---------- init ---------- */

async function restoreOptions() {
  bookmarkFolders = (await browser.runtime.sendMessage({})) || new Map();

  const [{ selectors }, { notifications }] = await Promise.all([
    browser.storage.local.get("selectors"),
    browser.storage.local.get("notifications"),
  ]);

  notificationsEl.checked =
    typeof notifications === "boolean" ? notifications : true;
  renderTable(Array.isArray(selectors) ? selectors : []);
}

document.addEventListener("DOMContentLoaded", restoreOptions);
mainForm.addEventListener("submit", onSaveSubmit);
testUrlInput.addEventListener("input", updateTestMatches);

const extId = "AC";
const temporary = browser.runtime.id.endsWith("@temporary-addon");

const log = (level, msg) => {
  level = level.trim().toLowerCase();
  if (
    ["error", "warn"].includes(level) ||
    (temporary && ["debug", "info", "log"].includes(level))
  ) {
    console[level]("[" + extId + "] [" + level.toUpperCase() + "] " + msg);
    return;
  }
};

let table = null;
let unsavedChanges = false;

// button refs
const impbtnWrp = document.getElementById("impbtn_wrapper");
const impbtn = document.getElementById("impbtn");
const savbtn = document.getElementById("savbtn");
const discbtn = document.getElementById("discbtn");
const expbtn = document.getElementById("expbtn");
const delbtn = document.getElementById("delbtn");
const ablebtn = document.getElementById("ablebtn");
const addbtn = document.getElementById("addbtn");
const dupbtn = document.getElementById("dupbtn");
const tgladv = document.getElementById("tgladv");
const toastcontainer = document.getElementById("toastcontainer");
const statuscount = document.getElementById("statuscount");
const statusselected = document.getElementById("statusselected");
const statusdirty = document.getElementById("statusdirty");

/* ---------------------------- toast helper ---------------------------- */

function showToast(message, kind = "info", timeout = 3000) {
  const el = document.createElement("div");
  el.className = "ac-toast " + kind;
  el.textContent = message;
  toastcontainer.appendChild(el);
  requestAnimationFrame(() => el.classList.add("show"));
  setTimeout(() => {
    el.classList.remove("show");
    setTimeout(() => el.remove(), 200);
  }, timeout);
}

/* ------------------------- dirty-state tracking ------------------------ */

function hightlightChange() {
  unsavedChanges = true;
  savbtn.style.borderColor = "red";
  updateStatusBar();
}

function unhightlightChange() {
  unsavedChanges = false;
  savbtn.style.borderColor = "";
  updateStatusBar();
}

window.addEventListener("beforeunload", (e) => {
  if (unsavedChanges) {
    e.preventDefault();
    e.returnValue = "";
  }
});

function updateStatusBar() {
  if (!table) return;
  const total = table.getDataCount();
  const selected = table.getSelectedRows().length;
  statuscount.textContent =
    total === 0
      ? wizardbtn.hidden
        ? "No rules yet — use the New (advanced) button to add one"
        : "No rules yet — click Guided Setup to create one"
      : total + (total === 1 ? " rule" : " rules");
  statusselected.textContent = selected ? selected + " selected" : "";
  statusdirty.textContent = unsavedChanges ? "unsaved changes" : "";
}

/* --------------------------- regex validation --------------------------- */

function isValidRegex(str) {
  try {
    new RegExp(str);
    return true;
  } catch (e) {
    return false;
  }
}

function validateRegexCell(cell) {
  const el = cell.getElement();
  if (isValidRegex(cell.getValue())) {
    el.classList.remove("ac-invalid-cell");
    el.title = "";
  } else {
    el.classList.add("ac-invalid-cell");
    el.title = "Not a valid regular expression";
  }
}

/* ------------------------ relay test/run to a page ------------------------ */

async function relay(type, cssselector) {
  if (!cssselector) {
    return { ok: false, error: "CSS selector is empty" };
  }
  try {
    const res = await browser.runtime.sendMessage({ type, cssselector });
    return res || { ok: false, error: "No response from page" };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

function describeResult(res, verb) {
  if (!res.ok) {
    return { text: "Error: " + res.error, kind: "error" };
  }
  if (res.count === 0) {
    return { text: "No matching elements found on the page", kind: "error" };
  }
  return {
    text: res.count + " element(s) " + verb,
    kind: "success",
  };
}

/* --------------------------------- rows --------------------------------- */

tgladv.addEventListener("click", async function () {
  ["tags", "repeatdelay", "maxrepeats", "randomrepeatvariance"].forEach((f) =>
    table.toggleColumn(f),
  );
  const nowOn = table.getColumn("repeatdelay").isVisible();
  localStorage.setItem("ac-advanced-visible", nowOn ? "1" : "0");
});

function addNewRowWithData(regex) {
  table.deselectRow();
  table.addRow(
    {
      enabled: false,
      group: "",
      annotation: "",
      tags: "",
      cssselector: "",
      initaldelay: 1000,
      repeatdelay: 0,
      maxrepeats: 0,
      randomrepeatvariance: 0,
      urlregex: regex,
    },
    true,
  );
  hightlightChange();
}

addbtn.addEventListener("click", async function () {
  table.deselectRow();
  table.addRow(
    {
      enabled: false,
      group: "",
      annotation: "",
      tags: "",
      cssselector: "",
      initaldelay: 1000,
      repeatdelay: 0,
      maxrepeats: 0,
      randomrepeatvariance: 0,
      urlregex: "",
    },
    true,
  );
  hightlightChange();
});

/* ------------------------------ guided setup ------------------------------ */

const wizardOverlay = document.getElementById("wizardOverlay");
const wizardbtn = document.getElementById("wizardbtn");
const wizardClose = document.getElementById("wizardClose");
const wSkip = document.getElementById("wSkip");
const wBack = document.getElementById("wBack");
const wNext = document.getElementById("wNext");
const wFinish = document.getElementById("wFinish");
const wizardDots = document.getElementById("wizardDots");
const wStepUrl = document.getElementById("wStepUrl");
const wStepSelector = document.getElementById("wStepSelector");
const wTestSelector = document.getElementById("wTestSelector");
const wTestResult = document.getElementById("wTestResult");
const wInitialDelay = document.getElementById("wInitialDelay");
const wRepeatEnabled = document.getElementById("wRepeatEnabled");
const wRepeatOptions = document.getElementById("wRepeatOptions");
const wRepeatDelay = document.getElementById("wRepeatDelay");
const wAnnotation = document.getElementById("wAnnotation");
const wEnableNow = document.getElementById("wEnableNow");
const wReviewSummary = document.getElementById("wReviewSummary");
const wizardBtnToggle = document.getElementById("wizardBtnToggle");

const WIZARD_BTN_PREF_KEY = "ac-show-wizard-btn";

function applyWizardBtnVisibility() {
  const show = localStorage.getItem(WIZARD_BTN_PREF_KEY) !== "0";
  wizardbtn.hidden = !show;
  wizardBtnToggle.checked = show;
}

wizardBtnToggle.addEventListener("change", () => {
  localStorage.setItem(
    WIZARD_BTN_PREF_KEY,
    wizardBtnToggle.checked ? "1" : "0",
  );
  applyWizardBtnVisibility();
});

applyWizardBtnVisibility();

const WIZARD_TOTAL_STEPS = 4;
let wizardStep = 1;

function renderWizardDots() {
  wizardDots.innerHTML = "";
  for (let i = 1; i <= WIZARD_TOTAL_STEPS; i++) {
    const dot = document.createElement("span");
    dot.className = "ac-wizard-dot" + (i === wizardStep ? " active" : "");
    wizardDots.appendChild(dot);
  }
}

function normalizeUrl(raw) {
  let v = raw.trim();
  if (!v) return "";
  if (!/^https?:\/\//i.test(v)) {
    v = "https://" + v;
  }
  return v;
}

function buildRegexFromWizard() {
  const url = normalizeUrl(wStepUrl.value);
  const scope = document.querySelector('input[name="wScope"]:checked').value;

  if (scope === "site") {
    try {
      const origin = new URL(url).origin;
      const escaped = origin.replaceAll("/", "\\/").replaceAll(".", "\\.");
      return "^" + escaped + ".*";
    } catch (e) {
      // fall through to the page-scoped regex below
    }
  }

  let regex = "^" + url.replaceAll("/", "\\/");
  regex = regex.replaceAll(".", "\\.");
  return regex + ".*";
}

function buildReviewText() {
  const url = normalizeUrl(wStepUrl.value) || "(no address given)";
  const scope = document.querySelector('input[name="wScope"]:checked').value;
  const where =
    scope === "site"
      ? "any page on the same website as " + url
      : "pages starting with " + url;
  const delaySec = parseInt(wInitialDelay.value, 10) / 1000;

  let text =
    "When you visit " +
    where +
    ", Automate Click will wait " +
    (delaySec === 0 ? "no time at all" : delaySec + " second(s)") +
    " and then click the element matching: " +
    (wStepSelector.value.trim() || "(no selector given)") +
    ".";

  if (wRepeatEnabled.checked) {
    const repeatSec = parseInt(wRepeatDelay.value, 10) / 1000;
    text +=
      " It will keep checking every " +
      repeatSec +
      " second(s) in case it reappears.";
  }

  if (wAnnotation.value.trim()) {
    text += ' This rule will be named "' + wAnnotation.value.trim() + '".';
  }

  text += wEnableNow.checked
    ? " It will be turned on as soon as you save it."
    : " It will be saved switched off, so you can turn it on later once you're happy with it.";

  return text;
}

function showWizardStep(step) {
  document.querySelectorAll(".ac-step").forEach((el) => {
    el.hidden = Number(el.dataset.step) !== step;
  });
  wBack.disabled = step === 1;
  wNext.hidden = step === WIZARD_TOTAL_STEPS;
  wFinish.hidden = step !== WIZARD_TOTAL_STEPS;
  if (step === WIZARD_TOTAL_STEPS) {
    wReviewSummary.textContent = buildReviewText();
  }
  renderWizardDots();
}

function resetWizard() {
  wStepUrl.value = "";
  document.querySelector('input[name="wScope"][value="page"]').checked = true;
  wStepSelector.value = "";
  wTestResult.textContent = "";
  wTestResult.className = "ac-test-result";
  wInitialDelay.value = "1000";
  wRepeatEnabled.checked = false;
  wRepeatOptions.hidden = true;
  wRepeatDelay.value = "3000";
  wAnnotation.value = "";
  wEnableNow.checked = false;
  wizardStep = 1;
  showWizardStep(1);
}

function openWizard() {
  resetWizard();
  wizardOverlay.classList.add("open");
  wStepUrl.focus();
}

function closeWizard() {
  wizardOverlay.classList.remove("open");
}

function validateWizardStep(step) {
  if (step === 1) {
    const url = normalizeUrl(wStepUrl.value);
    if (!url) {
      showToast("Enter the website address first", "error");
      return false;
    }
    try {
      new URL(url);
    } catch (e) {
      showToast("That doesn't look like a valid web address", "error");
      return false;
    }
  }
  if (step === 2) {
    if (!wStepSelector.value.trim()) {
      showToast("Paste the CSS selector you copied first", "error");
      return false;
    }
  }
  return true;
}

wizardbtn.addEventListener("click", openWizard);
wizardClose.addEventListener("click", closeWizard);
wSkip.addEventListener("click", closeWizard);
wizardOverlay.addEventListener("click", (e) => {
  if (e.target === wizardOverlay) closeWizard();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && wizardOverlay.classList.contains("open")) {
    closeWizard();
  }
});

wRepeatEnabled.addEventListener("change", () => {
  wRepeatOptions.hidden = !wRepeatEnabled.checked;
});

wTestSelector.addEventListener("click", async () => {
  const sel = wStepSelector.value.trim();
  if (!sel) {
    wTestResult.textContent = "Paste a selector first";
    wTestResult.className = "ac-test-result error";
    return;
  }
  wTestResult.textContent = "Testing…";
  wTestResult.className = "ac-test-result";
  const res = await relay("ac-relay-test", sel);
  const d = describeResult(res, "highlighted on the page");
  wTestResult.textContent = d.text;
  wTestResult.className = "ac-test-result " + d.kind;
});

wNext.addEventListener("click", () => {
  if (!validateWizardStep(wizardStep)) return;
  wizardStep = Math.min(wizardStep + 1, WIZARD_TOTAL_STEPS);
  showWizardStep(wizardStep);
});

wBack.addEventListener("click", () => {
  wizardStep = Math.max(wizardStep - 1, 1);
  showWizardStep(wizardStep);
});

wFinish.addEventListener("click", () => {
  if (!validateWizardStep(1) || !validateWizardStep(2)) return;

  const rule = {
    enabled: wEnableNow.checked,
    group: "",
    annotation: wAnnotation.value.trim(),
    tags: "",
    cssselector: wStepSelector.value.trim(),
    initaldelay: parseInt(wInitialDelay.value, 10),
    repeatdelay: wRepeatEnabled.checked ? parseInt(wRepeatDelay.value, 10) : 0,
    // negative maxrepeats means "keep going forever" (see waitFor() in
    // content-script.js)
    maxrepeats: wRepeatEnabled.checked ? -1 : 0,
    randomrepeatvariance: 0,
    urlregex: buildRegexFromWizard(),
  };

  table.deselectRow();
  table.addRow(rule, true);

  closeWizard();
  if (persistRules()) {
    showToast(
      wEnableNow.checked
        ? "Rule saved and turned on"
        : "Rule saved — it's currently off, enable it in the table when it's ready",
      "success",
      wEnableNow.checked ? 3000 : 5000,
    );
  }
});

dupbtn.addEventListener("click", async function () {
  const rows = table.getSelectedRows();
  if (!rows.length) {
    showToast("Select one or more rules to duplicate", "info");
    return;
  }
  rows.forEach((row) => {
    const data = { ...row.getData() };
    table.addRow(data, false, row);
  });
  hightlightChange();
  showToast(rows.length + " rule(s) duplicated", "success");
});

ablebtn.addEventListener("click", async function () {
  let changed = false;
  table.getSelectedRows().forEach((row) => {
    const cell = row.getCell("enabled");
    if (cell.setValue(!cell.getValue())) {
      changed = true;
    }
  });
  if (changed) {
    hightlightChange();
  }
});

delbtn.addEventListener("click", async function () {
  const rows = table.getSelectedRows();
  if (!rows.length) {
    showToast("Select one or more rules to delete", "info");
    return;
  }
  if (!window.confirm("Delete " + rows.length + " selected rule(s)?")) {
    return;
  }
  rows.forEach((row) => row.delete());
  hightlightChange();
});

discbtn.addEventListener("click", (evt) => {
  if (unsavedChanges && !window.confirm("Discard unsaved changes?")) {
    return;
  }
  unsavedChanges = false; // avoid the beforeunload prompt on top of this confirm
  window.location.reload();
});

function persistRules({ confirmMessage } = {}) {
  let data = table.getData();

  const badRegexRows = data.filter((d) => !isValidRegex(d.urlregex));
  if (badRegexRows.length) {
    showToast(
      badRegexRows.length +
        " rule(s) have an invalid URL regular expression — fix the highlighted cell(s) before saving",
      "error",
      5000,
    );
    return false;
  }

  if (confirmMessage && !window.confirm(confirmMessage)) {
    return false;
  }

  let i = 0;
  for (i = 0; i < data.length; i++) {
    // numbers need parsing ... for whatever reason
    data[i].initaldelay = parseInt(data[i].initaldelay);
    data[i].repeatdelay = parseInt(data[i].repeatdelay);
    data[i].maxrepeats = parseInt(data[i].maxrepeats);
    data[i].randomrepeatvariance = parseInt(data[i].randomrepeatvariance);
    data[i].idx = i;
  }
  browser.storage.local.set({ selectors: data });
  unhightlightChange();
  return true;
}

savbtn.addEventListener("click", () => {
  const count = table.getDataCount();
  if (persistRules({ confirmMessage: "Save changes?" })) {
    showToast("Saved " + count + " rule(s)", "success");
  }
});

expbtn.addEventListener("click", async function () {
  let selectedRows = table.getSelectedRows();

  if (!selectedRows.length) {
    showToast("Select one or more rules to export", "info");
    return;
  }

  // order the selected by position
  selectedRows.sort((a, b) => {
    return b.getPosition() - a.getPosition();
  });

  let idx_count = 0;

  // fixup the export data
  const expData = [];
  selectedRows.forEach((row) => {
    const rowData = row.getData();
    rowData.initaldelay = parseInt(rowData.initaldelay);
    rowData.repeatdelay = parseInt(rowData.repeatdelay);
    rowData.maxrepeats = parseInt(rowData.maxrepeats);
    rowData.randomrepeatvariance = parseInt(rowData.randomrepeatvariance);
    rowData.idx = idx_count;
    expData.push(rowData);
  });
  const content = JSON.stringify(expData, null, 4);
  let dl = document.createElement("a");
  const href =
    "data:application/json;charset=utf-8," + encodeURIComponent(content);
  dl.setAttribute("href", href);
  dl.setAttribute("download", extId + "-rules.json");
  dl.setAttribute("visibility", "hidden");
  dl.setAttribute("display", "none");
  document.body.appendChild(dl);
  dl.click();
  document.body.removeChild(dl);
  showToast("Exported " + expData.length + " rule(s)", "success");
});

// delegate to real import Button which is a file selector
impbtnWrp.addEventListener("click", function () {
  impbtn.click();
});

// read data from file into current table
impbtn.addEventListener("input", function () {
  var file = this.files[0];
  var reader = new FileReader();
  reader.onload = async function () {
    try {
      var config = JSON.parse(reader.result);
      let imported = 0;
      config.forEach((selector) => {
        table.addRow(
          {
            enabled: selector.activ || selector.enabled || false,
            group: selector.group || "",
            annotation: selector.annotation || "",
            tags: selector.tags || "",
            cssselector: selector.code || selector.cssselector || "",
            initaldelay: parseInt(
              selector.delay || selector.initaldelay || 1000,
            ),
            repeatdelay: parseInt(selector.repeat || selector.repeatdelay || 0),
            maxrepeats: parseInt(selector.maxrepeats || 0),
            randomrepeatvariance: parseInt(
              selector.rvariance || selector.randomrepeatvariance || 0,
            ),
            urlregex: selector.url_regex || selector.urlregex || "",
          },
          false,
        );
        imported++;
      });
      if (imported) {
        hightlightChange();
        showToast(imported + " rule(s) imported — remember to Save", "success");
      }
    } catch (e) {
      log("ERROR", "error loading file " + e);
      showToast("Could not import file: " + e, "error");
    }
  };
  reader.readAsText(file);
  // allow re-importing the same filename later
  this.value = "";
});

function tagValuesLookup() {
  const rows = table.getRows();
  const tags = [];
  for (const row of rows) {
    const cell = row.getCell("tags");
    const vals = cell.getValue().split(/[\s,]+/);
    for (const val of vals) {
      if (val !== "" && !tags.includes(val)) {
        tags.push(val);
      }
    }
  }
  return tags;
}

/* --------------------------- row action buttons -------------------------- */

function makeRowActionsFormatter() {
  return function (cell) {
    const wrap = document.createElement("span");
    wrap.className = "ac-row-actions";

    const testBtn = document.createElement("button");
    testBtn.textContent = "\u{1F50D} Test"; // magnifying glass
    testBtn.title =
      "Highlight matching element(s) on the last page you had open";
    testBtn.addEventListener("click", async (e) => {
      e.stopPropagation();
      const cssselector = cell.getRow().getData().cssselector;
      const res = await relay("ac-relay-test", cssselector);
      const d = describeResult(res, "highlighted");
      showToast(d.text, d.kind);
    });

    const runBtn = document.createElement("button");
    runBtn.textContent = "\u25B6 Run"; // play
    runBtn.title =
      "Click the matching element(s) now, on the last page you had open";
    runBtn.addEventListener("click", async (e) => {
      e.stopPropagation();
      const cssselector = cell.getRow().getData().cssselector;
      const res = await relay("ac-relay-run", cssselector);
      const d = describeResult(res, "clicked");
      showToast(d.text, d.kind);
    });

    const rowDelBtn = document.createElement("button");
    rowDelBtn.textContent = "\u{1F5D1} Delete"; // wastebasket
    rowDelBtn.title = "Delete this rule";
    rowDelBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const row = cell.getRow();
      const label =
        row.getData().annotation || row.getData().cssselector || "this rule";
      if (!window.confirm('Delete "' + label + '"?')) {
        return;
      }
      row.delete();
      hightlightChange();
      showToast("Rule deleted", "success");
    });

    wrap.appendChild(testBtn);
    wrap.appendChild(runBtn);
    wrap.appendChild(rowDelBtn);
    return wrap;
  };
}

async function onDOMContentLoaded() {
  table = new Tabulator("#mainTable", {
    virtualDom: false,
    layout: "fitDataStretch",
    responsiveLayout: "hide",
    pagination: false,
    movableRows: true,
    groupBy: "group",
    groupUpdateOnCellEdit: true,
    groupStartOpen: false,
    initialSort: [{ column: "group", dir: "asc" }],
    columns: [
      {
        rowHandle: true,
        formatter: "handle",
        headerSort: false,
        frozen: true,
        width: 30,
        minWidth: 30,
      },
      {
        formatter: "rowSelection",
        titleFormatter: "rowSelection",
        width: 30,
        minWidth: 30,
        hozAlign: "left",
        headerSort: false,
        cellClick: function (e, cell) {
          cell.getRow().toggleSelect();
          updateStatusBar();
        },
      },
      {
        title: "Enabled",
        width: 90,
        field: "enabled",
        formatter: "tickCross",
        sorter: "boolean",
        headerHozAlign: "center",
        hozAlign: "center",
        editor: true,
        editorParams: { tristate: false },
      },
      {
        title: "Actions",
        width: 220,
        headerSort: false,
        hozAlign: "center",
        formatter: makeRowActionsFormatter(),
      },
      {
        title: "Group",
        field: "group",
        headerFilter: "input",
        headerFilterPlaceholder: "Text filter",
        width: 120,
        editor: "input",
        sorter: "string",
        sorterParams: { locale: true, alignEmptyValues: "top" },
      },
      {
        title: "Tags",
        field: "tags",
        width: 120,
        headerFilter: "select",
        headerFilterPlaceholder: "Multiselect",
        editor: "input",
        sorter: "string",
        sorterParams: { locale: true, alignEmptyValues: "bottom" },
        headerFilterParams: {
          values: tagValuesLookup,
          verticalNavigation: "hybrid",
          multiselect: true,
        },
        visible: false,
      },
      {
        title: "Annotation",
        field: "annotation",
        maxWidth: 240,
        headerFilter: "input",
        headerFilterPlaceholder: "Text filter",
        editor: "input",
        sorter: "string",
        sorterParams: { locale: true, alignEmptyValues: "top" },
        visible: true,
      },
      {
        title: "Inital <br/>Delay",
        width: 80,
        field: "initaldelay",
        sorter: "number",
        editor: "input",
        headerSort: false,
        validator: ["required", "min:0", "integer"],
      },
      {
        title: "Repeat <br/>Delay",
        width: 80,
        field: "repeatdelay",
        sorter: "number",
        editor: "input",
        headerSort: false,
        validator: ["required", "min:0", "integer"],
        visible: false,
      },
      {
        title: "Max <br/>Repeats",
        width: 80,
        field: "maxrepeats",
        sorter: "number",
        editor: "input",
        headerSort: false,
        validator: ["required", "min:0", "integer"],
        visible: false,
      },
      {
        title:
          '<acronym title="Random Repeat Variance" style="text-decoration-style:dashed;">RRV</acronym>',
        headerSort: false,
        width: 80,
        field: "randomrepeatvariance",
        sorter: "number",
        editor: "input",
        validator: ["required", "min:0", "integer"],
        visible: false,
      },
      {
        title: "CSS Selector*",
        field: "cssselector",
        width: "25%",
        headerFilter: "input",
        headerFilterPlaceholder: "Text filter",
        editor: "textarea",
        editorParams: { verticalNavigation: "editor" },
        formatter: "plaintext",
      },
      {
        title: "URL Regular Expression*",
        width: "25%",
        field: "urlregex",
        headerFilter: "input",
        headerFilterPlaceholder: "Text filter",
        editor: "input",
      },
    ],
  });

  // restore the advanced-columns visibility preference
  const advancedOn = localStorage.getItem("ac-advanced-visible") === "1";
  if (advancedOn) {
    ["tags", "repeatdelay", "maxrepeats", "randomrepeatvariance"].forEach((f) =>
      table.showColumn(f),
    );
  }

  // Load data
  const data = await getTblData();
  data.forEach((e) => {
    table.addRow(e, true);
  });

  // validate any regexes that came from storage
  table.getRows().forEach((row) => {
    const cell = row.getCell("urlregex");
    if (cell) validateRegexCell(cell);
  });
  updateStatusBar();

  /* --------------------------- table events --------------------------- */

  table.on("cellEdited", function (cell) {
    if (cell.getField() === "urlregex") {
      validateRegexCell(cell);
    }
    if (cell.getValue() !== cell.getOldValue()) {
      hightlightChange();
    }
  });

  table.on("rowMoved", function () {
    hightlightChange();
  });

  table.on("rowDeleted", function () {
    updateStatusBar();
  });

  table.on("rowSelectionChanged", function () {
    updateStatusBar();
  });

  // invert the selected state of each row
  table.on("groupClick", function (e, group) {
    group.getRows().forEach((row) => {
      row.toggleSelect();
    });
  });

  // after adding a row, open the group it is in and highlight/select it
  table.on("rowAdded", function (row) {
    var group = row.getGroup();
    if (group) group.show();
    row.select();
    updateStatusBar();
  });

  let params = new URL(document.location).searchParams;
  let url = params.get("url");

  if (url) {
    addRuleFromUrl(url);
  }

  if (pendingRuleRequest) {
    addRuleFromUrl(pendingRuleRequest.url);
    pendingRuleRequest = null;
  }
}

function addRuleFromUrl(url) {
  let regex = "^" + url.replaceAll("/", "\\/");
  regex = regex.replaceAll(".", "\\.");
  regex = regex + ".*";

  addNewRowWithData(regex);
  showToast(
    "New rule created for this page (currently off — enable it in the table when it's ready)",
    "success",
    5000,
  );
}

// the background script re-uses this tab (instead of opening a new one)
// when the browser action fires again while this options tab is already open
let pendingRuleRequest = null;

browser.runtime.onMessage.addListener((message) => {
  if (message && message.type === "ac-add-rule") {
    if (table) {
      addRuleFromUrl(message.url);
    } else {
      pendingRuleRequest = message;
    }
  }
});

async function getTblData() {
  let data = [];
  var res = await browser.storage.local.get("selectors");

  if (Array.isArray(res.selectors)) {
    res.selectors.sort(function (b, a) {
      if (typeof a.idx === "undefined" && typeof b.idx === "number") {
        return 1;
      }
      if (typeof a.idx === "number" && typeof b.idx === "undefined") {
        return -1;
      }
      if (typeof a.idx === "number" && typeof b.idx === "number") {
        if (a.idx > b.idx) return 1;
        if (a.idx < b.idx) return -1;
      }
      return 0;
    });
    res.selectors.forEach((selector) => {
      data.push({
        enabled: selector.activ || selector.enabled || false,
        annotation: selector.annotation || "",
        tags: selector.tags || "",
        group: selector.group || "",
        cssselector: selector.code || selector.cssselector || "",
        initaldelay: selector.delay || selector.initaldelay || 1000,
        repeatdelay: selector.repeat || selector.repeatdelay || 0,
        maxrepeats: selector.maxrepeats || 0,
        randomrepeatvariance: parseInt(
          selector.rvariance || selector.randomrepeatvariance || 0,
        ),
        urlregex: selector.url_regex || selector.urlregex || "",
      });
    });
  }
  return data;
}

document.addEventListener("DOMContentLoaded", onDOMContentLoaded);

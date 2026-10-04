/* global browser */

const $ = (id) => document.getElementById(id);

function deleteRule(card) {
  card.remove();
}

function validateRegexInput(input) {
  if (input.value.trim() === "") {
    input.classList.remove("is-invalid");
    return;
  }
  try {
    new RegExp(input.value);
    input.classList.remove("is-invalid");
    input.title = "";
  } catch (e) {
    input.classList.add("is-invalid");
    input.title = "Invalid regex: " + e.message;
  }
}

function flashSaveStatus(text) {
  const status = $("saveStatus");
  status.textContent = text || "Saved";
  status.classList.add("is-visible");
  clearTimeout(flashSaveStatus._t);
  flashSaveStatus._t = setTimeout(() => {
    status.classList.remove("is-visible");
  }, 2500);
}

// ---------------------------------------------------------------------------
// "Test" button: run a rule against the most recently used other tab
// ---------------------------------------------------------------------------

const TEST_MAX_URLS = 60;

function toUrlArray(v) {
  if (typeof v === "string") {
    return [v];
  }
  return Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];
}

function absoluteHttpUrl(u, base) {
  if (u.trim() === "") {
    return null;
  }
  try {
    const x = new URL(u.trim(), base);
    return x.protocol === "http:" || x.protocol === "https:" ? x.href : null;
  } catch (e) {
    return null;
  }
}

async function findTestTab() {
  const me = await browser.tabs.getCurrent();
  const tabs = await browser.tabs.query({ currentWindow: true });
  const candidates = tabs
    .filter((t) => (!me || t.id !== me.id) && /^https?:/i.test(t.url || ""))
    .sort((a, b) => (b.lastAccessed || 0) - (a.lastAccessed || 0));
  return candidates[0] || null;
}

function resultLine(parent, className, text) {
  const p = document.createElement("p");
  if (className) {
    p.className = className;
  }
  p.textContent = text;
  parent.appendChild(p);
}

async function runTest(card, button, box) {
  const code = card.querySelector(".code").value.trim();
  const regexText = card.querySelector(".url_regex").value.trim();

  box.hidden = false;
  box.replaceChildren();
  button.disabled = true;
  try {
    if (code === "") {
      resultLine(box, "err", "This rule has no code to run.");
      return;
    }
    const tab = await findTestTab();
    if (!tab) {
      resultLine(
        box,
        "err",
        "Open the page you want to test in another tab of this window first.",
      );
      return;
    }
    resultLine(box, "", "Tested on: " + tab.url);

    if (regexText !== "") {
      try {
        if (!new RegExp(regexText).test(tab.url)) {
          resultLine(
            box,
            "warn",
            "The URL regex does not match this page, so the rule would not run here. Running the code anyway:",
          );
        }
      } catch (e) {
        resultLine(box, "err", "Invalid regex: " + e.message);
      }
    }

    let returned;
    try {
      const r = await browser.tabs.executeScript(tab.id, { code });
      returned = r && r[0];
    } catch (e) {
      resultLine(box, "err", "The code failed: " + e.message);
      return;
    }
    if (!Array.isArray(returned)) {
      resultLine(
        box,
        "err",
        "The code must return an array of URLs, but returned: " +
          JSON.stringify(returned),
      );
      return;
    }

    const urls = [
      ...new Set(
        toUrlArray(returned)
          .map((u) => absoluteHttpUrl(u, tab.url))
          .filter(Boolean),
      ),
    ];
    if (urls.length === 0) {
      resultLine(box, "", "The code returned no usable URLs.");
      return;
    }
    const shown = urls.slice(0, TEST_MAX_URLS);
    resultLine(
      box,
      "",
      urls.length +
        " candidate URL(s) returned" +
        (urls.length > shown.length
          ? " (checking the first " + shown.length + ")"
          : "") +
        ", checking them ...",
    );

    const results = await browser.runtime.sendMessage({
      action: "checkUrls",
      urls: shown,
    });

    box.replaceChildren();
    resultLine(box, "", "Tested on: " + tab.url);
    const ul = document.createElement("ul");
    const list = Array.isArray(results) ? results : [];
    shown.forEach((u, i) => {
      const r = list[i] || { ok: false, reason: "no answer" };
      const li = document.createElement("li");
      const mark = document.createElement("span");
      mark.className = "mark " + (r.ok ? "ok" : "fail");
      mark.textContent = r.ok ? "✓" : "✗";
      const url = document.createElement("span");
      url.className = "url";
      url.textContent = u;
      const detail = document.createElement("span");
      detail.className = "detail";
      if (r.ok) {
        const parts = [r.type];
        if (r.title) {
          parts.push(r.title);
        }
        if (typeof r.items === "number") {
          parts.push(r.items + " items");
        }
        detail.textContent = parts.join(" · ");
      } else {
        detail.textContent = r.reason;
      }
      li.appendChild(mark);
      li.appendChild(url);
      li.appendChild(detail);
      ul.appendChild(li);
    });
    box.appendChild(ul);
  } catch (e) {
    resultLine(box, "err", "Test failed: " + e.message);
  } finally {
    button.disabled = false;
  }
}

// ---------------------------------------------------------------------------
// Rule cards
// ---------------------------------------------------------------------------

function createRuleCard(feed) {
  const rulesContainer = $("mainTableBody");
  const isNew = feed.action === "save";

  const card = document.createElement("div");
  card.className = "rule-card" + (isNew ? " is-new" : "");

  const head = document.createElement("div");
  head.className = "rule-head";

  const toggleLabel = document.createElement("label");
  toggleLabel.className = "rule-toggle";
  const toggleInput = document.createElement("input");
  toggleInput.type = "checkbox";
  toggleInput.className = "activ";
  toggleInput.checked = typeof feed.activ === "boolean" ? feed.activ : true;
  toggleLabel.appendChild(toggleInput);
  toggleLabel.appendChild(document.createTextNode("Enabled"));

  const regexLabel = document.createElement("span");
  regexLabel.className = "rule-label";
  regexLabel.textContent = "URL matches";

  const regexInput = document.createElement("input");
  regexInput.className = "url_regex";
  regexInput.placeholder = "^https:\\/\\/example\\.com\\/.*";
  regexInput.value = feed.url_regex || "";
  regexInput.spellcheck = false;
  regexInput.addEventListener("input", () => validateRegexInput(regexInput));
  validateRegexInput(regexInput);

  head.appendChild(toggleLabel);
  head.appendChild(regexLabel);
  head.appendChild(regexInput);

  const codeArea = document.createElement("textarea");
  codeArea.className = "code";
  codeArea.placeholder =
    "(async () => {\n  // return an array of candidate feed URLs\n  return [];\n})();";
  codeArea.value = feed.code || "";
  codeArea.spellcheck = false;

  const testBox = document.createElement("div");
  testBox.className = "test-result";
  testBox.hidden = true;

  const testBtn = document.createElement("button");
  testBtn.type = "button";
  testBtn.className = "btn-small";
  testBtn.textContent = "Test";
  testBtn.title =
    "Run this rule on the page in your most recently used other tab and check the URLs it returns";
  testBtn.addEventListener("click", () => runTest(card, testBtn, testBox));
  head.appendChild(testBtn);

  if (!isNew) {
    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "btn-danger-text";
    deleteBtn.textContent = "Delete";
    deleteBtn.addEventListener("click", () => deleteRule(card));
    head.appendChild(deleteBtn);
  }

  card.appendChild(head);
  card.appendChild(codeArea);
  card.appendChild(testBox);

  if (isNew) {
    rulesContainer.insertBefore(card, rulesContainer.firstChild);
  } else {
    rulesContainer.appendChild(card);
  }

  return card;
}

function collectConfig() {
  const cards = document.querySelectorAll("#mainTableBody .rule-card");
  const feeds = [];
  for (const card of cards) {
    try {
      const url_regex = card.querySelector(".url_regex").value.trim();
      const code = card.querySelector(".code").value.trim();
      const activ = card.querySelector(".activ").checked;
      if (url_regex !== "" && code !== "") {
        feeds.push({ activ, code, url_regex });
      }
    } catch (e) {
      console.error(e);
    }
  }
  return feeds;
}

async function saveOptions(evt) {
  evt.preventDefault();
  const config = collectConfig();
  await browser.storage.local.set({ selectors: config });
  flashSaveStatus();
}

async function restoreOptions() {
  // the always-present card at the top for adding a new rule
  createRuleCard({ activ: true, code: "", url_regex: "", action: "save" });

  const res = await browser.storage.local.get("selectors");
  if (!Array.isArray(res.selectors)) {
    return;
  }
  res.selectors.forEach((selector) => {
    createRuleCard(selector);
  });
}

// ---------------------------------------------------------------------------
// Settings (saved as soon as they change)
// ---------------------------------------------------------------------------

async function loadSettings() {
  const res = await browser.storage.local.get([
    "autoDetect",
    "subscribeTemplate",
  ]);
  $("autoDetect").checked = res.autoDetect === true;
  $("subscribeTemplate").value =
    typeof res.subscribeTemplate === "string" ? res.subscribeTemplate : "";
}

async function saveSubscribeTemplate() {
  await browser.storage.local.set({
    subscribeTemplate: $("subscribeTemplate").value.trim(),
  });
  flashSaveStatus();
}

function setupSettings() {
  $("autoDetect").addEventListener("change", async (evt) => {
    await browser.storage.local.set({ autoDetect: evt.target.checked });
    flashSaveStatus();
  });
  $("subscribeTemplate").addEventListener("change", saveSubscribeTemplate);
  $("subscribePreset").addEventListener("change", async (evt) => {
    if (evt.target.value !== "") {
      $("subscribeTemplate").value = evt.target.value;
      evt.target.value = "";
      await saveSubscribeTemplate();
    }
  });
}

// ---------------------------------------------------------------------------
// Restore defaults / export / import
// ---------------------------------------------------------------------------

async function restoreDefaults() {
  try {
    const resp = await fetch(
      browser.runtime.getURL("custom-feed-detectors.json"),
    );
    const defaults = await resp.json();
    const current = collectConfig(); // keeps unsaved edits too
    const have = new Set(current.map((s) => s.url_regex));
    const missing = defaults.filter((d) => !have.has(d.url_regex));
    if (missing.length === 0) {
      flashSaveStatus("All default rules are already present");
      return;
    }
    await browser.storage.local.set({ selectors: current.concat(missing) });
    $("mainTableBody").innerHTML = "";
    await restoreOptions();
    flashSaveStatus("Added " + missing.length + " default rule(s)");
  } catch (e) {
    console.error("restoring defaults failed", e);
    flashSaveStatus("Restoring defaults failed");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  restoreOptions();
  loadSettings();
  setupSettings();
});
document.querySelector("form").addEventListener("submit", saveOptions);

const impbtnWrp = $("impbtn_wrapper");
const impbtn = $("impbtn");
const expbtn = $("expbtn");

$("restorebtn").addEventListener("click", restoreDefaults);

expbtn.addEventListener("click", async function () {
  const dl = document.createElement("a");
  const res = await browser.storage.local.get("selectors");
  const content = JSON.stringify(res.selectors, null, 4);
  dl.setAttribute(
    "href",
    "data:application/json;charset=utf-8," + encodeURIComponent(content),
  );
  dl.setAttribute("download", "data.json");
  dl.setAttribute("visibility", "hidden");
  dl.setAttribute("display", "none");
  document.body.appendChild(dl);
  dl.click();
  document.body.removeChild(dl);
});

// delegate to real Import Button which is a file selector
impbtnWrp.addEventListener("click", function () {
  impbtn.click();
});

impbtn.addEventListener("input", function () {
  const file = this.files[0];
  const reader = new FileReader();
  reader.onload = async function () {
    try {
      const config = JSON.parse(reader.result);
      if (!Array.isArray(config)) {
        throw new Error("expected a JSON array of rules");
      }
      await browser.storage.local.set({ selectors: config });
      $("mainTableBody").innerHTML = "";
      await restoreOptions();
      flashSaveStatus();
    } catch (e) {
      console.error("error loading file: " + e);
      flashSaveStatus("Import failed: " + e.message);
    }
  };
  reader.readAsText(file);
});

/* global browser */

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

function createRuleCard(feed) {
  const rulesContainer = document.getElementById("mainTableBody");
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

  if (!isNew) {
    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "btn-danger-text";
    deleteBtn.textContent = "Delete";
    deleteBtn.addEventListener("click", () => deleteRule(card));
    head.appendChild(deleteBtn);
  }

  const codeArea = document.createElement("textarea");
  codeArea.className = "code";
  codeArea.placeholder =
    "(async () => {\n  // return an array of candidate feed URLs\n  return [];\n})();";
  codeArea.value = feed.code || "";
  codeArea.spellcheck = false;

  card.appendChild(head);
  card.appendChild(codeArea);

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

function flashSaveStatus() {
  const status = document.getElementById("saveStatus");
  status.classList.add("is-visible");
  clearTimeout(flashSaveStatus._t);
  flashSaveStatus._t = setTimeout(() => {
    status.classList.remove("is-visible");
  }, 1500);
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

document.addEventListener("DOMContentLoaded", restoreOptions);
document.querySelector("form").addEventListener("submit", saveOptions);

const impbtnWrp = document.getElementById("impbtn_wrapper");
const impbtn = document.getElementById("impbtn");
const expbtn = document.getElementById("expbtn");

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
      await browser.storage.local.set({ selectors: config });
      document.getElementById("mainTableBody").innerHTML = "";
      await restoreOptions();
      flashSaveStatus();
    } catch (e) {
      console.error("error loading file: " + e);
    }
  };
  reader.readAsText(file);
});

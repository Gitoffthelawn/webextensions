/* global browser */

let storage;

const listEl = () => document.getElementById("subdomain_list");
const whitelistRadio = () => document.getElementById("mode_whitelist");
const blacklistRadio = () => document.getElementById("mode_blacklist");
const whitelistLabel = () => document.getElementById("mode_whitelist_label");
const blacklistLabel = () => document.getElementById("mode_blacklist_label");

function currentLines() {
  return listEl()
    .value.split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith("#"));
}

function updateLineCount() {
  const n = currentLines().length;
  document.getElementById("line_count").textContent =
    n === 1 ? "1 subdomain listed" : `${n} subdomains listed`;
}

function updateActiveStyles() {
  whitelistLabel().classList.toggle("active", whitelistRadio().checked);
  blacklistLabel().classList.toggle("active", blacklistRadio().checked);
  updateExample();
}

// Builds: <strong>Example:</strong> <text before> <code>a</code> <text mid> <code>b</code> <text after>
function renderExample(
  box,
  beforeCode,
  codeText1,
  midText,
  codeText2,
  afterText,
) {
  box.textContent = "";

  const strong = document.createElement("strong");
  strong.textContent = "Example:";
  box.appendChild(strong);

  box.appendChild(document.createTextNode(" " + beforeCode + " "));

  const code1 = document.createElement("code");
  code1.textContent = codeText1;
  box.appendChild(code1);

  box.appendChild(document.createTextNode(" " + midText + " "));

  const code2 = document.createElement("code");
  code2.textContent = codeText2;
  box.appendChild(code2);

  box.appendChild(document.createTextNode(" " + afterText));
}

function updateExample() {
  const lines = currentLines();
  const sample = lines[0] || "mail.google.com";
  const domain = sample.split(".").slice(-2).join(".");
  const box = document.getElementById("example_box");

  if (blacklistRadio().checked) {
    renderExample(
      box,
      "with",
      sample,
      "in the list, its tabs join the shared",
      domain,
      "group. Subdomains you have not listed keep their own full-subdomain group.",
    );
  } else {
    renderExample(
      box,
      "with",
      sample,
      "in the list, it gets its own",
      sample,
      "group. Subdomains you have not listed are merged into their domain group instead.",
    );
  }
}

function showSaved() {
  const msg = document.getElementById("savedmsg");
  msg.classList.add("show");
  clearTimeout(showSaved._t);
  showSaved._t = setTimeout(() => msg.classList.remove("show"), 1500);
}

async function save() {
  const mode = blacklistRadio().checked; // true = blacklist, false = whitelist
  storage.set("subdomain_list_mode", mode);
  storage.set("subdomain_list", listEl().value);
  showSaved();
}

async function onLoad() {
  storage = await import("./storage.js");

  const mode = await storage.get("boolean", "subdomain_list_mode", false);
  const list = await storage.get("string", "subdomain_list", "");

  listEl().value = list;
  if (mode) {
    blacklistRadio().checked = true;
  } else {
    whitelistRadio().checked = true;
  }

  updateActiveStyles();
  updateLineCount();

  listEl().addEventListener("input", () => {
    updateLineCount();
    updateExample();
  });

  [whitelistRadio(), blacklistRadio()].forEach((r) =>
    r.addEventListener("change", updateActiveStyles),
  );

  document.getElementById("savebtn").addEventListener("click", save);
}

document.addEventListener("DOMContentLoaded", onLoad);

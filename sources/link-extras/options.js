/* global browser */

const DEFAULT_FOLDER = "unfiled_____";
const $ = (id) => document.getElementById(id);

const OPTIONAL_PERMISSIONS = [
  {
    name: "bookmarks",
    label: "Bookmarks",
    why: "Enables “Bookmark Links” and the default bookmark folder.",
  },
  {
    name: "downloads",
    label: "Downloads",
    why: "Enables “Download Links”.",
  },
  {
    name: "notifications",
    label: "Notifications",
    why: "Shows a short message after each action.",
  },
];

let statusTimer;
function showStatus(msg, isError = false) {
  const el = $("status");
  el.textContent = msg;
  el.className = isError ? "error" : "";
  clearTimeout(statusTimer);
  if (!isError) {
    statusTimer = setTimeout(() => (el.textContent = ""), 3000);
  }
}

/* ---------- permissions + bookmark folder ---------- */

function renderPermissions(grantedList) {
  const items = OPTIONAL_PERMISSIONS.map((perm, i) => {
    const granted = grantedList[i];
    const li = document.createElement("li");

    const label = document.createElement("b");
    label.textContent = perm.label + (granted ? " (granted)" : "");
    const why = document.createElement("span");
    why.className = "why muted";
    why.textContent = perm.why;

    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = granted ? "Revoke" : "Grant";
    btn.addEventListener("click", async () => {
      // request() must be called straight from the click handler
      try {
        if (granted) {
          await browser.permissions.remove({ permissions: [perm.name] });
        } else {
          await browser.permissions.request({ permissions: [perm.name] });
        }
      } catch (e) {
        showStatus("Permission change failed: " + e.message, true);
      }
      await refreshPermissionUi();
    });

    li.append(label, why, btn);
    return li;
  });
  $("permList").replaceChildren(...items);
}

// returns [{ id, label }] in tree order, or null without the bookmarks permission
async function getFolderChoices(hasBookmarks) {
  if (!hasBookmarks) {
    return null;
  }
  const [root] = await browser.bookmarks.getTree();
  const choices = [];
  const walk = (node, depth) => {
    for (const child of node.children || []) {
      if (child.type === "folder") {
        choices.push({
          id: child.id,
          label: "\u2003".repeat(depth) + (child.title || "(untitled)"),
        });
        walk(child, depth + 1);
      }
    }
  };
  walk(root, 0);
  return choices;
}

function renderFolders(choices, stored) {
  const sel = $("bookmarkFolderId");
  if (choices === null) {
    sel.replaceChildren(new Option("Grant the bookmarks permission first", ""));
    sel.disabled = true;
    return;
  }
  sel.replaceChildren(...choices.map((c) => new Option(c.label, c.id)));
  sel.value = choices.some((c) => c.id === stored) ? stored : DEFAULT_FOLDER;
  sel.disabled = false;
}

// All async work happens first, then the DOM is swapped in one synchronous step.
// Overlapping calls (button click + permissions.onAdded) therefore cannot
// interleave and duplicate entries; only the newest call renders.
let refreshToken = 0;
async function refreshPermissionUi() {
  const token = ++refreshToken;
  const granted = await Promise.all(
    OPTIONAL_PERMISSIONS.map((p) =>
      browser.permissions.contains({ permissions: [p.name] }),
    ),
  );
  const hasBookmarks =
    granted[OPTIONAL_PERMISSIONS.findIndex((p) => p.name === "bookmarks")];
  const choices = await getFolderChoices(hasBookmarks);
  const stored = (await browser.storage.local.get("bookmarkFolderId"))
    .bookmarkFolderId;
  if (token !== refreshToken) {
    return;
  }
  renderPermissions(granted);
  renderFolders(choices, stored);
}

/* ---------- format table ---------- */

function createRow(item = {}) {
  const tr = $("mainTableBody").insertRow();

  const name = document.createElement("input");
  name.type = "text";
  name.className = "name";
  name.placeholder = "Name";
  name.value = item.name || "";
  name.style.width = "100%";
  name.style.boxSizing = "border-box";
  tr.insertCell().appendChild(name);

  const html = document.createElement("input");
  html.type = "checkbox";
  html.className = "html";
  html.checked = item.html === true;
  html.title = "Also copy as HTML fragment";
  tr.insertCell().appendChild(html);

  const format = document.createElement("input");
  format.type = "text";
  format.className = "format";
  format.placeholder = "e.g. [%text](%url)";
  format.value = item.format || "";
  format.style.width = "100%";
  format.style.boxSizing = "border-box";
  tr.insertCell().appendChild(format);

  const del = document.createElement("button");
  del.type = "button";
  del.textContent = "✕";
  del.setAttribute("aria-label", "Delete format");
  del.addEventListener("click", () => tr.remove());
  const delCell = tr.insertCell();
  delCell.className = "center";
  delCell.appendChild(del);

  return tr;
}

function collectConfig() {
  const rows = [];
  for (const tr of $("mainTableBody").rows) {
    const name = tr.querySelector(".name").value.trim();
    const format = tr.querySelector(".format").value.trim();
    if (name !== "" && format !== "") {
      rows.push({ html: tr.querySelector(".html").checked, name, format });
    }
  }
  return rows;
}

function fillTable(rows) {
  $("mainTableBody").replaceChildren();
  rows.forEach((r) => createRow(r));
}

function sanitizeConfig(data) {
  if (!Array.isArray(data)) {
    throw new Error("expected a JSON array of formats");
  }
  const rows = data
    .filter(
      (r) =>
        r &&
        typeof r === "object" &&
        typeof r.name === "string" &&
        typeof r.format === "string",
    )
    .map((r) => ({
      html: r.html === true,
      name: r.name.trim(),
      format: r.format.trim(),
    }))
    .filter((r) => r.name !== "" && r.format !== "");
  if (rows.length === 0 && data.length > 0) {
    throw new Error('no valid entries (each needs a "name" and a "format")');
  }
  return rows;
}

/* ---------- load / save ---------- */

async function restoreOptions() {
  const res = await browser.storage.local.get(["selectors", "separator"]);
  $("separator").value = typeof res.separator === "string" ? res.separator : "";
  fillTable(
    Array.isArray(res.selectors) ? sanitizeConfigSafe(res.selectors) : [],
  );
  await refreshPermissionUi();
}

function sanitizeConfigSafe(data) {
  try {
    return sanitizeConfig(data);
  } catch (e) {
    return [];
  }
}

async function saveOptions(evt) {
  evt.preventDefault(); // otherwise the page reloads before the save finishes
  try {
    const values = {
      selectors: collectConfig(),
      separator: $("separator").value,
    };
    const folder = $("bookmarkFolderId");
    if (!folder.disabled && folder.value) {
      values.bookmarkFolderId = folder.value;
    }
    await browser.storage.local.set(values);
    showStatus("Saved");
  } catch (e) {
    showStatus("Save failed: " + e.message, true);
  }
}

/* ---------- import / export ---------- */

function exportConfig() {
  const content = JSON.stringify(collectConfig(), null, 2);
  const url = URL.createObjectURL(
    new Blob([content], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = "link-extras-formats.json";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function importConfig() {
  const input = $("impfile");
  const file = input.files[0];
  input.value = ""; // allow importing the same file again
  if (!file) {
    return;
  }
  try {
    const rows = sanitizeConfig(JSON.parse(await file.text()));
    fillTable(rows);
    showStatus(
      "Imported " + rows.length + " format(s). Click “Save changes” to apply.",
    );
  } catch (e) {
    showStatus("Import failed: " + e.message, true);
  }
}

/* ---------- wiring ---------- */

$("mainForm").addEventListener("submit", saveOptions);
$("addbtn").addEventListener("click", () => {
  createRow().querySelector(".name").focus();
});
$("impbtn").addEventListener("click", () => $("impfile").click());
$("impfile").addEventListener("change", importConfig);
$("expbtn").addEventListener("click", exportConfig);
// commands.openShortcutSettings() exists in newer Firefox versions only
if (
  browser.commands &&
  typeof browser.commands.openShortcutSettings === "function"
) {
  $("shortcutbtn").hidden = false;
  $("shortcutHint").hidden = true;
  $("shortcutbtn").addEventListener("click", () => {
    browser.commands.openShortcutSettings().catch((e) => {
      showStatus("Cannot open shortcut settings: " + e.message, true);
    });
  });
}
browser.permissions.onAdded.addListener(refreshPermissionUi);
browser.permissions.onRemoved.addListener(refreshPermissionUi);

restoreOptions().catch((e) => showStatus("Loading failed: " + e.message, true));

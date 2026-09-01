/* global browser QRCode */

const BOARD_KEY = "qrBoard";

const grid = document.getElementById("grid");
const emptyMsg = document.getElementById("empty");
const saveSelectedBtn = document.getElementById("saveSelectedBtn");
const removeSelectedBtn = document.getElementById("removeSelectedBtn");

const composer = document.getElementById("composer");
const vType = document.getElementById("vType");
const vText = document.getElementById("vText");
const vImg = document.getElementById("vImg");
const vStatus = document.getElementById("vStatus");
const vCharCount = document.getElementById("vCharCount");
const vFieldText = document.getElementById("vFieldText");
const vFieldGeo = document.getElementById("vFieldGeo");
const vFieldWifi = document.getElementById("vFieldWifi");
const vGeoLat = document.getElementById("vGeoLat");
const vGeoLng = document.getElementById("vGeoLng");
const vWifiSsid = document.getElementById("vWifiSsid");
const vWifiPassword = document.getElementById("vWifiPassword");
const vWifiSecurity = document.getElementById("vWifiSecurity");
const vWifiHidden = document.getElementById("vWifiHidden");
const vWifiTogglePassword = document.getElementById("vWifiTogglePassword");
const vCopyBtn = document.getElementById("vCopyBtn");
const vAddBoardBtn = document.getElementById("vAddBoardBtn");
const vSaveBtn = document.getElementById("vSaveBtn");
const newCodeBtn = document.getElementById("newCodeBtn");

const vMain = document.getElementById("vMain");
const vSettingsPanel = document.getElementById("vSettingsPanel");
const vHistoryPanel = document.getElementById("vHistoryPanel");
const vSettingsBtn = document.getElementById("vSettingsBtn");
const vHistoryBtn = document.getElementById("vHistoryBtn");

const HISTORY_KEY = "qrHistory";
const HISTORY_LIMIT = 8;
const SETTINGS_KEYS = [
  "fgcolor",
  "bgcolor",
  "fgalpha",
  "bgalpha",
  "qrSize",
  "qrPadding",
  "qrecl",
  "saveMode",
];

// Selection is kept here rather than in storage — it's per-tab UI
// state, not something worth persisting or syncing to the popup.
const selectedIds = new Set();

function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

function escapeWifiField(value) {
  return value.replace(/([\\;,":])/g, "\\$1");
}

// Parses an SVG string and inserts it as a real DOM node, avoiding
// innerHTML (which parses as HTML, not SVG).
// Ensures the SVG scales proportionally to fill its card instead of
// being clipped. Without a viewBox, resizing a raw inline <svg> via
// CSS just changes its viewport while leaving the drawn coordinates
// as-is — cropping the code rather than scaling it. We backfill a
// viewBox from the library's width/height attributes if one isn't
// already present, then let CSS control the actual displayed size.
function normalizeScalableSvg(svgEl) {
  if (!svgEl.hasAttribute("viewBox")) {
    const w = parseFloat(svgEl.getAttribute("width"));
    const h = parseFloat(svgEl.getAttribute("height"));
    if (w > 0 && h > 0) {
      svgEl.setAttribute("viewBox", `0 0 ${w} ${h}`);
    }
  }
  svgEl.removeAttribute("width");
  svgEl.removeAttribute("height");
  svgEl.setAttribute("preserveAspectRatio", "xMidYMid meet");
}

function setSvgContent(container, svgString) {
  const doc = new DOMParser().parseFromString(svgString, "image/svg+xml");
  const svgEl = doc.documentElement;
  container.textContent = "";
  if (svgEl && svgEl.nodeName.toLowerCase() === "svg") {
    normalizeScalableSvg(svgEl);
    container.appendChild(svgEl);
  }
}

function renderEntrySvg(entry, size) {
  const qrcode = new QRCode({
    content: entry.content,
    padding: entry.padding,
    width: size,
    height: size,
    color: entry.fg,
    background: entry.bg,
    ecl: entry.ecl,
  });
  return qrcode.svg();
}

function svgStringToPngBlob(svgString, size) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      canvas.getContext("2d").drawImage(img, 0, 0, size, size);
      URL.revokeObjectURL(img.src);
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("canvas.toBlob returned null"));
        }
      }, "image/png");
    };
    img.onerror = () => reject(new Error("Failed to rasterize SVG"));
    img.src = URL.createObjectURL(
      new Blob([svgString], { type: "image/svg+xml" }),
    );
  });
}

function makeFilename(content, mode) {
  const base = content
    .replace(/^[a-z]+:/i, "")
    .replace(/[^a-z0-9]+/gi, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
  return (base || "qrcode") + "." + mode;
}

async function getSaveSettings() {
  const { qrSize, saveMode } = await browser.storage.local.get([
    "qrSize",
    "saveMode",
  ]);
  return {
    qrSize: typeof qrSize === "number" ? qrSize : 460,
    saveMode: typeof saveMode === "string" ? saveMode : "png",
  };
}

// Board entries already carry their own baked-in fg/bg (composed at
// the moment they were added), so getSaveSettings() above only needs
// size/filetype. The live composer instead needs the full current
// render settings, same as the popup's generator.
async function getComposerRenderSettings() {
  const stored = await browser.storage.local.get([
    "fgcolor",
    "fgalpha",
    "bgcolor",
    "bgalpha",
    "qrPadding",
    "qrecl",
    "qrSize",
    "saveMode",
  ]);

  const fgcolorBase =
    typeof stored.fgcolor === "string" ? stored.fgcolor : "#000000";
  const fgalpha = parseInt(
    typeof stored.fgalpha === "string" ? stored.fgalpha : "255",
    10,
  );
  const bgcolorBase =
    typeof stored.bgcolor === "string" ? stored.bgcolor : "#ffffff";
  const bgalpha = parseInt(
    typeof stored.bgalpha === "string" ? stored.bgalpha : "255",
    10,
  );

  let fg = fgcolorBase + fgalpha.toString(16);
  let bg = bgcolorBase + bgalpha.toString(16);
  if (fg.length < 9) fg += "0";
  if (bg.length < 9) bg += "0";

  return {
    fg,
    bg,
    qrPadding: typeof stored.qrPadding === "number" ? stored.qrPadding : 1,
    qrecl: typeof stored.qrecl === "string" ? stored.qrecl : "M",
    qrSize: typeof stored.qrSize === "number" ? stored.qrSize : 460,
    saveMode: typeof stored.saveMode === "string" ? stored.saveMode : "png",
  };
}

function renderQr(content, settings, size) {
  const qrcode = new QRCode({
    content,
    padding: settings.qrPadding,
    width: size,
    height: size,
    color: settings.fg,
    background: settings.bg,
    ecl: settings.qrecl,
  });
  return qrcode.svg();
}

async function addToHistory(content) {
  if (!content) return;
  const { [HISTORY_KEY]: existing = [] } =
    await browser.storage.local.get(HISTORY_KEY);
  const filtered = existing.filter((e) => e.content !== content);
  filtered.unshift({ content, savedAt: Date.now() });
  await browser.storage.local.set({
    [HISTORY_KEY]: filtered.slice(0, HISTORY_LIMIT),
  });
}

// --- composer: the same code-building form the popup provides, ------
// --- embedded directly on the board page --------------------------

const COMPOSER_TYPE_PLACEHOLDERS = {
  "": "https://example.com or any text",
  "mailto:": "name@example.com",
  "tel:": "+1 555 555 5555",
};

function updateComposerFieldVisibility() {
  const type = vType.value;
  const isTextType = type === "" || type === "mailto:" || type === "tel:";
  vFieldText.hidden = !isTextType;
  vFieldGeo.hidden = type !== "geo:";
  vFieldWifi.hidden = type !== "WIFI:";
  if (isTextType) {
    vText.placeholder = COMPOSER_TYPE_PLACEHOLDERS[type] || "";
  }
}

function updateComposerCharCount() {
  vCharCount.textContent = `${vText.value.length} characters`;
}

// Returns the full QR payload string, or null if the current type's
// required fields aren't filled in yet — mirrors the popup's
// getComposedContent().
function getComposerContent() {
  const type = vType.value;

  if (type === "geo:") {
    const lat = vGeoLat.value.trim();
    const lng = vGeoLng.value.trim();
    return lat !== "" && lng !== "" ? `geo:${lat},${lng}` : null;
  }

  if (type === "WIFI:") {
    const ssid = vWifiSsid.value.trim();
    if (ssid === "") return null;
    const security = vWifiSecurity.value;
    const parts = [`T:${security}`, `S:${escapeWifiField(ssid)}`];
    if (security !== "nopass") {
      parts.push(`P:${escapeWifiField(vWifiPassword.value)}`);
    }
    parts.push(`H:${vWifiHidden.checked ? "true" : "false"}`);
    return `WIFI:${parts.join(";")};`;
  }

  const raw = vText.value.trim();
  return raw === "" ? null : type + vText.value;
}

// Tracks the content the currently-displayed preview actually
// corresponds to, so Copy/Save/Add-to-board don't need to recompute
// (or risk racing) getComposerContent() again.
let composerLastRenderContent = null;

async function updateComposerQr() {
  const content = getComposerContent();

  if (content === null) {
    if (vImg.dataset.blobUrl) {
      URL.revokeObjectURL(vImg.dataset.blobUrl);
      delete vImg.dataset.blobUrl;
    }
    vImg.removeAttribute("src");
    vImg.style.opacity = "1";
    vStatus.textContent = "Enter the details above to generate a QR code.";
    vStatus.classList.remove("error");
    composerLastRenderContent = null;
    return;
  }

  const settings = await getComposerRenderSettings();

  let svgString;
  try {
    svgString = renderQr(content, settings, settings.qrSize);
  } catch (e) {
    console.error(e);
    vStatus.textContent =
      "Can't generate a QR code for this input — try shorter text or a lower error-correction level.";
    vStatus.classList.add("error");
    return;
  }

  vStatus.textContent = "";
  vStatus.classList.remove("error");
  composerLastRenderContent = content;

  try {
    const blob = await svgStringToPngBlob(svgString, settings.qrSize);
    const url = URL.createObjectURL(blob);
    if (vImg.dataset.blobUrl) {
      URL.revokeObjectURL(vImg.dataset.blobUrl);
    }
    vImg.dataset.blobUrl = url;
    vImg.filename = makeFilename(content, settings.saveMode);
    vImg.src = url;
    vImg.style.opacity = "1";
  } catch (e) {
    console.error(e);
  }
}

const debouncedUpdateComposerQr = debounce(updateComposerQr, 200);

function onComposerInput() {
  // Fade the current image slightly so a fast typist can see a
  // refresh is pending, without the flash of an empty/stale image.
  vImg.style.opacity = "0.5";
  debouncedUpdateComposerQr();
}

vType.addEventListener("change", () => {
  updateComposerFieldVisibility();
  updateComposerQr();
});
vText.addEventListener("input", () => {
  updateComposerCharCount();
  onComposerInput();
});
vGeoLat.addEventListener("input", onComposerInput);
vGeoLng.addEventListener("input", onComposerInput);
vWifiSsid.addEventListener("input", onComposerInput);
vWifiPassword.addEventListener("input", onComposerInput);
vWifiSecurity.addEventListener("change", onComposerInput);
vWifiHidden.addEventListener("change", onComposerInput);

vWifiTogglePassword.addEventListener("click", () => {
  vWifiPassword.type = vWifiPassword.type === "password" ? "text" : "password";
});

// --- settings & history panels ---------------------------------------
//
// Mirrors the popup's toolbar: only one of {vMain, vSettingsPanel,
// vHistoryPanel} is visible at a time.

function hideComposerPanels() {
  vSettingsPanel.hidden = true;
  vHistoryPanel.hidden = true;
  vMain.hidden = false;
}

function showComposerPanel(panel) {
  vSettingsPanel.hidden = true;
  vHistoryPanel.hidden = true;
  vMain.hidden = true;
  panel.hidden = false;
}

vSettingsBtn.addEventListener("click", () => {
  if (vSettingsPanel.hidden) {
    showComposerPanel(vSettingsPanel);
  } else {
    hideComposerPanels();
  }
});

vHistoryBtn.addEventListener("click", async () => {
  if (vHistoryPanel.hidden) {
    await loadComposerHistory();
    showComposerPanel(vHistoryPanel);
  } else {
    hideComposerPanels();
  }
});

// settings.js persists each quick-settings field to the same storage
// keys the QR renderer reads from; just react when any of them change.
browser.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") return;
  if (Object.keys(changes).some((k) => SETTINGS_KEYS.includes(k))) {
    debouncedUpdateComposerQr();
  }
});

// --- color pickers ------------------------------------------------------
//
// Same rationale as the popup: a plain hex field + preset swatches
// instead of a native <input type="color">, since that hands focus to
// an OS dialog.

const HEX_COLOR_RE = /^#[0-9A-Fa-f]{6}$/;

function setupColorPicker(hexInputId, swatchId) {
  const hexInput = document.getElementById(hexInputId);
  const swatch = document.getElementById(swatchId);

  function refreshSwatch() {
    const valid = HEX_COLOR_RE.test(hexInput.value);
    hexInput.classList.toggle("invalid", !valid);
    if (valid) {
      swatch.style.background = hexInput.value;
    }
  }

  browser.storage.local.get(hexInputId).then((obj) => {
    const stored = obj[hexInputId];
    if (typeof stored === "string" && HEX_COLOR_RE.test(stored)) {
      hexInput.value = stored;
    }
    refreshSwatch();
  });

  hexInput.addEventListener("input", refreshSwatch);

  document
    .querySelectorAll(
      `.swatch-palette[data-target="${hexInputId}"] .swatch-btn`,
    )
    .forEach((btn) => {
      btn.addEventListener("click", () => {
        hexInput.value = btn.dataset.color;
        refreshSwatch();
        // settings.js listens for "input" to persist the value; the
        // palette click needs to trigger the same save path.
        hexInput.dispatchEvent(new Event("input", { bubbles: true }));
      });
    });
}

setupColorPicker("fgcolor", "fgcolorSwatch");
setupColorPicker("bgcolor", "bgcolorSwatch");

// --- history --------------------------------------------------------

async function loadComposerHistory() {
  const { [HISTORY_KEY]: entries = [] } =
    await browser.storage.local.get(HISTORY_KEY);
  renderComposerHistory(entries);
}

function renderComposerHistory(entries) {
  const heading = vHistoryPanel.querySelector("h3");
  vHistoryPanel.textContent = "";
  vHistoryPanel.appendChild(heading);

  if (entries.length === 0) {
    const empty = document.createElement("p");
    empty.className = "history-empty";
    empty.textContent =
      "No recent codes yet — Copy or Save one to see it here.";
    vHistoryPanel.appendChild(empty);
    return;
  }

  for (const entry of entries) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "history-item";
    btn.textContent =
      entry.content.length > 40
        ? entry.content.slice(0, 40) + "…"
        : entry.content;
    btn.title = entry.content;
    btn.addEventListener("click", () => restoreComposerHistory(entry.content));
    vHistoryPanel.appendChild(btn);
  }

  const clearBtn = document.createElement("button");
  clearBtn.type = "button";
  clearBtn.className = "history-clear";
  clearBtn.textContent = "Clear history";
  clearBtn.addEventListener("click", async () => {
    await browser.storage.local.set({ [HISTORY_KEY]: [] });
    renderComposerHistory([]);
  });
  vHistoryPanel.appendChild(clearBtn);
}

function restoreComposerHistory(content) {
  vType.value = "";
  updateComposerFieldVisibility();
  vText.value = content;
  updateComposerCharCount();
  hideComposerPanels();
  updateComposerQr();
  vText.focus();
}

function openComposer() {
  composer.hidden = false;
  newCodeBtn.textContent = "\u2715 Close";
  hideComposerPanels();
  updateComposerFieldVisibility();
  updateComposerCharCount();
  updateComposerQr();
  vText.focus();
}

function closeComposer() {
  composer.hidden = true;
  hideComposerPanels();
  newCodeBtn.textContent = "\u270E New Code";
}

newCodeBtn.addEventListener("click", () => {
  if (composer.hidden) {
    openComposer();
  } else {
    closeComposer();
  }
});

// Loads a board entry's content back into the composer for editing,
// used by each card's Edit button.
function loadContentIntoComposer(content) {
  openComposer();
  vType.value = "";
  updateComposerFieldVisibility();
  vText.value = content;
  updateComposerCharCount();
  updateComposerQr();
  vText.focus();
  vText.select();
  composer.scrollIntoView({ behavior: "smooth", block: "start" });
}

vCopyBtn.addEventListener("click", async () => {
  const originalLabel = vCopyBtn.textContent;
  try {
    if (!vImg.src) throw new Error("Nothing to copy yet");
    const response = await fetch(vImg.src);
    const blob = await response.blob();
    await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
    vCopyBtn.textContent = "Copied!";
    addToHistory(composerLastRenderContent);
  } catch (e) {
    console.error(e);
    vCopyBtn.textContent = "Failed";
  }
  setTimeout(() => {
    vCopyBtn.textContent = originalLabel;
  }, 1200);
});

vSaveBtn.addEventListener("click", async () => {
  const content = composerLastRenderContent;
  if (!content) return;
  const settings = await getComposerRenderSettings();

  const a = document.createElement("a");
  if (settings.saveMode === "svg") {
    const svgString = renderQr(content, settings, settings.qrSize);
    a.href = URL.createObjectURL(
      new Blob([svgString], { type: "image/svg+xml" }),
    );
    a.download = makeFilename(content, "svg");
    a.click();
    URL.revokeObjectURL(a.href);
  } else {
    a.href = vImg.src;
    a.download = vImg.filename || makeFilename(content, "png");
    a.click();
  }
  a.remove();

  addToHistory(content);
});

vAddBoardBtn.addEventListener("click", async () => {
  const content = composerLastRenderContent;
  if (!content) return;
  const settings = await getComposerRenderSettings();

  const entries = await getBoard();
  const alreadyOnBoard = entries.some(
    (e) =>
      e.content === content &&
      e.fg === settings.fg &&
      e.bg === settings.bg &&
      e.padding === settings.qrPadding &&
      e.ecl === settings.qrecl,
  );
  if (!alreadyOnBoard) {
    entries.push({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      content,
      fg: settings.fg,
      bg: settings.bg,
      padding: settings.qrPadding,
      ecl: settings.qrecl,
      addedAt: Date.now(),
    });
    await browser.storage.local.set({ [BOARD_KEY]: entries });
  }
  addToHistory(content);

  const originalLabel = vAddBoardBtn.textContent;
  vAddBoardBtn.textContent = "Added!";
  setTimeout(() => {
    vAddBoardBtn.textContent = originalLabel;
  }, 1200);
});

async function downloadEntry(entry) {
  const { qrSize, saveMode } = await getSaveSettings();
  const svgString = renderEntrySvg(entry, qrSize);
  const filename = makeFilename(entry.content, saveMode);

  const blob =
    saveMode === "svg"
      ? new Blob([svgString], { type: "image/svg+xml" })
      : await svgStringToPngBlob(svgString, qrSize);

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

async function copyEntry(entry, button) {
  const originalLabel = button.textContent;
  try {
    const { qrSize } = await getSaveSettings();
    const svgString = renderEntrySvg(entry, qrSize);
    const blob = await svgStringToPngBlob(svgString, qrSize);
    await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
    button.textContent = "Copied!";
  } catch (e) {
    console.error(e);
    button.textContent = "Failed";
  }
  setTimeout(() => {
    button.textContent = originalLabel;
  }, 1200);
}

function updateBulkButtons() {
  const count = selectedIds.size;
  saveSelectedBtn.disabled = count === 0;
  saveSelectedBtn.textContent =
    count > 0 ? `Save selected (${count})` : "Save selected";
  removeSelectedBtn.disabled = count === 0;
  removeSelectedBtn.textContent =
    count > 0 ? `Remove selected (${count})` : "Remove selected";
}

function buildCard(entry) {
  const card = document.createElement("div");
  card.className = "card";
  card.classList.toggle("selected", selectedIds.has(entry.id));

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.className = "select-box";
  checkbox.title = "Select for bulk save";
  checkbox.checked = selectedIds.has(entry.id);
  checkbox.addEventListener("change", () => {
    if (checkbox.checked) {
      selectedIds.add(entry.id);
    } else {
      selectedIds.delete(entry.id);
    }
    card.classList.toggle("selected", checkbox.checked);
    updateBulkButtons();
  });
  card.appendChild(checkbox);

  const svgHost = document.createElement("div");
  try {
    setSvgContent(svgHost, renderEntrySvg(entry, 300));
  } catch (e) {
    console.error(e);
    const err = document.createElement("div");
    err.className = "render-error";
    err.textContent = "Can't render this code.";
    svgHost.appendChild(err);
  }
  card.appendChild(svgHost);

  const label = document.createElement("div");
  label.className = "label";
  label.title = entry.content;
  label.textContent =
    entry.content.length > 32
      ? entry.content.slice(0, 32) + "…"
      : entry.content;
  card.appendChild(label);

  const actions = document.createElement("div");
  actions.className = "card-actions";

  const copyBtn = document.createElement("button");
  copyBtn.type = "button";
  copyBtn.textContent = "Copy";
  copyBtn.title = "Copy this QR code to the clipboard";
  copyBtn.addEventListener("click", () => copyEntry(entry, copyBtn));
  actions.appendChild(copyBtn);

  const saveBtn = document.createElement("button");
  saveBtn.type = "button";
  saveBtn.textContent = "Save";
  saveBtn.title = "Save this QR code to disk";
  saveBtn.addEventListener("click", () => downloadEntry(entry));
  actions.appendChild(saveBtn);

  const editBtn = document.createElement("button");
  editBtn.type = "button";
  editBtn.textContent = "Edit";
  editBtn.title = "Load this QR code into the composer for editing";
  editBtn.addEventListener("click", () =>
    loadContentIntoComposer(entry.content),
  );
  actions.appendChild(editBtn);

  card.appendChild(actions);

  const removeBtn = document.createElement("button");
  removeBtn.type = "button";
  removeBtn.className = "remove";
  removeBtn.title = "Remove from board";
  removeBtn.textContent = "\u00D7";
  removeBtn.addEventListener("click", () => removeEntry(entry.id));
  card.appendChild(removeBtn);

  return card;
}

let currentEntries = [];

function renderBoard(entries) {
  currentEntries = entries || [];

  // Drop selections for entries that no longer exist (removed, or
  // the whole board was cleared).
  const liveIds = new Set(currentEntries.map((e) => e.id));
  for (const id of selectedIds) {
    if (!liveIds.has(id)) {
      selectedIds.delete(id);
    }
  }
  updateBulkButtons();

  grid.textContent = "";
  if (currentEntries.length === 0) {
    emptyMsg.hidden = false;
    return;
  }
  emptyMsg.hidden = true;
  for (const entry of currentEntries) {
    grid.appendChild(buildCard(entry));
  }
}

async function getBoard() {
  const { [BOARD_KEY]: entries = [] } =
    await browser.storage.local.get(BOARD_KEY);
  return entries;
}

async function removeEntry(id) {
  const entries = await getBoard();
  await browser.storage.local.set({
    [BOARD_KEY]: entries.filter((e) => e.id !== id),
  });
}

async function removeEntries(ids) {
  const entries = await getBoard();
  await browser.storage.local.set({
    [BOARD_KEY]: entries.filter((e) => !ids.has(e.id)),
  });
}

document.getElementById("clearBoard").addEventListener("click", async () => {
  await browser.storage.local.set({ [BOARD_KEY]: [] });
});

document.getElementById("selectAllBtn").addEventListener("click", () => {
  for (const entry of currentEntries) {
    selectedIds.add(entry.id);
  }
  renderBoard(currentEntries);
});

document.getElementById("selectNoneBtn").addEventListener("click", () => {
  selectedIds.clear();
  renderBoard(currentEntries);
});

saveSelectedBtn.addEventListener("click", async () => {
  saveSelectedBtn.disabled = true;
  const toSave = currentEntries.filter((e) => selectedIds.has(e.id));
  // Serialized rather than parallel: triggering many simultaneous
  // downloads tends to get some of them silently dropped by the
  // browser, and this keeps each blob URL short-lived.
  for (const entry of toSave) {
    try {
      await downloadEntry(entry);
    } catch (e) {
      console.error(e);
    }
  }
  updateBulkButtons();
});

removeSelectedBtn.addEventListener("click", async () => {
  if (selectedIds.size === 0) return;
  removeSelectedBtn.disabled = true;
  await removeEntries(new Set(selectedIds));
  // storage.onChanged -> renderBoard() will drop the removed ids from
  // selectedIds and refresh the button labels/state.
});

// Other extension pages (the popup) add entries directly to storage;
// react live so the board updates whether it was already open or was
// just created with entries already waiting.
browser.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes[BOARD_KEY]) {
    renderBoard(changes[BOARD_KEY].newValue || []);
  }
});

document.addEventListener("DOMContentLoaded", async () => {
  browser.runtime
    .sendMessage({ action: "registerBoardTab" })
    .catch(console.error);
  renderBoard(await getBoard());
});

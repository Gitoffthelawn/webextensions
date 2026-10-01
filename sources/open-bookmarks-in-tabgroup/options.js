/* global browser */

// Must match DEFAULTS in background.js
const DEFAULTS = {
  collapseGroup: true,
  loadTabs: true,
};

async function restoreOptions() {
  const settings = await browser.storage.local.get(DEFAULTS);
  for (const key of Object.keys(DEFAULTS)) {
    const el = document.getElementById(key);
    if (el) {
      el.checked = Boolean(settings[key]);
    }
  }
}

async function saveOption(event) {
  const el = event.target;
  if (!(el instanceof HTMLInputElement) || !(el.id in DEFAULTS)) {
    return;
  }
  await browser.storage.local.set({ [el.id]: el.checked });
}

document.addEventListener("DOMContentLoaded", async () => {
  await restoreOptions();
  for (const key of Object.keys(DEFAULTS)) {
    document.getElementById(key).addEventListener("change", saveOption);
  }
});

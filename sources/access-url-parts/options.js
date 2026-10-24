/* global browser, DEFAULTS, getSettings */
const status = document.querySelector("#status");

function flash(msg) {
  status.textContent = msg;
  setTimeout(() => (status.textContent = ""), 1200);
}

function apply(values) {
  for (const key of Object.keys(DEFAULTS)) {
    const el = document.getElementById(key);
    if (el.type === "checkbox") el.checked = values[key];
    else el.value = values[key];
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  apply(await getSettings());

  for (const key of Object.keys(DEFAULTS)) {
    document.getElementById(key).addEventListener("change", async (e) => {
      const el = e.target;
      let v = el.type === "checkbox" ? el.checked : el.value;
      if (el.type === "number") {
        v = Math.min(
          +el.max,
          Math.max(+el.min, parseInt(v, 10) || DEFAULTS[key]),
        );
        el.value = v;
      }
      await browser.storage.local.set({ [key]: v });
      flash("Saved ✓");
    });
  }

  document.querySelector("#reset").addEventListener("click", async () => {
    await browser.storage.local.clear();
    apply(DEFAULTS);
    flash("Reset ✓");
  });
});

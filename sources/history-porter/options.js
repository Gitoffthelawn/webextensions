/* global browser */

const messageEl = document.getElementById("message");
const progressEl = document.getElementById("progress");
const progressFillEl = document.getElementById("progress-fill");
const progressCountEl = document.getElementById("progress-count");

const THEME_STORAGE_KEY = "theme";
const THEME_BUTTONS = {
  auto: document.getElementById("theme-auto"),
  light: document.getElementById("theme-light"),
  dark: document.getElementById("theme-dark"),
};

function applyTheme(theme) {
  if (theme === "light" || theme === "dark") {
    document.documentElement.setAttribute("data-theme", theme);
  } else {
    document.documentElement.removeAttribute("data-theme");
    theme = "auto";
  }
  Object.entries(THEME_BUTTONS).forEach(([name, btn]) => {
    btn.setAttribute("aria-pressed", String(name === theme));
  });
}

async function initTheme() {
  let stored;
  try {
    const result = await browser.storage.local.get(THEME_STORAGE_KEY);
    stored = result[THEME_STORAGE_KEY];
  } catch (e) {
    console.error("Could not read stored theme:", e);
  }
  applyTheme(stored || "auto");

  Object.entries(THEME_BUTTONS).forEach(([name, btn]) => {
    btn.addEventListener("click", async () => {
      applyTheme(name);
      try {
        await browser.storage.local.set({ [THEME_STORAGE_KEY]: name });
      } catch (e) {
        console.error("Could not save theme choice:", e);
      }
    });
  });
}

function setMessage(text, tone) {
  messageEl.innerText = text;
  if (tone) {
    messageEl.setAttribute("data-tone", tone);
  } else {
    messageEl.removeAttribute("data-tone");
  }
}

function showProgress() {
  progressEl.hidden = false;
  progressCountEl.hidden = false;
  updateProgress(0, 0);
}

function updateProgress(done, total) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  progressFillEl.style.width = pct + "%";
  progressCountEl.innerText = done + " / " + total + " processed";
}

function hideProgress() {
  progressEl.hidden = true;
  progressCountEl.hidden = true;
}

async function exportData() {
  setMessage("Exporting, please wait...");

  const historyItems = (
    await browser.history.search({
      text: "",
      startTime: 0,
      maxResults: 1000000,
    })
  ).map((item) => {
    return { url: item.url, title: item.title, visitTime: item.lastVisitTime };
  });

  console.log("Exporting " + historyItems.length + " historyItems");

  const txt = JSON.stringify(historyItems, null, 4);

  const a = document.createElement("a");
  const blob = new Blob([txt], {
    type: "text/json",
  });
  a.href = window.URL.createObjectURL(blob);
  a.download = "history.json";
  a.click();
  window.URL.revokeObjectURL(a.href);

  setMessage(
    "Export finished, " +
      historyItems.length +
      " item(s) saved to history.json",
    "success",
  );
}

function validateHistoryItems(data) {
  if (!Array.isArray(data)) {
    throw new Error("expected a JSON array of history items");
  }
  data.forEach((item, i) => {
    if (
      typeof item !== "object" ||
      item === null ||
      typeof item.url !== "string" ||
      item.url.length === 0
    ) {
      throw new Error(
        "item at index " + i + " is missing a valid 'url' string field",
      );
    }
  });
  return data;
}

async function importData(historyItems) {
  const chunkSize = 100;
  const n = historyItems.length;
  let imported = 0;
  let failed = 0;

  showProgress();

  for (let start = 0; start < n; start += chunkSize) {
    const chunk = historyItems.slice(start, start + chunkSize);

    const results = await Promise.allSettled(
      chunk.map((item) =>
        browser.history.addUrl({
          url: item.url,
          title: item.title,
          visitTime: item.visitTime,
        }),
      ),
    );

    results.forEach((result) => {
      if (result.status === "fulfilled") {
        imported++;
      } else {
        failed++;
        console.error("Failed to import item:", result.reason);
      }
    });

    updateProgress(imported + failed, n);
  }

  return { imported, failed, total: n };
}

async function onLoad() {
  await initTheme();

  const expbtn = document.getElementById("expbtn");
  expbtn.addEventListener("click", async () => {
    expbtn.disabled = true;
    try {
      await exportData();
    } catch (e) {
      console.error(e);
      setMessage("Export failed: " + e.toString(), "error");
    } finally {
      expbtn.disabled = false;
    }
  });

  const impbtn = document.getElementById("impbtn");
  impbtn.addEventListener("input", function (/*evt*/) {
    const file = this.files[0];
    if (!file) {
      return;
    }
    const reader = new FileReader();
    reader.onload = async function (/*e*/) {
      impbtn.disabled = true;
      try {
        const data = validateHistoryItems(JSON.parse(reader.result));
        const { imported, failed, total } = await importData(data);
        if (failed === 0) {
          setMessage(
            "Import finished without errors, " +
              imported +
              " / " +
              total +
              " item(s) imported. Check the results then you can close this tab",
            "success",
          );
        } else {
          setMessage(
            "Import finished with " +
              failed +
              " error(s), " +
              imported +
              " / " +
              total +
              " item(s) imported successfully. See console for details.",
            "warning",
          );
        }
      } catch (e) {
        console.error(e);
        setMessage("Import failed: " + e.toString(), "error");
      } finally {
        impbtn.disabled = false;
        impbtn.value = "";
        hideProgress();
      }
    };
    reader.onerror = function () {
      setMessage("Could not read the selected file", "error");
      impbtn.disabled = false;
    };
    reader.readAsText(file);
  });
}

document.addEventListener("DOMContentLoaded", onLoad);

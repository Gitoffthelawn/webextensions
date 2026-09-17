function exportData(data) {
  document.getElementById("output").value = data;
}

function countRows(data) {
  if (!data) {
    return 0;
  }
  return data.split(/\r\n|\n|\r/).filter((line) => line.length > 0).length;
}

function setStatus(text) {
  document.getElementById("status").textContent = text;
}

function downloadData(data) {
  // Regardless of mode, the output is always CSV - in "html" mode the cell
  // contents are HTML markup rather than plain text, but the file itself
  // is still comma-separated values, so it should always download as .csv.
  const blob = new Blob([data], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "export.csv";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

async function copyData(data) {
  const button = document.getElementById("copy");
  try {
    await navigator.clipboard.writeText(data);
  } catch (err) {
    // Clipboard API unavailable or blocked - fall back to manual selection.
    console.error(err);
    const output = document.getElementById("output");
    output.select();
    document.execCommand("copy");
  }
  const original = button.textContent;
  button.textContent = "Copied";
  button.disabled = true;
  setTimeout(() => {
    button.textContent = original;
    button.disabled = false;
  }, 1200);
}

async function onDOMContentLoaded() {
  const params = new URL(document.location.href).searchParams;
  const tEId = params.get("tEId");
  const mode = params.get("mode");
  const tabId = params.get("tabId");

  document.getElementById("mode-badge").textContent =
    mode && mode.endsWith("html") ? "HTML" : "Text";

  document.getElementById("download").addEventListener("click", () => {
    downloadData(document.getElementById("output").value);
  });
  document.getElementById("copy").addEventListener("click", () => {
    copyData(document.getElementById("output").value);
  });

  let data;
  let failed = false;
  try {
    data = await browser.tabs.sendMessage(parseInt(tabId, 10), {
      action: "export",
      targetElementId: parseInt(tEId, 10),
      mode,
    });
  } catch (err) {
    console.error(err);
    failed = true;
    data =
      "Error: could not communicate with the page.\n" +
      "Hint: this page may be restricted (e.g. about:, the addon store, a PDF, or a local file) or may have been closed.";
  }

  if (!data) {
    failed = true;
    data =
      "No exportable target found!\nHint: Click the toolbar icon to highlight exportable targets";
  }

  console.debug(data);

  exportData(data);
  document.getElementById("output").select();

  if (failed) {
    setStatus("Nothing to export");
  } else {
    const rows = countRows(data);
    setStatus(rows + (rows === 1 ? " row" : " rows"));
  }
}

document.addEventListener("DOMContentLoaded", onDOMContentLoaded);

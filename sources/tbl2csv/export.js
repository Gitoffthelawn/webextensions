function exportData(data) {
  document.getElementById("output").value = data;
  document.getElementById("output").select();
}

async function onDOMContentLoaded() {
  const params = new URL(document.location.href).searchParams;
  const tEId = params.get("tEId");
  const mode = params.get("mode");
  const tabId = params.get("tabId");

  const data = await browser.tabs.sendMessage(parseInt(tabId), {
    action: "export",
    targetElementId: parseInt(tEId),
    mode,
  });
  exportData(data);
}

document.addEventListener("DOMContentLoaded", onDOMContentLoaded);

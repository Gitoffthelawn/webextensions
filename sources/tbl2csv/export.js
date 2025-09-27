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
  document.getElementById("save").addEventListener("click", save);
}

async function save() {
  let dl = document.createElement("a");
  const utils = await import("./utils.js");
  let textFileAsBlob = new Blob([document.getElementById("output").value], {
    type: "text/plain",
  });
  dl.setAttribute("href", window.URL.createObjectURL(textFileAsBlob));
  dl.setAttribute("download", utils.getTimeStampStr() + ".csv");
  dl.setAttribute("visibility", "hidden");
  dl.setAttribute("display", "none");
  document.body.appendChild(dl);
  dl.click();
  document.body.removeChild(dl);
  document.getElementById("output").select();
}

document.addEventListener("DOMContentLoaded", onDOMContentLoaded);

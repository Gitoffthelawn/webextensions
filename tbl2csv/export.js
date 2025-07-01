function getTimeStampStr() {
  const d = new Date();
  let ts = "";
  [
    d.getFullYear(),
    d.getMonth() + 1,
    d.getDate() + 1,
    d.getHours(),
    d.getMinutes(),
    d.getSeconds(),
  ].forEach((t, i) => {
    ts = ts + (i !== 3 ? "-" : "_") + (t < 10 ? "0" : "") + t;
  });
  return ts.substring(1);
}

function exportData(data) {
  document.getElementById("output").value = data;
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

function save() {
  let dl = document.createElement("a");
  let textFileAsBlob = new Blob([document.getElementById("output").value], {
    type: "text/plain",
  });
  dl.setAttribute("href", window.URL.createObjectURL(textFileAsBlob));
  dl.setAttribute("download", getTimeStampStr() + ".csv");
  dl.setAttribute("visibility", "hidden");
  dl.setAttribute("display", "none");
  document.body.appendChild(dl);
  dl.click();
  document.body.removeChild(dl);
  document.getElementById("output").select();
}

document.addEventListener("DOMContentLoaded", onDOMContentLoaded);

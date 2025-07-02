/* global browser */

function createTableRow(tab) {
  var mainTableBody = document.getElementById("mainTableBody");
  var tr = mainTableBody.insertRow();
  //tr.innerHTML = `<div> ${tab.index}, ${tab.url}, ${tab.loadtime} </div>`;
  tr.insertCell().innerText = tab.index + 1;
  tr.insertCell().innerText = tab.url;
  tr.insertCell().innerText = tab.loadtime;
  tr.addEventListener("click", (evt) => {
    browser.tabs.highlight({ tabs: [tab.index] });
  });
}

async function restoreOptions() {
  var mainTable = document.getElementById("mainTable");
  var message = document.getElementById("message");

  const params = new URL(document.location.href).searchParams;

  var values = [];
  if (params.get("activeTab")) {
    values = await browser.runtime.sendMessage({
      url: "<all_urls>",
      currentWindow: true,
      hidden: false,
      active: true,
    });
  } else {
    values = await browser.runtime.sendMessage({
      url: "<all_urls>",
      currentWindow: true,
      hidden: false,
    });
  }
  if (values.length > 0) {
    mainTable.style.display = "block";
    values.forEach((item) => {
      createTableRow(item);
    });
    return;
  }
  message.innerText = "No tabs with measureable load Times found";
}

document.addEventListener("DOMContentLoaded", restoreOptions);

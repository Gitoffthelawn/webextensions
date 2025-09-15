/* global browser */

async function onDOMContentLoaded() {
  const params = new URL(document.location.href).searchParams;

  const error = params.get("error");

  if (typeof error === "string") {
    document.body.innerText = error;
    return;
  }

  const tabId = parseInt(params.get("tabId"));

  const tabdata = await browser.runtime.sendMessage({ tabId });

  if (tabdata) {
    let img = document.querySelector("img");
    img.setAttribute("src", tabdata.data);
  }
}

document.addEventListener("DOMContentLoaded", onDOMContentLoaded);

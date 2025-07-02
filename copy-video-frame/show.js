/* global browser */

async function onDOMContentLoaded() {
  const params = new URL(document.location.href).searchParams;
  const tabId = parseInt(params.get("tabId"));

  const data = await browser.runtime.sendMessage({ tabId });

  if (data) {
    let img = document.querySelector("img");
    img.setAttribute("src", data);
  }
}

document.addEventListener("DOMContentLoaded", onDOMContentLoaded);

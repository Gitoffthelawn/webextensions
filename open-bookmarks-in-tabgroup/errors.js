/* global browser */

async function onLoad() {
  const failed_urls = await browser.runtime.sendMessage({});
  let txt = document.getElementById("txt");
  txt.value = failed_urls.join("\n");
}

document.addEventListener("DOMContentLoaded", onLoad);

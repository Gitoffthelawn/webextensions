/* global browser */

async function onLoad() {
  const failed_urls = await browser.runtime.sendMessage({});
  document.getElementById("message").textContent =
    failed_urls.length === 1
      ? "1 URL could not be opened:"
      : `${failed_urls.length} URLs could not be opened:`;
  let txt = document.getElementById("txt");
  txt.value = failed_urls.join("\n");
}

document.addEventListener("DOMContentLoaded", onLoad);

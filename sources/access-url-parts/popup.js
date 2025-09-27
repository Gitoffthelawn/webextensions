/* global browser */

document.addEventListener("DOMContentLoaded", async function () {
  function addPart(text, href) {
    const pc = document.querySelector("#parts-container");
    const a = document.createElement("a");
    a.setAttribute("href", href);
    a.setAttribute("target", "_blank");
    const div = document.createElement("div");
    div.setAttribute("class", "part");
    div.textContent = text;
    a.appendChild(div);
    pc.appendChild(a);
  }

  try {
    const tabs = await browser.tabs.query({
      currentWindow: true,
      active: true,
    });
    const url = new URL(tabs[0].url);

    if (url.origin === "null") {
      window.close();
      return;
    }

    let parts = url.pathname.split("/");
    let joined = "";

    let prepend = url.origin;
    addPart(url.hostname, url.origin);

    while (parts.length > 0) {
      if (parts[0] !== "") {
        prepend = prepend + "/" + parts[0];
        addPart(parts[0], prepend);
      }
      parts.shift();
    }
  } catch (e) {
    console.error(e.toString());
  }
});

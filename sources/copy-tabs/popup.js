/* global browser */

function onDOMContentLoaded() {
  const manifest = browser.runtime.getManifest();
  const btncontainer = document.getElementById("btncontainer");

  let breakToggle = false;

  for (const cmd of Object.keys(manifest.commands)) {
    let btn = document.createElement("button");
    let tmp = manifest.commands[cmd].description;

    let scope = "Tabs in Window";
    if (cmd.startsWith("cpysel")) {
      scope = "Tabs in Selection";
    }

    let type = "HTML Links";
    if (cmd.endsWith("txt") || cmd.endsWith("txtnp")) {
      type = "Text URLs";
    }

    if (cmd.endsWith("np")) {
      btn.innerText = "🧹";
      btn.setAttribute(
        "title",
        "Copy [" + scope + "]\nas [clean " + type + "]",
      );
    } else {
      btn.innerText = tmp;
      btn.setAttribute("title", "Copy [" + scope + "]\nas [" + type + "]");
    }

    btn.addEventListener("click", async () => {
      const ret = await browser.runtime.sendMessage({
        cmd: cmd,
      });
      document.getElementById("info").innerText = `${ret} URLs done`;
      setTimeout(() => {
        document.getElementById("info").innerText = "";
      }, 5000);
    });

    btncontainer.appendChild(btn);
    breakToggle = !breakToggle;
  }
}

document.addEventListener("DOMContentLoaded", onDOMContentLoaded);

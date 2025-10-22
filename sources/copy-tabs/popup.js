/* global browser */

function onDOMContentLoaded() {
  const manifest = browser.runtime.getManifest();
  const btncontainer = document.getElementById("btncontainer");

  let breakToggle = false;

  for (const cmd of Object.keys(manifest.commands)) {
    let btn = document.createElement("button");
    let tmp = manifest.commands[cmd].description;

    let scope = "All Window Tabs";
    if (cmd.startsWith("cpysel")) {
      scope = "Selected Tabs";
    }

    let type = "HTML HyperLink URLs";
    if (cmd.endsWith("txt") || cmd.endsWith("txtnp")) {
      type = "Plain Text URLs";
    }

    if (cmd.endsWith("np")) {
      btn.innerText = "🧹";
      btn.setAttribute("title", "Copy [" + scope + "]\nas [clean " + type + "]");
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
    if (breakToggle) {
      breakToggle = false;
    } else {
      breakToggle = true;
    }
  }
}

document.addEventListener("DOMContentLoaded", onDOMContentLoaded);

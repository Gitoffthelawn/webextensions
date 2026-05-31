/* global browser */

const manifest = browser.runtime.getManifest();
//const extname = manifest.name;

let toolbarAction = "cpyalllnk";
let noURLParams = false;
let popupmode = false;

// string(hostname) => Set(p1(string),p2,p3,..,pN)
let allowedHostParams = new Map();

//const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let noURLParamsFunctionCode = "return url;";

function iconReset() {
  setTimeout(() => {
    browser.browserAction.enable();
  }, 450);
}

function removeParams(url) {
  let old_urlobj = new URL(url);

  let old_params = new URLSearchParams(old_urlobj.search);
  let new_params = [];

  if (allowedHostParams.has(old_urlobj.hostname)) {
    const hostparams = allowedHostParams.get(old_urlobj.hostname);

    for (const [key, val] of old_params) {
      if (hostparams.has(key)) {
        new_params.push([key, val]);
      }
    }
  }
  new_params = new URLSearchParams(new_params);

  url = old_urlobj.origin + old_urlobj.pathname;

  if (new_params.size > 0) {
    url = url + "?" + new_params;
  }
  return url;
}

async function copyTabsAsText(tabs) {
  browser.browserAction.disable();

  const text = (
    await Promise.all(
      tabs.map(async (t) => (noURLParams ? removeParams(t.url) : t.url)),
    )
  ).join("\n");

  navigator.clipboard.writeText(text);

  iconReset();
}

async function copyTabsAsHtml(tabs) {
  browser.browserAction.disable();

  let fallbackTextClipboardItem = "";
  let span = document.createElement("span"); // needs to be a <span> to prevent the final linebreak
  span.style.position = "absolute";
  span.style.bottom = "-9999999"; // move it offscreen
  document.body.append(span);

  const tabs_len = tabs.length;
  for (let i = 0; i < tabs.length; i++) {
    let t = tabs[i];
    let a = document.createElement("a");

    a.href = noURLParams ? removeParams(t.url) : t.url;
    a.textContent = t.title;
    span.append(a);
    fallbackTextClipboardItem += a.href;
    if (i !== tabs_len - 1) {
      let br = document.createElement("br");
      span.append(br);
      fallbackTextClipboardItem += "\n";
    }
  }

  if (
    typeof navigator.clipboard.write === "undefined" ||
    typeof ClipboardItem === "undefined"
  ) {
    span.focus();
    document.getSelection().removeAllRanges();
    var range = document.createRange();
    range.selectNode(span);
    document.getSelection().addRange(range);
    document.execCommand("copy");
  } else {
    navigator.clipboard.write([
      new ClipboardItem({
        "text/plain": new Blob([fallbackTextClipboardItem], {
          type: "text/plain",
        }),
        "text/html": new Blob([span.innerHTML], {
          type: "text/html",
        }),
      }),
    ]);
  }
  span.remove();
  iconReset();
}

async function onCommand(cmd) {
  if (cmd.endsWith("np")) {
    noURLParams = true;
  } else {
    noURLParams = false;
  }

  let qryObj = {
      currentWindow: true,
      hidden: false,
      url: "<all_urls>",
    },
    tabs;
  switch (cmd) {
    case "cpyalllnk":
    case "cpyalllnknp":
      tabs = await browser.tabs.query(qryObj);
      copyTabsAsHtml(tabs);
      break;
    case "cpyalltxt":
    case "cpyalltxtnp":
      tabs = await browser.tabs.query(qryObj);
      copyTabsAsText(tabs);
      break;
    case "cpysellnk":
    case "cpysellnknp":
      qryObj["highlighted"] = true;
      tabs = await browser.tabs.query(qryObj);
      copyTabsAsHtml(tabs);
      break;
    case "cpyseltxt":
    case "cpyseltxtnp":
      qryObj["highlighted"] = true;
      tabs = await browser.tabs.query(qryObj);
      copyTabsAsText(tabs);
      break;
  }
  return tabs.length;
}

async function onStorageChange() {
  const storage = await import("./storage.js");
  toolbarAction = await storage.get("string", "toolbarAction", "cpyalllnk");
  allowedHostParams.clear();
  (await storage.get("string", "allowedParams", ""))
    .split("\n")
    .forEach((line) => {
      line = line.trim();
      if (line.length > 0) {
        if (line[0] !== "#") {
          const lparts = line.split(/[\s,]+/);
          if (lparts.length > 1) {
            const host = lparts.shift();
            allowedHostParams.set(host, new Set(lparts));
          }
        }
      }
    });

  popupmode = await storage.get("boolean", "popupmode", false);

  if (popupmode) {
    browser.browserAction.setTitle({
      title:
        "LMB: " +
        manifest.commands[toolbarAction].description +
        "\nMMB: open panel",
    });
  } else {
    browser.browserAction.setTitle({
      title:
        "LMB: open panel\nMMB: " + manifest.commands[toolbarAction].description,
    });
  }
}

// proxy toolbar button click
function onBAClicked(tab, info) {
  if (popupmode) {
    if (info.button === 1) {
      browser.browserAction.setPopup({
        popup: "popup.html",
      });
      browser.browserAction.openPopup();
    } else {
      onCommand(toolbarAction);
    }
  } else {
    if (info.button === 1) {
      browser.browserAction.setPopup({
        popup: "",
      });
      onCommand(toolbarAction);
    } else {
      browser.browserAction.setPopup({
        popup: "popup.html",
      });
      browser.browserAction.openPopup();
    }
  }
  browser.browserAction.setPopup({
    popup: "",
  });
}

async function onMessage(req) {
  return await onCommand(req.cmd);
}

async function onMenuShown(info, tab) {
  browser.menus.update("grpsep", {
    visible: tab.groupId !== -1,
  });
  browser.menus.update("cpygrplnk", {
    visible: tab.groupId !== -1,
  });

  browser.menus.update("cpygrplnknp", {
    visible: tab.groupId !== -1,
  });
  browser.menus.update("cpygrptxt", {
    visible: tab.groupId !== -1,
  });
  browser.menus.update("cpygrptxtnp", {
    visible: tab.groupId !== -1,
  });

  browser.menus.refresh();
}

(async () => {
  await onStorageChange();

  // add context entries to copy the clicked tab
  browser.menus.create({
    title: "🖱️+🔗",
    contexts: ["tab"],
    onclick: async (info, tab) => {
      noURLParams = false;
      copyTabsAsHtml([tab]);
    },
  });
  browser.menus.create({
    title: "🖱️+🔗+🧹",
    contexts: ["tab"],
    onclick: async (info, tab) => {
      noURLParams = true;
      copyTabsAsHtml([tab]);
    },
  });

  browser.menus.create({
    title: "🖱️+📄",
    contexts: ["tab"],
    onclick: async (info, tab) => {
      noURLParams = false;
      copyTabsAsText([tab]);
    },
  });

  browser.menus.create({
    title: "🖱️+📄+🧹",
    contexts: ["tab"],
    onclick: async (info, tab) => {
      noURLParams = true;
      copyTabsAsText([tab]);
    },
  });

  if (browser.tabs.group) {
    browser.menus.create({
      visible: false,
      id: "grpsep",
      contexts: ["tab"],
      type: "separator",
    });

    browser.menus.create({
      visible: false,
      id: "cpygrplnk",
      title: "🗂️+🔗",
      contexts: ["tab"],
      onclick: async (info, tab) => {
        const qryObj = {
          currentWindow: true,
          hidden: false,
          url: "<all_urls>",
          groupId: tab.groupId,
        };
        const tabs = await browser.tabs.query(qryObj);
        noURLParams = false;
        copyTabsAsHtml(tabs);
      },
    });
    browser.menus.create({
      visible: false,
      id: "cpygrplnknp",
      title: "🗂️+🔗+🧹",
      contexts: ["tab"],
      onclick: async (info, tab) => {
        const qryObj = {
          currentWindow: true,
          hidden: false,
          url: "<all_urls>",
          groupId: tab.groupId,
        };
        const tabs = await browser.tabs.query(qryObj);
        noURLParams = true;
        copyTabsAsHtml(tabs);
      },
    });
    browser.menus.create({
      visible: false,
      id: "cpygrptxt",
      title: "🗂️+📄",
      contexts: ["tab"],
      onclick: async (info, tab) => {
        const qryObj = {
          currentWindow: true,
          hidden: false,
          url: "<all_urls>",
          groupId: tab.groupId,
        };
        const tabs = await browser.tabs.query(qryObj);
        noURLParams = false;
        copyTabsAsText(tabs);
      },
    });
    browser.menus.create({
      visible: false,
      id: "cpygrptxtnp",
      title: "🗂️+📄+🧹",
      contexts: ["tab"],
      onclick: async (info, tab) => {
        const qryObj = {
          currentWindow: true,
          hidden: false,
          url: "<all_urls>",
          groupId: tab.groupId,
        };
        const tabs = await browser.tabs.query(qryObj);
        noURLParams = true;
        copyTabsAsText(tabs);
      },
    });

    // update the visibility of the tabgroup actions, depending on the tab
    browser.menus.onShown.addListener(onMenuShown);
  }

  // add the 4 context entries
  lastCmdgrp = "";
  for (const cmd of Object.keys(manifest.commands)) {
    if (cmd.slice(3, 6) !== lastCmdgrp) {
      browser.menus.create({
        contexts: ["tab"],
        type: "separator",
      });
      lastCmdgrp = cmd.slice(3, 6);
    }
    browser.menus.create({
      id: "" + cmd,
      title: manifest.commands[cmd].description,
      contexts: ["tab"],
      onclick: (info) => {
        onCommand(info.menuItemId);
      },
    });
  }

  // add selection menu to toolbar button to switch action

  browser.menus.create({
    id: "basela",
    title: "Select MMB Action",
    contexts: ["browser_action"],
  });

  // add the 4 context entries
  lastCmdgrp = "all";
  for (const cmd of Object.keys(manifest.commands)) {
    if (cmd.slice(3, 6) !== lastCmdgrp) {
      browser.menus.create({
        contexts: ["browser_action"],
        parentId: "basela",
        type: "separator",
      });
      lastCmdgrp = cmd.slice(3, 6);
    }
    browser.menus.create({
      parentId: "basela",
      title: manifest.commands[cmd].description,
      contexts: ["browser_action"],
      onclick: async (info) => {
        const storage = await import("./storage.js");
        storage.set("toolbarAction", cmd);
      },
    });
  }

  browser.runtime.onMessage.addListener(onMessage);
  browser.browserAction.onClicked.addListener(onBAClicked);
  browser.commands.onCommand.addListener(onCommand);
  browser.storage.onChanged.addListener(onStorageChange);

  await onStorageChange();
})();

// EOF

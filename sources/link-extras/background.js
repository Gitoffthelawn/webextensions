/* global browser */

(async () => {
  const manifest = browser.runtime.getManifest();
  const extname = manifest.name;
  const permissions = await import("./permissions.js");
  const utils = await import("./utils.js");
  const storage = await import("./storage.js");

  let bookmarkTargetFolderId;

  const nl = "\n";
  const br = "<br/>";

  let selectors = [];
  let separator = nl;

  async function onStorageChange() {
    selectors = await storage.get("object", "selectors", selectors);
    separator = await storage.get("string", "separator", separator);
  }

  async function onMenuShow(/*info, tab*/) {
    browser.menus.removeAll();

    if (await permissions.hasPermission("bookmarks")) {
      browser.menus.create({
        title: "Bookmark Links",
        contexts: ["link", "selection", "bookmark"],
        onclick: async (info) => {
          // todo/tbd. if we clicked on a bookmark, we need to check if an area in the active tab has been selected and if it contains links
          // todo/tbd. if we clicked on a selection/link we need to ask where to save the links

          //-- handle text selection

          let links = [];

          if (info.selectionText) {
            const ret = await browser.tabs.executeScript({
              code: `selection = getSelection();
                 [...document.links]
                        .filter((anchor) => selection.containsNode(anchor, true))
                        .map(link => link.href);`,
            });

            links = ret[0];
          } else {
            //-- handle link selection
            links.push(info.linkUrl);
          }

          if (typeof bookmarkTargetFolderId === "string") {
            for (const link of links) {
              browser.bookmarks.create({
                title: link,
                //parentId: bmtn.id,
                parentId: bookmarkTargetFolderId,
                url: link,
              });
            }

            utils.notify(extname, "Created " + links.length + " Bookmarks");
          } else {
            utils.notify(extname, "Error: no bookmark folder set");
          }
        },
      });

      browser.menus.create({
        title: "Open Links",
        contexts: ["link", "selection"],
        parentId: "tabs_actions",
        onclick: async (info) => {
          //-- handle text selection

          let links = [];

          if (info.selectionText) {
            const ret = await browser.tabs.executeScript({
              code: `selection = getSelection();
                 [...document.links]
                        .filter((anchor) => selection.containsNode(anchor, true))
                        .map(link => link.href);`,
            });

            links = ret[0];
          } else {
            //-- handle link selection
            links.push(info.linkUrl);
          }

          for (const link of links) {
            browser.tabs.create({
              url: link,
              active: false,
            });
          }

          utils.notify(extname, "Created " + links.length + " Tabs");
        },
      });

      browser.menus.create({
        title: "Open Links in new Window",
        contexts: ["link", "selection"],
        parentId: "tabs_actions",
        onclick: async (info) => {
          //-- handle text selection

          let links = [];

          if (info.selectionText) {
            const ret = await browser.tabs.executeScript({
              code: `selection = getSelection();
                 [...document.links]
                        .filter((anchor) => selection.containsNode(anchor, true))
                        .map(link => link.href);`,
            });

            links = ret[0];
          } else {
            //-- handle link selection
            links.push(info.linkUrl);
          }

          browser.windows.create({
            url: links,
          });

          utils.notify(
            extname,
            "Created new Window with " + links.length + " Tabs",
          );
        },
      });
    }

    if (await permissions.hasPermission("download")) {
      browser.menus.create({
        title: "Download Links",
        contexts: ["link", "selection"],
        onclick: async (info) => {
          //-- handle text selection

          let links = [];

          if (info.selectionText) {
            const ret = await browser.tabs.executeScript({
              code: `selection = getSelection();
                 [...document.links]
                        .filter((anchor) => selection.containsNode(anchor, true))
                        .map(link => link.href);`,
            });

            links = ret[0];
          } else {
            //-- handle link selection
            links.push(info.linkUrl);
          }

          for (const link of links) {
            browser.downloads.download({
              url: link,
              saveAs: false,
            });
          }

          utils.notify(extname, "Downloaded " + links.length + " Links");
        },
      });

      browser.menus.create({
        contexts: ["link", "selection"],
        type: "separator",
      });
    }

    for (const row of selectors) {
      browser.menus.create({
        title: row.name,
        contexts: ["link", "selection"],
        parentId: "copy_actions",
        onclick: async (info) => {
          //-- handle text selection

          let links = [];

          if (info.selectionText) {
            const ret = await browser.tabs.executeScript({
              code: `selection = getSelection();
                    [...document.links]
                    .filter((anchor) => selection.containsNode(anchor, true))
                    .map((link) => ({
                        text: link.innerText,
                        url: link.href,
                    }));`,
            });
            links = ret[0];
          } else {
            //-- handle link selection
            links.push({ text: info.linkText, url: info.linkUrl });
          }

          let tmp3 = "";
          let tmp4 = "";

          for (const link of links) {
            const fmtStr = row.format;
            let tmp2 = fmtStr;

            const replacers = new Map();

            const url = new URL(link.url);

            replacers.set("url_proto", url.protocol);
            replacers.set("url_host", url.hostname);
            replacers.set("url_port", url.port);
            replacers.set("url_path", url.pathname);
            replacers.set("url_params", url.search);
            replacers.set("url_origin", url.origin);
            replacers.set("url", url.href);
            replacers.set("text", link.text);

            for (const [k, v] of replacers) {
              tmp2 = tmp2.replaceAll("%" + k, v);
            }

            tmp3 = tmp3 + tmp2 + (separator === "" ? nl : separator);
          }

          tmp3 = tmp3.replaceAll("%nl", nl);

          if (row.html === true) {
            tmp4 += tmp3.replaceAll(nl, br) + "</span>";
            navigator.clipboard.write([
              new ClipboardItem({
                "text/plain": new Blob([tmp3], {
                  type: "text/plain",
                }),
                "text/html": new Blob([tmp4], {
                  type: "text/html",
                }),
              }),
            ]);
          } else {
            navigator.clipboard.writeText(tmp3);
          }

          utils.notify(
            extname,
            "Copied " + links.length + " Links (" + row.name + ")",
          );
        },
      });
    }

    browser.menus.create({
      contexts: ["link", "selection"],
      parentId: "copy_actions",
      type: "separator",
    });

    browser.menus.create({
      title: "Configure",
      contexts: ["link", "selection"],
      parentId: "copy_actions",
      onclick: async (info) => {
        browser.runtime.openOptionsPage();
      },
    });

    browser.menus.refresh();
  }

  async function handleInstalled(details) {
    if (details.reason === "install") {
      let tmp = await fetch("inital_config.json");
      selectors = await tmp.json();
      await storage.set("selectors", selectors);
      browser.runtime.openOptionsPage();
    }
  }

  browser.browserAction.onClicked.addListener(() => {
    browser.runtime.openOptionsPage();
  });

  browser.runtime.onInstalled.addListener(handleInstalled);

  browser.storage.onChanged.addListener(onStorageChange);

  browser.menus.onShown.addListener(onMenuShow);

  await onStorageChange();
})();

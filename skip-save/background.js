/* global browser */

const manifest = browser.runtime.getManifest();
const extname = manifest.name;

async function notify(title, message = "", iconUrl = "icon.png") {
  const nid = await browser.notifications.create("" + Date.now(), {
    type: "basic",
    iconUrl,
    title,
    message,
  });

  setTimeout(() => {
    browser.notifications.clear("" + nid);
  }, 3000);
}

browser.menus.create({
  title: extname,
  contexts: ["link", "image", "video"],
  onclick: (info) => {
    const url = info.srcUrl || info.linkUrl;
    if (typeof url !== "string" || !url.startsWith("http")) {
      notify(extname, "Invalid URL");
      return;
    }

    //https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/downloads/download
    browser.downloads.download({
      url,
      saveAs: false,
      conflictAction: "uniquify",
    });
  },
});

/* global browser */

// tabId => dataURI
let tempData = new Map();
/*
function notify(title, message = "", iconUrl = "icon.png") {
  try {
    const nid = browser.notifications.create("" + Date.now(), {
      type: "basic",
      iconUrl,
      title,
      message,
    });
    if (nid > -1) {
      setTimeout(() => {
        browser.notifications.clear(nid);
      }, 2000);
    }
  } catch (e) {
    // noop
  }
}
*/

browser.menus.create({
  title: "Copy Video Frame",
  contexts: ["video"],
  onclick: async (info, tab) => {
    try {
      // first we get the <video>
      await browser.tabs.executeScript(tab.id, {
        frameId: info.frameId,
        code: `var vidEl = browser.menus.getTargetElement(${info.targetElementId})`,
      });
      // then we get the video coords + size (x,y,width,height)
      let elBrect = await browser.tabs.executeScript(tab.id, {
        frameId: info.frameId,
        file: "getElBRect.js",
      });
      elBrect = elBrect[0];
      // then we capture visible area of the video
      const dataURI = await browser.tabs.captureVisibleTab(tab.windowId, {
        rect: elBrect,
      });

      tempData.set(tab.id, dataURI);

      //DATAURI = dataURI;
      //const blob = await (await fetch(dataURI)).blob();
      /*
      await navigator.clipboard.write([
        new ClipboardItem({
          "image/png": blob,
        }),
      ]);
      notify("Copy Video Frame", "Image in clipboard\n(Insert with CTRL+V)");
        */

      //const objurl = URL.createObjectURL(blob, { type: "image/png" });

      browser.tabs.create({
        active: true,
        url: "show.html?tabId=" + tab.id,
      });
    } catch (e) {
      console.error(e);
      //notify("Copy Video Frame", e.toString());
    }
  },
});

browser.runtime.onMessage.addListener((data, sender) => {
  console.debug(data);
  if (data.tabId) {
    return Promise.resolve(tempData.get(data.tabId));
  }
  return false;
});

function handleRemoved(tabId, removeInfo) {
  if (tempData.has(tabId)) {
    tempData.delete(tabId);
  }
}

browser.tabs.onRemoved.addListener(handleRemoved);

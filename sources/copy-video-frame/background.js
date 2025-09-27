/* global browser */

const manifest = browser.runtime.getManifest();
const extname = manifest.name;

let tempData = new Map();

let audioElement = new Audio();
audioElement.src = "shutter.mp3";

// tabId => dataURI

async function show_error(message = "") {
  browser.windows.create({
    url: "show.html?error=" + encodeURIComponent(message),
    type: "popup",
    width: 640,
    height: 240,
  });
}

browser.menus.create({
  title: extname,
  contexts: ["video"],
  onclick: async (info, tab) => {
    try {
      const vidElrestricted = (
        await browser.tabs.executeScript(tab.id, {
          frameId: info.frameId,
          // 1. identify the video Element
          // 2. hide controls for capture
          // 2. lets see if we are dealing with restricted content
          code: `var vidEl = browser.menus.getTargetElement(${info.targetElementId});
var controlsStatus = vidEl.controls;
if(controlsStatus === true){
    vidEl.controls = false;
}
var restricted = vidEl.mediaKeys !== null;
if(!restricted){
    try {
        let canvas = document.createElement('canvas');
        canvas.width = vidEl.videoWidth;
        canvas.height = vidEl.videoHeight;
        let context = canvas.getContext('2d');
        context.drawImage(vidEl, 0, 0, vidEl.videoWidth, vidEl.videoHeight);
        browser.runtime.sendMessage({ "dataURI": canvas.toDataURL(), "width": vidEl.videoWidth, "height": vidEl.videoHeight });

if(controlsStatus === true){
    vidEl.controls = true;
}
    }catch(e){
        restricted = true;
    }
}
restricted;
`,
        })
      )[0];

      if (vidElrestricted) {
        // FALLBACK:
        // since the content is restricted we could give up and show an error
        // but since we are already here, lets try and give the user at least something
        // if thats not what he wants, he can discard it just as an error message

        // get video coords + size (x,y,width,height)
        let elBrect = await browser.tabs.executeScript(tab.id, {
          frameId: info.frameId,
          file: "getElBRect.js",
        });
        elBrect = elBrect[0];
        // then we capture visible area of the video
        const dataURI = await browser.tabs.captureVisibleTab(tab.windowId, {
          rect: elBrect,
        });

        // save the data
        tempData.set(tab.id, {
          data: dataURI,
          width: elBrect.width,
          height: elBrect.height,
        });
      }

      // if we have the clipboardWrite permission, we copy into the clipboard
      if (
        await browser.permissions.contains({
          permissions: ["clipboardWrite"],
        })
      ) {
        const blob = await (await fetch(tempData.get(tab.id).data)).blob();
        await navigator.clipboard.write([
          new ClipboardItem({
            "image/png": blob,
          }),
        ]);
      } else {
        // if we dont have the clipbordWrite permission, we open the image in a window
        setTimeout(() => {
          browser.windows.create({
            url: "show.html?tabId=" + tab.id,
            type: "popup",
            width: parseInt(tempData.get(tab.id).width + 0.5),
            height: parseInt(tempData.get(tab.id).height + 0.5),
          });
        }, 750);
      }
      // success feedback
      audioElement.play();
    } catch (e) {
      console.error(e);
      show_error(e.toString());
    }

    // unhide controls
    browser.tabs.executeScript(tab.id, {
      frameId: info.frameId,
      code: `
if(controlsStatus === true){
    vidEl.controls = true;
}
`,
    });
  },
});

browser.runtime.onMessage.addListener((data, sender) => {
  if (data.dataURI) {
    tempData.set(sender.tab.id, {
      data: data.dataURI,
      width: data.width,
      height: data.height,
    });
    return;
  }
  if (data.tabId) {
    return Promise.resolve(tempData.get(data.tabId));
  }
  return false;
});

browser.tabs.onRemoved.addListener((tabId, removeInfo) => {
  if (tempData.has(tabId)) {
    tempData.delete(tabId);
  }
});

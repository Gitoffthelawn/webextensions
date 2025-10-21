/* global browser */

async function captureTab(tabId, y, width, height) {
  let config = {
    format: "jpeg",
    rect: {
      x: 0, // fixed
      y,
      width,
      height,
    },
    quality: 90, // only for jpeg
  };
  return browser.tabs.captureTab(tabId, config);
}

function sanitizeFilename(rawName) {
  // Replace illegal characters:
  //    - Windows/macOS/Linux illegal symbols
  //    - Unicode control characters (U+0000‑U+001F, U+007F‑U+009F)
  const illegal = /[\\\/:*?"<>|[\x00-\x1F\x7F-\x9F]/g;
  name = rawName.replace(illegal, "_");

  // Collapse repeated underscores / spaces / dots
  name = name.replace(/[\s]+/g, "_");
  name = name.replace(/[_]+/g, "_");

  // Enforce max byte length (255 bytes safe for most filesystems)
  const MAX_BYTES = 255;
  const encoder = new TextEncoder();
  if (encoder.encode(name).length > MAX_BYTES) {
    const extIdx = name.lastIndexOf(".");
    const ext = name.slice(extIdx);
    const allowed = MAX_BYTES - encoder.encode(ext).length;
    const truncated = name.slice(0, allowed);
    name = truncated + ext;
  }
  return name;
}

function saveAs(tabTitle, tabURL, linkURL, extension) {
  let dlfilename = getTimeStampStr() + " " + tabTitle + " " + tabURL;
  dlfilename = dlfilename.replaceAll(".", "_");
  dlfilename = dlfilename + "." + extension;
  dlfilename = sanitizeFilename(dlfilename);

  const a = document.createElement("a");
  a.href = linkURL;
  a.download = dlfilename;
  document.body.appendChild(a);

  // handed over to the download manger
  a.click(); //

  if (extension === "cbz") {
    // should be ok to delete the pointer now
    setTimeout(() => URL.revokeObjectURL(linkURL), 10000);
  }
}

function getTimeStampStr() {
  const d = new Date();
  let ts = "";
  [
    d.getFullYear(),
    d.getMonth() + 1,
    d.getDate() + 1,
    d.getHours(),
    d.getMinutes(),
    d.getSeconds(),
  ].forEach((t, i) => {
    ts = ts + (i !== 3 ? "-" : "_") + (t < 10 ? "0" : "") + t;
  });
  return ts.substring(1);
}

let processingIntervalId = null;

async function start_processing() {
  browser.browserAction.disable();
  clearInterval(processingIntervalId);
  processingIntervalId = setInterval(async () => {
    const aframes = "▖▘▝▗";
    let txt = await browser.browserAction.getBadgeText({});
    let tmp = aframes.indexOf(txt);
    if (tmp > -1 && tmp < aframes.length - 1) {
      browser.browserAction.setBadgeText({ text: aframes[tmp + 1] });
    } else {
      browser.browserAction.setBadgeText({ text: aframes[0] });
    }
  }, 500);
}

function stop_processing() {
  clearInterval(processingIntervalId);
  browser.browserAction.setBadgeText({ text: "+" });
  browser.browserAction.enable();
}

async function onBAClicked(tab) {
  start_processing();

  const stepHeight = 10000;

  let tmp = "";

  try {
    tmp = await browser.tabs.executeScript(tab.id, {
      code: `
    (() => {
        const body = document.body;
        const html = document.documentElement;
        const h = Math.max( body.scrollHeight, body.offsetHeight,  html.clientHeight, html.scrollHeight, html.offsetHeight );
        const w = Math.max( body.scrollWidth, body.offsetWidth,  html.clientWidth, html.scrollWidth, html.offsetWidth );
        return {"width": w, "height": h };
    })()`,
    });

    if (tmp.length < 1) {
      throw "Error: failed to get page dimensions";
    }
    // executeScript returns array with first element as the result
    tmp = tmp[0];

    let dataURI = "";

    if (tmp.height <= stepHeight) {
      // only generate one image
      dataURI = await captureTab(tab.id, 0, tmp.width, tmp.height);
      saveAs(tab.title, tab.url, dataURI, "jpg");
    } else {
      // generate a set of images
      let zip = new JSZip();
      let i = 1;
      let y_offset = 0;
      while (tmp.height > y_offset) {
        dataURI = await captureTab(
          tab.id,
          y_offset,
          tmp.width,
          tmp.height > y_offset + stepHeight
            ? stepHeight
            : tmp.height - y_offset,
        );

        y_offset = y_offset + stepHeight;

        const blob = await fetch(dataURI).then((r) => r.blob());
        zip.file(i + ".jpg", blob, { binary: true });
        i++;
      }

      const zipblob = await zip.generateAsync({ type: "blob" });
      const zipobjurl = window.URL.createObjectURL(zipblob);

      saveAs(tab.title, tab.url, zipobjurl, "cbz");
    }
  } catch (e) {
    console.error(e);
  }
  stop_processing();
}

browser.browserAction.onClicked.addListener(onBAClicked);
browser.browserAction.setBadgeBackgroundColor({ color: "lightgray" });
browser.browserAction.setBadgeText({ text: "+" });

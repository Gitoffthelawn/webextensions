/* global browser, JSZip */

const STEP_HEIGHT = 10000;
const BADGE_FRAMES = "▖▘▝▗";
const IMAGE_FORMAT = "jpeg";
const IMAGE_QUALITY = 90;

// conservative estimate for “bytes per pixel” for the capture pipeline
// (JPEG encoding doesn’t help with the underlying render surface size)
const BYTES_PER_PIXEL_EST = 4;

// Firefox canvas limits (per-dimension + total allocated bytes)
const MAX_CANVAS_DIM = 32766; // keep safely below 32767
const MAX_ALLOCATED_BYTES = 500_000_000; // limit

function needsCbzFallback(width, height) {
  const tooBigByDimension = width > MAX_CANVAS_DIM || height > MAX_CANVAS_DIM;

  const tooBigByAllocatedSize =
    width * height * BYTES_PER_PIXEL_EST > MAX_ALLOCATED_BYTES;

  return tooBigByDimension || tooBigByAllocatedSize;
}

let processingIntervalId = null;

function startProcessing() {
  browser.browserAction.disable();
  if (processingIntervalId) {
    clearInterval(processingIntervalId);
  }

  processingIntervalId = setInterval(async () => {
    try {
      const txt = await browser.browserAction.getBadgeText({});
      const idx = BADGE_FRAMES.indexOf(txt);
      const next =
        idx >= 0 && idx < BADGE_FRAMES.length - 1
          ? BADGE_FRAMES[idx + 1]
          : BADGE_FRAMES[0];
      browser.browserAction.setBadgeText({ text: next });
    } catch {
      browser.browserAction.setBadgeText({ text: BADGE_FRAMES[0] });
    }
  }, 500);
}

function stopProcessing() {
  if (processingIntervalId) {
    clearInterval(processingIntervalId);
  }
  processingIntervalId = null;
  browser.browserAction.setBadgeText({ text: "+" });
  browser.browserAction.enable();
}

async function captureTab(tabId, y, width, height) {
  return browser.tabs.captureTab(tabId, {
    format: IMAGE_FORMAT,
    quality: IMAGE_QUALITY,
    rect: { x: 0, y, width, height },
  });
}

function sanitizeFilename(rawName) {
  const illegal = /[\\\/:*?"<>|[\x00-\x1F\x7F-\x9F]/g;
  let name = rawName.replace(illegal, "_");

  name = name.replace(/[\s]+/g, "_");
  name = name.replace(/[_]+/g, "_");

  const MAX_BYTES = 255;
  const encoder = new TextEncoder();
  if (encoder.encode(name).length <= MAX_BYTES) {
    return name;
  }

  const dotIdx = name.lastIndexOf(".");
  const ext = dotIdx === -1 ? "" : name.slice(dotIdx);
  const base = dotIdx === -1 ? name : name.slice(0, dotIdx);

  const maxBaseBytes = MAX_BYTES - encoder.encode(ext).length;

  let truncated = "";
  for (const ch of base) {
    if (encoder.encode(truncated + ch).length > maxBaseBytes) {
      break;
    }
    truncated += ch;
  }
  return truncated + ext;
}

function getTimeStampStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const day = d.getDate();
  const hh = d.getHours();
  const mm = d.getMinutes();
  const ss = d.getSeconds();

  const pad2 = (n) => (n < 10 ? `0${n}` : `${n}`);
  // format: year-month-day_hour-minute-second
  return `${y}-${pad2(m)}-${pad2(day)}_${pad2(hh)}-${pad2(mm)}-${pad2(ss)}`;
}

async function saveAs(tabTitle, tabURL, linkURL, extension) {
  const filename = sanitizeFilename(
    `${getTimeStampStr()} ${tabTitle} ${tabURL}.${extension}`,
  );

  const download = await browser.downloads.download({
    url: linkURL,
    filename,
    conflictAction: "uniquify",
  });

  const downloadId = download.id;

  const cleanup = (changed) => {
    try {
      if (changed?.id !== downloadId) return;
      if (!changed?.state?.current) return;

      const s = changed.state.current;
      if (s === "complete" || s === "interrupted" || s === "cancelled") {
        browser.downloads.onChanged.removeListener(cleanup);
        URL.revokeObjectURL(linkURL);
      }
    } catch {
      /* ignore cleanup errors */
    }
  };
  browser.downloads.onChanged.addListener(cleanup);
}

async function getPageSize(tabId) {
  const res = await browser.tabs.executeScript(tabId, {
    code: `
      (() => {
        const doc = document.documentElement;
        const body = document.body;

        const scrollWidth = Math.max(doc.scrollWidth, body ? body.scrollWidth : 0);
        const scrollHeight = Math.max(doc.scrollHeight, body ? body.scrollHeight : 0);

        const clientWidth = doc.clientWidth || (body ? body.clientWidth : 0);
        const clientHeight = doc.clientHeight || (body ? body.clientHeight : 0);

        const offsetWidth = doc.offsetWidth || (body ? body.offsetWidth : 0);
        const offsetHeight = doc.offsetHeight || (body ? body.offsetHeight : 0);

        const width = Math.max(scrollWidth, clientWidth, offsetWidth);
        const height = Math.max(scrollHeight, clientHeight, offsetHeight);

        return { width, height };
      })()
    `,
  });

  const payload = Array.isArray(res) ? res[0] : res;

  if (
    !payload ||
    typeof payload.width !== "number" ||
    typeof payload.height !== "number"
  ) {
    throw new Error("failed to get page dimensions");
  }

  return payload;
}

async function dataURIToBlob(dataURI) {
  // Works for data: URIs returned by captureTab in most versions.
  const res = await fetch(dataURI);
  return res.blob();
}

async function captureChunkToJpegBlob(tabId, y, width, chunkHeight) {
  const dataURI = await captureTab(tabId, y, width, chunkHeight);
  return dataURIToBlob(dataURI);
}


function getChunking(height, width) {
  // Max chunk height allowed by the Firefox “allocated bytes” heuristic
  const maxByBytes = Math.floor(
    MAX_ALLOCATED_BYTES / (width * BYTES_PER_PIXEL_EST),
  );

  // Also respect the per-dimension cap
  const maxByDim = MAX_CANVAS_DIM - 1;

  const maxChunkHeight = Math.max(1, Math.min(maxByBytes, maxByDim));

  // Number of segments needed
  const segments = Math.ceil(height / maxChunkHeight);

  // Equal-ish chunk height (some chunks may be 1px taller)
  const chunkHeight = Math.ceil(height / segments);

  return { segments, chunkHeight };
}

async function onBAClicked(tab) {
  startProcessing();

  try {
    const { width, height } = await getPageSize(tab.id);

    if (!width || !height || width <= 0 || height <= 0)
      throw new Error("Invalid page dimensions");

    const needsSegmentation = needsCbzFallback(width, height);

    let extension;
    let blobOrObjUrl;

    if (!needsSegmentation) {
      extension = "jpg";
      const dataURI = await captureTab(tab.id, 0, width, height);
      blobOrObjUrl = await dataURIToBlob(dataURI);
    } else {
      // CBZ path
      extension = "cbz";
      const zip = new JSZip();

      const { chunkHeight } = getChunking(height, width);

      let i = 1;
      for (let y = 0; y < height; y += chunkHeight) {
        const curHeight = Math.min(chunkHeight, height - y);

        const dataURI = await captureTab(tab.id, y, width, curHeight);
        const blob = await dataURIToBlob(dataURI);

        zip.file(`${i}.jpg`, blob, { binary: true });
        i++;
      }

      blobOrObjUrl = await zip.generateAsync({ type: "blob" });
    }

    const objUrl = URL.createObjectURL(blobOrObjUrl);
    await saveAs(tab.title, tab.url, objUrl, extension);
  } finally {
    stopProcessing();
  }
}

browser.browserAction.onClicked.addListener(onBAClicked);
browser.browserAction.setBadgeBackgroundColor({ color: "lightgray" });
browser.browserAction.setBadgeText({ text: "+" });

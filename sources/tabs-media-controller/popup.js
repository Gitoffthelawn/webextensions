/* global browser */

const SVG_NS = "http://www.w3.org/2000/svg";

function svgEl(tag, attrs) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) {
    el.setAttribute(k, v);
  }
  return el;
}

// icon builders return a fresh <svg> node (DOM, not markup) each call
const ICON_BUILDERS = {
  play: () => {
    const s = svgEl("svg", { viewBox: "0 0 24 24" });
    s.appendChild(
      svgEl("polygon", { points: "6,4 20,12 6,20", fill: "currentColor" }),
    );
    return s;
  },
  pause: () => {
    const s = svgEl("svg", { viewBox: "0 0 24 24" });
    s.appendChild(
      svgEl("rect", {
        x: 5,
        y: 4,
        width: 5,
        height: 16,
        rx: 1,
        fill: "currentColor",
      }),
    );
    s.appendChild(
      svgEl("rect", {
        x: 14,
        y: 4,
        width: 5,
        height: 16,
        rx: 1,
        fill: "currentColor",
      }),
    );
    return s;
  },
  volume: () => {
    const s = svgEl("svg", {
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      "stroke-width": 2,
      "stroke-linecap": "round",
      "stroke-linejoin": "round",
    });
    s.appendChild(
      svgEl("path", {
        d: "M4 9v6h4l5 4V5L8 9H4z",
        fill: "currentColor",
        stroke: "none",
      }),
    );
    s.appendChild(svgEl("path", { d: "M16.5 8.5a5 5 0 0 1 0 7" }));
    s.appendChild(svgEl("path", { d: "M19 6a8.5 8.5 0 0 1 0 12" }));
    return s;
  },
  mute: () => {
    const s = svgEl("svg", {
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      "stroke-width": 2,
      "stroke-linecap": "round",
      "stroke-linejoin": "round",
    });
    s.appendChild(
      svgEl("path", {
        d: "M4 9v6h4l5 4V5L8 9H4z",
        fill: "currentColor",
        stroke: "none",
      }),
    );
    s.appendChild(svgEl("path", { d: "M16 9l5 6" }));
    s.appendChild(svgEl("path", { d: "M21 9l-5 6" }));
    return s;
  },
  focus: () => {
    const s = svgEl("svg", {
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      "stroke-width": 2,
      "stroke-linecap": "round",
    });
    s.appendChild(svgEl("circle", { cx: 12, cy: 12, r: 7 }));
    s.appendChild(svgEl("path", { d: "M12 2v4M12 18v4M2 12h4M18 12h4" }));
    return s;
  },
  chevron: () => {
    const s = svgEl("svg", {
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      "stroke-width": 2,
      "stroke-linecap": "round",
      "stroke-linejoin": "round",
    });
    s.appendChild(svgEl("path", { d: "M6 9l6 6 6-6" }));
    return s;
  },
  back: () => {
    const s = svgEl("svg", {
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      "stroke-width": 2,
      "stroke-linecap": "round",
      "stroke-linejoin": "round",
    });
    s.appendChild(svgEl("path", { d: "M15 6l-6 6 6 6" }));
    return s;
  },
};

// replaces a button's content with an icon (+ optional text label), using
// real DOM nodes throughout instead of innerHTML/outerHTML string assignment
function setButtonIcon(btn, name, label) {
  btn.replaceChildren(ICON_BUILDERS[name]());
  if (label) {
    let span = document.createElement("span");
    span.textContent = label;
    btn.appendChild(span);
  }
}

function formatTime(sec) {
  if (isNaN(sec) || sec < 0) {
    return "--:--";
  }
  sec = Math.floor(sec);
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m + ":" + String(s).padStart(2, "0");
}

async function getFromStorage(type, id, fallback) {
  let tmp = await browser.storage.local.get(id);
  return typeof tmp[id] === type ? tmp[id] : fallback;
}

const tablist = document.getElementById("tabs");

function addDataListToRange(numberArray, rangeEl, attachEl) {
  const datalistid =
    "rangeSteps" + Date.now() + Math.random().toString(16).slice(2);

  rangeEl.setAttribute("list", datalistid);
  let datalistEl = document.createElement("datalist");
  datalistEl.setAttribute("id", datalistid);

  numberArray.forEach((val) => {
    let opt = document.createElement("option");
    opt.innerText = val;
    datalistEl.appendChild(opt);
  });

  attachEl.appendChild(datalistEl);
}

// ---- full-popup detail view, built once and reused for whichever media
// element is currently open ----
const detailView = document.createElement("div");
detailView.id = "detailView";
detailView.hidden = true;
document.body.appendChild(detailView);

const detailHeader = document.createElement("div");
detailHeader.classList.add("detailHeader");
detailView.appendChild(detailHeader);

const detailBackBtn = document.createElement("button");
detailBackBtn.classList.add("detailBackBtn");
setButtonIcon(detailBackBtn, "back", "Back");
detailHeader.appendChild(detailBackBtn);

const detailTitle = document.createElement("span");
detailTitle.classList.add("detailTitle");
detailHeader.appendChild(detailTitle);

const detailContent = document.createElement("div");
detailContent.classList.add("detailContent");
detailView.appendChild(detailContent);

let openRecord = null;

function openDetail(record) {
  openRecord = record;
  detailTitle.textContent = record.title;
  detailContent.replaceChildren(record.detailNode);
  detailView.hidden = false;
  tablist.hidden = true;
}

function closeDetail() {
  openRecord = null;
  detailView.hidden = true;
  tablist.hidden = false;
}

detailBackBtn.onclick = () => closeDetail();

// every media element currently rendered, so the poll loop can update state
// without caring whether the row is collapsed or its detail view is open
let mediaRegistry = [];

// wires up a set of mute buttons (list row + detail view) that all reflect
// and control the same underlying media element
function wireMuteButtons(record, tab, eid, buttons) {
  const paint = () =>
    buttons.forEach((b) =>
      setButtonIcon(b, record.muteCmd === "mute" ? "mute" : "volume"),
    );
  paint();
  buttons.forEach((b) => {
    b.setAttribute("title", "mute / unmute element");
    b.onclick = (evt) => {
      evt.stopPropagation();
      browser.tabs.sendMessage(tab.id, { cmd: record.muteCmd, ids: [eid] });
      record.muteCmd = record.muteCmd === "mute" ? "unmute" : "mute";
      paint();
      record.lastInteraction = Date.now();
    };
  });
}

function wirePlayPauseButtons(record, tab, eid, buttons) {
  const paint = () => buttons.forEach((b) => setButtonIcon(b, record.playCmd));
  paint();
  buttons.forEach((b) => {
    b.setAttribute("title", "play / pause element");
    b.onclick = (evt) => {
      evt.stopPropagation();
      browser.tabs.sendMessage(tab.id, { cmd: record.playCmd, ids: [eid] });
      record.playCmd = record.playCmd === "play" ? "pause" : "play";
      paint();
      record.lastInteraction = Date.now();
    };
  });
}

function wireFocusButtons(tab, eid, buttons) {
  buttons.forEach((b) => {
    setButtonIcon(b, "focus");
    b.setAttribute("title", "scroll element into view");
    b.onclick = async (evt) => {
      evt.stopPropagation();
      await browser.windows.update(tab.windowId, { focused: true });
      await browser.tabs.highlight({
        windowId: tab.windowId,
        tabs: [tab.index],
      });
      await browser.tabs.sendMessage(tab.id, { cmd: "focus", id: eid });
    };
  });
}

// builds one media element: a compact always-visible row plus a detached
// "detail" panel that gets moved into the full-popup overlay when opened
function buildMediaElement(tab, url, e) {
  const record = {
    tabId: tab.id,
    eid: e.id,
    type: e.type,
    muteCmd: e.muted ? "unmute" : "mute",
    playCmd: e.playing ? "pause" : "play",
    lastInteraction: 0,
    title:
      (e.type === "video" ? "Video" : "Audio") +
      " — " +
      url.hostname.replace(/^www\./, ""),
  };

  // ---- compact row ----
  let elementRow = document.createElement("div");
  elementRow.classList.add("elementDiv");
  elementRow.setAttribute("eid", e.id);
  elementRow.setAttribute("tid", tab.id);

  let summary = document.createElement("div");
  summary.classList.add("elementSummary");
  summary.setAttribute("title", "open full controls");
  summary.onclick = () => openDetail(record);
  elementRow.appendChild(summary);

  let actionRowEl = document.createElement("div");
  actionRowEl.classList.add("elementActionRow");
  summary.appendChild(actionRowEl);

  let focusbtn = document.createElement("button");
  focusbtn.classList.add("elementFocusBtn");
  actionRowEl.appendChild(focusbtn);

  let mutebtn = document.createElement("button");
  mutebtn.classList.add("elementMuteBtn");
  actionRowEl.appendChild(mutebtn);

  let playpausebtn = document.createElement("button");
  playpausebtn.classList.add("elementPlayPauseBtn");
  actionRowEl.appendChild(playpausebtn);

  let info = document.createElement("span");
  info.classList.add("elementInfo");
  info.textContent =
    (e.type === "video" ? "video" : "audio") + " · " + formatTime(e.duration);
  summary.appendChild(info);
  record.infoSpan = info;

  let chevron = document.createElement("span");
  chevron.classList.add("openChevron");
  chevron.appendChild(ICON_BUILDERS.chevron());
  summary.appendChild(chevron);

  // ---- detail panel (not attached anywhere until opened) ----
  let detailWrap = document.createElement("div");
  detailWrap.classList.add("detailBody");

  let previewBox = document.createElement("div");
  previewBox.classList.add("previewBox", "previewBoxLarge");
  previewBox.setAttribute("title", "picture-in-picture");
  detailWrap.appendChild(previewBox);

  let previewImg = document.createElement("img");
  previewImg.src = e.poster || "audio.png";
  previewImg.classList.add("previewImg");
  previewBox.appendChild(previewImg);
  previewBox.onclick = async () => {
    await browser.tabs.sendMessage(tab.id, { cmd: "pip", ids: [e.id] });
  };
  // size the box itself to the media's real aspect ratio (from the loaded
  // thumbnail's natural dimensions) instead of always being a fixed shape —
  // object-fit alone only letterboxes inside whatever shape the box already is
  previewImg.addEventListener("load", () => {
    if (previewImg.naturalWidth && previewImg.naturalHeight) {
      previewBox.style.aspectRatio =
        previewImg.naturalWidth + " / " + previewImg.naturalHeight;
    }
  });
  record.previewImg = previewImg;

  let detailActionRow = document.createElement("div");
  detailActionRow.classList.add("elementActionRow", "detailActionRow");
  detailWrap.appendChild(detailActionRow);

  let dFocus = document.createElement("button");
  dFocus.classList.add("elementFocusBtn");
  detailActionRow.appendChild(dFocus);

  let dMute = document.createElement("button");
  dMute.classList.add("elementMuteBtn");
  detailActionRow.appendChild(dMute);

  let dPlay = document.createElement("button");
  dPlay.classList.add("elementPlayPauseBtn");
  detailActionRow.appendChild(dPlay);

  wireFocusButtons(tab, e.id, [focusbtn, dFocus]);
  wireMuteButtons(record, tab, e.id, [mutebtn, dMute]);
  wirePlayPauseButtons(record, tab, e.id, [playpausebtn, dPlay]);

  let controls = document.createElement("div");
  controls.classList.add("elementControlsDiv", "detailControlsDiv");
  detailWrap.appendChild(controls);

  // playback rate
  let rateRow = document.createElement("div");
  rateRow.classList.add("sliderRow");
  controls.appendChild(rateRow);

  let playbackRatebtn = document.createElement("input");
  playbackRatebtn.setAttribute("type", "range");
  playbackRatebtn.setAttribute("min", "25");
  playbackRatebtn.setAttribute("max", "175");
  playbackRatebtn.setAttribute("step", "1");
  playbackRatebtn.setAttribute("value", e.playbackRate * 100);
  playbackRatebtn.classList.add("elementPlaybackRateBtn");
  playbackRatebtn.setAttribute("title", "playback rate");
  addDataListToRange(
    [25, 50, 75, 100, 125, 150, 175],
    playbackRatebtn,
    rateRow,
  );
  rateRow.appendChild(playbackRatebtn);

  let rateLabel = document.createElement("span");
  rateLabel.classList.add("sliderLabel");
  rateLabel.textContent = e.playbackRate.toFixed(2) + "x";
  rateRow.appendChild(rateLabel);

  playbackRatebtn.addEventListener("input", (evt) => {
    const rate = evt.target.value / 100;
    browser.tabs.sendMessage(tab.id, {
      cmd: "playbackRate",
      id: e.id,
      playbackRate: rate,
    });
    rateLabel.textContent = rate.toFixed(2) + "x";
  });

  // volume
  let volRow = document.createElement("div");
  volRow.classList.add("sliderRow");
  controls.appendChild(volRow);

  let volumebtn = document.createElement("input");
  volumebtn.setAttribute("type", "range");
  volumebtn.setAttribute("min", "0");
  volumebtn.setAttribute("max", "100");
  volumebtn.setAttribute("step", "1");
  volumebtn.setAttribute("value", e.volume * 100);
  volumebtn.classList.add("elementVolumeBtn");
  volumebtn.setAttribute("title", "volume");
  addDataListToRange([0, 25, 50, 75, 100], volumebtn, volRow);
  volRow.appendChild(volumebtn);
  record.volBtn = volumebtn;

  let volLabel = document.createElement("span");
  volLabel.classList.add("sliderLabel");
  volLabel.textContent = Math.round(e.volume * 100) + "%";
  volRow.appendChild(volLabel);
  record.volLabel = volLabel;

  volumebtn.addEventListener("input", (evt) => {
    const vol = evt.target.value / 100;
    browser.tabs.sendMessage(tab.id, { cmd: "volume", id: e.id, volume: vol });
    volLabel.textContent = Math.round(vol * 100) + "%";
  });

  // current time
  let timeRow = document.createElement("div");
  timeRow.classList.add("sliderRow");
  controls.appendChild(timeRow);

  let currentTimebtn = document.createElement("input");
  currentTimebtn.setAttribute("type", "range");
  currentTimebtn.setAttribute("min", "0");
  currentTimebtn.setAttribute("max", "" + parseInt(e.duration));
  if (e.duration === -1 || isNaN(e.duration)) {
    currentTimebtn.setAttribute("disabled", "disabled");
  }
  currentTimebtn.setAttribute("value", e.currentTime);
  currentTimebtn.classList.add("elementTimeBtn");
  currentTimebtn.setAttribute("title", "playback position");

  addDataListToRange(
    [
      0,
      parseInt(e.duration) / 4,
      parseInt(e.duration) / 2,
      (parseInt(e.duration) / 4) * 3,
      parseInt(e.duration),
    ],
    currentTimebtn,
    timeRow,
  );
  timeRow.appendChild(currentTimebtn);
  record.timeBtn = currentTimebtn;

  let timeLabel = document.createElement("span");
  timeLabel.classList.add("sliderLabel");
  timeLabel.textContent =
    formatTime(e.currentTime) + " / " + formatTime(e.duration);
  timeRow.appendChild(timeLabel);
  record.timeLabel = timeLabel;

  currentTimebtn.addEventListener("input", (evt) => {
    const t = parseInt(evt.target.value);
    browser.tabs.sendMessage(tab.id, {
      cmd: "currentTime",
      id: e.id,
      currentTime: t,
    });
    timeLabel.textContent = formatTime(t) + " / " + formatTime(e.duration);
  });

  record.detailNode = detailWrap;
  record.row = elementRow;
  mediaRegistry.push(record);
  return elementRow;
}

async function queryTabs() {
  mediaRegistry = [];
  closeDetail();

  const tabs = await browser.tabs.query({
    url: ["<all_urls>"],
    discarded: false,
    status: "complete",
  });

  // lets move the audible tabs to the front/top
  tabs.sort((a, b) => {
    if (a.audible && !b.audible) {
      return -1;
    }
    if (b.audible && !a.audible) {
      return 1;
    }
    return 0;
  });

  // first pass: find out which tabs actually have media, keeping the
  // audible-first order established above
  let tabEntries = [];
  for (const tab of tabs) {
    try {
      const res = await browser.tabs.sendMessage(tab.id, { cmd: "queryAll" });
      if (res && res.length > 0) {
        res.sort((a, b) => {
          if (a.playing && !b.playing) {
            return -1;
          }
          if (b.playing && !a.playing) {
            return 1;
          }
          if (a.playing && b.playing) {
            if (!a.muted && b.muted) {
              return -1;
            }
            if (a.muted && !b.muted) {
              return 1;
            }
          }
          return 0;
        });
        tabEntries.push({ tab, res, url: new URL(tab.url) });
      }
    } catch (e) {
      console.error("tab ", tab.index, e);
    }
  }

  if (tabEntries.length === 0) {
    let empty = document.createElement("div");
    empty.classList.add("emptyState");
    empty.textContent = "No media playing right now";
    tablist.replaceChildren(empty);
    tablist.focus();
    return;
  }

  tablist.textContent = "";

  // group tabs by origin, preserving the audible-first order they were found in
  let siteOrder = [];
  let siteGroups = new Map();
  for (const entry of tabEntries) {
    const origin = entry.url.origin;
    if (!siteGroups.has(origin)) {
      siteGroups.set(origin, []);
      siteOrder.push(origin);
    }
    siteGroups.get(origin).push(entry);
  }

  for (const origin of siteOrder) {
    const entries = siteGroups.get(origin);
    const firstUrl = entries[0].url;

    let siteDiv = document.createElement("div");
    siteDiv.classList.add("siteDiv");
    tablist.appendChild(siteDiv);

    // site header: favicon, then site-wide actions, then the hostname
    let headerRow = document.createElement("div");
    headerRow.classList.add("tabHeaderRow");
    siteDiv.appendChild(headerRow);

    const favIconUrl = entries[0].tab.favIconUrl || "";
    if (favIconUrl) {
      let favImg = document.createElement("img");
      favImg.classList.add("tabFavImg");
      favImg.src = favIconUrl;
      headerRow.appendChild(favImg);
    }

    let muteSiteBtn = document.createElement("button");
    setButtonIcon(muteSiteBtn, "mute", "site");
    muteSiteBtn.classList.add("siteMuteBtn");
    muteSiteBtn.setAttribute("title", "mute media on every tab from this site");
    headerRow.appendChild(muteSiteBtn);
    muteSiteBtn.onclick = () => {
      for (const entry of entries) {
        browser.tabs.sendMessage(entry.tab.id, { cmd: "muteAll" });
      }
    };

    let pauseSiteBtn = document.createElement("button");
    setButtonIcon(pauseSiteBtn, "pause", "site");
    pauseSiteBtn.classList.add("sitePauseBtn");
    pauseSiteBtn.setAttribute(
      "title",
      "pause media on every tab from this site",
    );
    headerRow.appendChild(pauseSiteBtn);
    pauseSiteBtn.onclick = () => {
      for (const entry of entries) {
        browser.tabs.sendMessage(entry.tab.id, { cmd: "pauseAll" });
      }
    };

    let hostSpan = document.createElement("span");
    hostSpan.classList.add("siteLabel");
    hostSpan.textContent = firstUrl.hostname.replace(/^www\./, "");
    headerRow.appendChild(hostSpan);

    // one sub-group per tab on this site
    for (const entry of entries) {
      const { tab, res, url } = entry;

      let tabGroup = document.createElement("div");
      tabGroup.classList.add("tabGroup");
      siteDiv.appendChild(tabGroup);

      let tabRow = document.createElement("div");
      tabRow.classList.add("tabSubRow");
      tabGroup.appendChild(tabRow);

      let tablink = document.createElement("button");
      tablink.classList.add("tabFocusBtn", "tabSubFocusBtn");
      tablink.setAttribute("title", "focus tab");
      let tablinkLabel = document.createElement("span");
      tablinkLabel.textContent = "#" + tab.index + " " + tab.title;
      tablink.appendChild(tablinkLabel);
      tablink.onclick = () => {
        browser.tabs.highlight({ windowId: tab.windowId, tabs: [tab.index] });
      };
      tabRow.appendChild(tablink);

      for (const e of res) {
        tabGroup.appendChild(buildMediaElement(tab, url, e));
      }
    }
  }

  tablist.focus();
}

(async () => {
  // default.css is the single source of truth for the default look;
  // a user-edited stylesheet in storage (set via the options page) overrides it.
  let cssText = await getFromStorage("string", "styles", null);
  if (!cssText) {
    const resp = await fetch(browser.runtime.getURL("default.css"));
    cssText = await resp.text();
  }
  let styleSheet = document.createElement("style");
  styleSheet.innerText = cssText;
  document.head.appendChild(styleSheet);

  queryTabs();

  let pollRunning = false;
  setInterval(async () => {
    if (pollRunning) {
      return;
    }
    pollRunning = true;
    try {
      for (const rec of mediaRegistry) {
        // capture this *before* the round-trip: a response only reflects
        // state as of when we asked, so if a click landed after that, this
        // reply is stale with respect to that click and must be dropped —
        // regardless of how long the round-trip itself took
        const requestedAt = Date.now();
        let newdata;
        try {
          newdata = await browser.tabs.sendMessage(rec.tabId, {
            cmd: "query",
            id: rec.eid,
            // no point decoding a video frame for a row that isn't even open
            skipPoster: openRecord !== rec,
          });
        } catch (e) {
          continue;
        }
        if (!newdata) {
          continue;
        }

        rec.infoSpan.textContent =
          rec.type + " · " + formatTime(newdata.duration);

        if (openRecord === rec) {
          if (newdata.poster) {
            rec.previewImg.src = newdata.poster;
          }
          // don't yank a slider out from under the user while they're dragging it
          if (document.activeElement !== rec.volBtn) {
            rec.volBtn.value = newdata.volume * 100;
            rec.volLabel.textContent = Math.round(newdata.volume * 100) + "%";
          }
          if (document.activeElement !== rec.timeBtn) {
            // duration may not have been known yet when the slider was first
            // built (video metadata loads asynchronously) — keep max in sync
            // or its value gets silently clamped against a stale/default max
            if (isFinite(newdata.duration) && newdata.duration > 0) {
              const durInt = Math.floor(newdata.duration);
              if (Number(rec.timeBtn.max) !== durInt) {
                rec.timeBtn.max = durInt;
              }
              rec.timeBtn.disabled = false;
            } else {
              rec.timeBtn.disabled = true;
            }
            rec.timeBtn.value = newdata.currentTime;
            rec.timeLabel.textContent =
              formatTime(newdata.currentTime) +
              " / " +
              formatTime(newdata.duration);
          }
        }

        // don't clobber a just-clicked button with a reply that predates the click
        if (rec.lastInteraction < requestedAt) {
          rec.muteCmd = newdata.muted ? "unmute" : "mute";
          rec.playCmd = newdata.playing ? "pause" : "play";
          rec.row
            .querySelectorAll(".elementMuteBtn")
            .forEach((b) =>
              setButtonIcon(b, rec.muteCmd === "mute" ? "mute" : "volume"),
            );
          rec.row
            .querySelectorAll(".elementPlayPauseBtn")
            .forEach((b) => setButtonIcon(b, rec.playCmd));
          if (rec.detailNode) {
            rec.detailNode
              .querySelectorAll(".elementMuteBtn")
              .forEach((b) =>
                setButtonIcon(b, rec.muteCmd === "mute" ? "mute" : "volume"),
              );
            rec.detailNode
              .querySelectorAll(".elementPlayPauseBtn")
              .forEach((b) => setButtonIcon(b, rec.playCmd));
          }
        }
      }
    } finally {
      pollRunning = false;
    }
  }, 150);
})();

function isElementInViewport(el) {
  var rect = el.getBoundingClientRect();

  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <=
      (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
  );
}

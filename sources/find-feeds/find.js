/* global browser */

function openFeedInTab(evt) {
  evt.stopPropagation();
  evt.preventDefault();
  browser.tabs.create({
    active: true,
    url: evt.currentTarget.href,
  });
}

function copyFeedUrl(evt, url, btn) {
  evt.stopPropagation();
  evt.preventDefault();
  navigator.clipboard
    .writeText(url)
    .then(() => {
      const original = btn.textContent;
      btn.textContent = "Copied";
      setTimeout(() => {
        btn.textContent = original;
      }, 1200);
    })
    .catch(() => {
      // clipboard API unavailable/blocked; nothing more we can do here
    });
}

function decodeQueryParam(p) {
  return decodeURIComponent(p.replace(/\+/g, " "));
}

function addFeedRow(obj) {
  const tbl = document.getElementById("feedlist");

  const li = document.createElement("li");

  const badge = document.createElement("span");
  badge.className = "type-badge " + (obj.type === "json" ? "json" : "xml");
  badge.textContent = obj.type;

  const link = document.createElement("a");
  link.className = "feed-link";
  link.href = obj.url;
  link.textContent = obj.url;
  link.title = obj.url;
  link.addEventListener("click", openFeedInTab, false);

  const copyBtn = document.createElement("button");
  copyBtn.type = "button";
  copyBtn.className = "copy-btn";
  copyBtn.textContent = "Copy";
  copyBtn.addEventListener(
    "click",
    (evt) => copyFeedUrl(evt, obj.url, copyBtn),
    false,
  );

  li.appendChild(badge);
  li.appendChild(link);
  li.appendChild(copyBtn);
  tbl.appendChild(li);
}

async function init() {
  const msg = document.getElementById("msg");
  const target = document.getElementById("target");
  const progress = document.getElementById("urls2checkProgress");

  browser.runtime.onMessage.addListener((data) => {
    if (data.nburls2check) {
      progress.setAttribute("max", parseInt(data.nburls2check));
    }
    if (data.urls2checkProgress) {
      progress.setAttribute("value", data.urls2checkProgress);
      if (data.feed !== false) {
        addFeedRow(data.feed);
      }
    }
  });

  const popupsearchparams = new URL(document.location.href).searchParams;
  const pageUrl = decodeQueryParam(popupsearchparams.get("url"));

  msg.textContent = "Looking for feed-like URLs";
  target.textContent = pageUrl;
  document.title = pageUrl;

  const found = await browser.runtime.sendMessage({
    tabId: popupsearchparams.get("tabId"),
    url: pageUrl,
  });

  progress.style.display = "none";

  if (found < 1) {
    msg.textContent = "No feed-like URLs found on";
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "Nothing matched the built-in or custom detectors.";
    document.getElementById("feedlist").after(empty);
    return;
  }
  msg.textContent =
    found + (found === 1 ? " feed-like URL found on" : " feed-like URLs found on");
}

init();

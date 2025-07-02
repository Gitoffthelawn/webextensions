/* global browser */

function openFeedInTab(evt) {
  evt.stopPropagation();
  evt.preventDefault();
  browser.tabs.create({
    active: true,
    url: evt.target.href,
  });
}

function decodeQueryParam(p) {
  return decodeURIComponent(p.replace(/\+/g, " "));
}

async function init() {
  const tbl = document.getElementById("feedlist");
  const msg = document.getElementById("msg");

  // update progress
  await browser.runtime.onMessage.addListener((data, sender) => {
    if (data.nburls2check) {
      document
        .getElementById("urls2checkProgress")
        .setAttribute("max", parseInt(data.nburls2check));
    }
    if (data.urls2checkProgress) {
      document
        .getElementById("urls2checkProgress")
        .setAttribute("value", data.urls2checkProgress);
      if (data.feed !== false) {
        const obj = data.feed;

        const tr = tbl.insertRow();
        const a1 = document.createElement("a");
        //const abbr = document.createElement("abbr");
        const abbrType = document.createElement("abbr");
        //abbr.setAttribute("title", obj.url);
        abbrType.setAttribute("title", obj.type);
        abbrType.textContent = obj.type === "json" ? "{;}" : "</>";

        a1.textContent = obj.url;
        //a1.appendChild(abbr);
        a1.title = obj.type;
        a1.href = obj.url;
        a1.addEventListener("click", openFeedInTab, false);

        //var td1 = tr.insertCell();
        //td1.textContent = idCounter;

        //var td3 = tr.insertCell();
        //td3.textContent = obj.type;
        //td3.appendChild(abbrType);

        var td2 = tr.insertCell();
        td2.appendChild(a1);

        //var td4 = tr.insertCell();
        //td4.textContent = "🔍";
        //td4.title = obj.url;
        //td4.href = obj.url;
        //td4.addEventListener("click", openFeedInTab, false);

        //var td5 = tr.insertCell();
        //td5.appendChild(cpybtn);

        //idCounter++;
      }
    }
  });

  const popupsearchparams = new URL(document.location.href).searchParams;

  msg.textContent =
    "Looking for feed-like URLs on " +
    decodeQueryParam(popupsearchparams.get("url"));

  let objs_length = await browser.runtime.sendMessage({
    tabId: popupsearchparams.get("tabId"),
    url: decodeQueryParam(popupsearchparams.get("url")),
  });
  //
  if (objs_length < 1) {
    msg.textContent =
      "No feed-like URLs found on " +
      decodeQueryParam(popupsearchparams.get("url"));
    return;
  }
  msg.textContent =
    objs_length +
    " feed-like URLs found on " +
    decodeQueryParam(popupsearchparams.get("url"));
}

init();

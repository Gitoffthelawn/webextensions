(async () => {
  async function getFromStorage(type, id, fallback) {
    let tmp = await browser.storage.local.get(id);
    return typeof tmp[id] === type ? tmp[id] : fallback;
  }

  const fallback_styles = (async () => {
    let tmp = await fetch(browser.runtime.getURL("popup.css"));
    return await tmp.text();
  })();

  const styles = await getFromStorage("string", "styles", fallback_styles);

  let styleSheet = document.createElement("style");
  styleSheet.innerText = styles;
  document.head.appendChild(styleSheet);

  const template = document.getElementById("li_template");
  const elements = new Set();
  // const collator = new Intl.Collator();
  const styleElementHidden = "none";
  const styleElementDisplay = "block";

  let last_searchStr = "";

  const tabs = await browser.tabs.query({
    currentWindow: true,
    url: ["<all_urls>"],
    status: "complete",
    discarded: false,
  });

  async function setToStorage(id, value) {
    let obj = {};
    obj[id] = value;
    return browser.storage.local.set(obj);
  }

  function buildHitList(hits, regexmode, caseSensitive, searchedVal) {
    const ul = document.createElement("ul");
    ul.style.fontSize = "0.8em";
    hits.forEach((hit) => {
      const li = document.createElement("li");
      const matchText = regexmode
        ? hit.mid
        : caseSensitive
          ? searchedVal
          : searchedVal.toUpperCase();
      // The exact on-page position was computed by content.js in the same
      // pass that found this match, so jumping to it later needs no second
      // search of the page — just this stored rect.
      li.dataset.matchText = matchText;
      li.__matchRect = hit.rect || null;

      li.appendChild(document.createTextNode(hit.left));

      const mark = document.createElement("b");
      const span = document.createElement("span");
      span.className = "hit-mark";
      span.textContent = matchText;
      mark.appendChild(span);
      li.appendChild(mark);

      li.appendChild(document.createTextNode(hit.right));
      ul.appendChild(li);
    });
    return ul;
  }

  async function createTabList() {
    //tabs.sort((a, b) => collator.compare(a.title, b.title));
    tabs.sort((a, b) => {
      return b.index - a.index;
    });

    let tabIdx = 1;
    for (const tab of tabs) {
      //
      const element = template.content.firstElementChild.cloneNode(true);

      // jump index
      tabIdx += 1;
      element.tabId = tab.id;
      element.tabIndex = tabIdx;

      // first tab preview without search
      element.querySelector(".title").innerText = tab.title;
      //element.querySelector(".result").innerText = tab.url.slice(0, 80);

      const favicon = element.querySelector(".favicon");
      const fallbackIcon = browser.runtime.getURL("icon.png");
      favicon.src = tab.favIconUrl || fallbackIcon;
      favicon.addEventListener(
        "error",
        () => {
          favicon.src = fallbackIcon;
        },
        { once: true },
      );

      // handle click or arrow-keys
      element.addEventListener("keydown", async (event) => {
        if (event.key === "Enter") {
          event.target.querySelector("a").click();
        }
      });
      element.querySelector("a").addEventListener("click", async (event) => {
        browser.tabs.highlight({ windowId: tab.windowId, tabs: [tab.index] });

        // Only jump to a specific location if a result line exists for this
        // row: prefer the exact line clicked, falling back to the first hit
        // (e.g. when Enter dispatches a click on the <a> itself, or the
        // title/favicon area was clicked rather than a specific line).
        const hitLi =
          event.target.closest("li[data-match-text]") ||
          event.currentTarget.querySelector("li[data-match-text]");

        if (hitLi) {
          const matchText = hitLi.dataset.matchText;
          const rect = hitLi.__matchRect;

          // Best-effort cosmetic pass: ask Firefox's native find to
          // highlight every occurrence on the page. This never blocks the
          // jump below — the exact position we scroll to comes from the
          // rect content.js computed directly when it found this match,
          // not from correlating it against this separate search.
          if (matchText) {
            browser.find
              .find(matchText, {
                tabId: tab.id,
                caseSensitive: document.getElementById("caseSensitive").checked,
                matchDiacritics:
                  document.getElementById("accentSensitive").checked,
              })
              .then(() => browser.find.highlightResults({ tabId: tab.id }))
              .catch(() => {
                //console.warn(e);
              });
          }

          if (rect) {
            try {
              await browser.tabs.sendMessage(tab.id, {
                cmd: "scroll",
                yoffset: rect.top,
                rect,
              });
            } catch (e) {
              //console.warn(e);
            }
          }
        }
        /*
        setTimeout(() => {
        document.getElementById('searchField').focus();
        }, 1000);
        */
        window.close();
      });

      elements.add(element);
      element.style.display = styleElementHidden; // hide all elements
    }
    document.getElementById("resultlist").append(...elements);
  }

  function createTextFieldEventListener() {
    setInterval(function () {
      handeInputChange();
    }, 500);
  }

  let last_searchField_value = "";
  let last_maxhits_value = "";
  let last_caseSensitive_value = "";
  let last_accentSensitive_value = "";
  let last_regexmode_value = "";

  async function handeInputChange(event) {
    let searchedVal = document.getElementById("searchField").value;
    let maxhits = parseInt(document.getElementById("maxhits").value, 10) || 3;
    let caseSensitive = document.getElementById("caseSensitive").checked;
    let accentSensitive = document.getElementById("accentSensitive").checked;
    let regexmode = document.getElementById("regexmode").checked;

    if (last_searchField_value !== searchedVal) {
      setToStorage("lastsearch", searchedVal);
    }
    if (last_maxhits_value !== maxhits) {
      setToStorage("lastmaxhits", maxhits);
    }
    if (last_caseSensitive_value !== caseSensitive) {
      setToStorage("lastcaseSensitive", caseSensitive);
    }
    if (last_accentSensitive_value !== accentSensitive) {
      setToStorage("lastaccentSensitive", accentSensitive);
    }
    if (last_regexmode_value !== regexmode) {
      setToStorage("lastregexmode", regexmode);

      if (regexmode) {
        document.getElementById("accentSensitive").setAttribute("disabled", "");
        document.getElementById("caseSensitive").setAttribute("disabled", "");
      } else {
        document.getElementById("accentSensitive").removeAttribute("disabled");
        document.getElementById("caseSensitive").removeAttribute("disabled");
      }
    }

    if (
      last_searchField_value === searchedVal &&
      last_maxhits_value === maxhits &&
      last_caseSensitive_value === caseSensitive &&
      last_accentSensitive_value === accentSensitive &&
      last_regexmode_value === regexmode
    ) {
      return;
    }
    /*
    console.debug(
      "handeInputChange",
      searchedVal,
      maxhits,
      caseSensitive,
      accentSensitive,
      regexmode
    );
    */
    last_searchField_value = searchedVal;
    last_maxhits_value = maxhits;
    last_caseSensitive_value = caseSensitive;
    last_accentSensitive_value = accentSensitive;
    last_regexmode_value = regexmode;

    let noresult = true;
    let totalHits = 0;
    let tabsWithHits = 0;
    let tabIdx = 1;
    document.getElementById("searchprogress").setAttribute("max", tabs.length);
    let counter = 0;
    for (const tab of tabs) {
      document
        .getElementById("searchprogress")
        .setAttribute("value", (counter += 1));
      let response;
      if (searchedVal.length > 2) {
        try {
          response = await browser.tabs.sendMessage(tab.id, {
            cmd: regexmode ? "regexsearch" : "search",
            message: searchedVal,
            maxhits: maxhits,
            caseSensitive: caseSensitive,
            accentSensitive: accentSensitive,
          });
        } catch (e) {
          console.error(e);
        }
      }

      if (response && response.hits.length > 0) {
        totalHits += response.hits.length;
        tabsWithHits += 1;
      }

      elements.forEach((e) => {
        if (searchedVal.length < 3) {
          e.style.display = styleElementHidden; // hide elements
          return;
        }
        if (e.tabId !== tab.id) {
          return;
        }
        let show = false;
        const hasHits = Boolean(response && response.hits.length > 0);

        if (response) {
          if (!hasHits && searchedVal) {
            e.style.display = styleElementHidden;
          } else if (!hasHits && searchedVal.toString().length === 0) {
            e.style.display = styleElementDisplay;
            e.querySelector(".result").innerText = tab.url.slice(0, 80);
          } else {
            e.style.display = styleElementDisplay;
            if (searchedVal) {
              const resultEl = e.querySelector(".result");
              resultEl.replaceChildren(
                buildHitList(
                  response.hits,
                  regexmode,
                  caseSensitive,
                  searchedVal,
                ),
              );
              show = true;
              noresult = false;
            }
          }
          e.tabIndex = tabIdx;
          tabIdx += 1;
          if (!show) {
            e.style.display = styleElementHidden; // hide elements
          } else {
            e.style.display = styleElementDisplay;
          }
        }
      });
    }

    if (searchedVal.length < 3) {
      document.getElementById("note").innerText = "Type at least 3 characters";
    } else if (searchedVal.length > 2 && noresult) {
      document.getElementById("note").innerText = "No matches found";
    } else {
      const hitWord = totalHits === 1 ? "match" : "matches";
      const tabWord = tabsWithHits === 1 ? "tab" : "tabs";
      document.getElementById("note").innerText =
        `${totalHits} ${hitWord} in ${tabsWithHits} ${tabWord}`;
    }
  }

  /**/
  async function createDocumentListener() {
    // If we're already running as a full tab (not the toolbar popup or the
    // sidebar), there's nothing to detach to, so hide the button. Tag the
    // body so the wider, centered "detached" layout in popup.css applies.
    const currentTab = await browser.tabs.getCurrent();
    if (currentTab) {
      document.getElementById("detach").style.display = "none";
      document.body.classList.add("detached");
    }

    document.getElementById("detach").addEventListener(
      "click",
      function (event) {
        browser.tabs.create({ url: "popup.html" });
        window.close();
      },
      false,
    );
    // prevent cursor from jumping to the front and back
    document.getElementById("searchField").addEventListener(
      "keydown",
      function (event) {
        if (event.key === "ArrowUp") {
          event.preventDefault();
          return false;
        }
        if (event.key === "ArrowDown") {
          event.preventDefault();
          return false;
        }
      },
      false,
    );
    // change max hits via arrow keys
    document.getElementById("searchField").addEventListener(
      "keyup",
      function (event) {
        if (event.key === "ArrowUp") {
          let tmp = parseInt(document.getElementById("maxhits").value);
          document.getElementById("maxhits").value = tmp + 1;
        }
        if (event.key === "ArrowDown") {
          let tmp = document.getElementById("maxhits").value;
          if (tmp > 1) {
            document.getElementById("maxhits").value = tmp - 1;
          }
          event.target.focus();
        }
        if (event.key === "Enter") {
          // todo jump to first result
          for (const fe of document.querySelectorAll("[tabIndex]")) {
            if (fe.style.display !== styleElementHidden) {
              fe.querySelector("a").click();
              event.target.focus();
              return;
            }
          }
        }
      },
      false,
    );
  }
  /**/

  /*
  function handleKeyDown(event) {
    for (const fe of document.querySelectorAll("[tabIndex]")) {
      if (
        fe.style.display !== styleElementHidden &&
        fe.tabIndex > document.activeElement.tabIndex
      ) {
        fe.focus();
        return;
      }
    }
  }

  function handleKeyUp(event) {
    for (const fe of Array.from(
      document.querySelectorAll("[tabIndex]")
    ).reverse()) {
      if (
        fe.style.display !== styleElementHidden &&
        fe.tabIndex < document.activeElement.tabIndex
      ) {
        fe.focus();
        return;
      }
    }
  }
*/

  //

  await createTabList();
  createTextFieldEventListener();
  createDocumentListener();

  last_searchStr = await getFromStorage("string", "lastsearch", "");
  if (last_searchStr !== "") {
    document.getElementById("searchField").value = last_searchStr;
  }
  let lastmaxhits = await getFromStorage("integer", "lastmaxhits", 3);
  document.getElementById("maxhits").value = lastmaxhits;

  if (await getFromStorage("boolean", "lastcaseSensitive", false)) {
    document.getElementById("caseSensitive").setAttribute("checked", "");
  } else {
    document.getElementById("caseSensitive").removeAttribute("checked");
  }

  if (await getFromStorage("boolean", "lastaccentSensitive", false)) {
    document.getElementById("accentSensitive").setAttribute("checked", "");
  } else {
    document.getElementById("accentSensitive").removeAttribute("checked");
  }

  if (await getFromStorage("boolean", "lastregexmode", false)) {
    document.getElementById("regexmode").setAttribute("checked", "");
    document.getElementById("accentSensitive").setAttribute("disabled", "");
    document.getElementById("caseSensitive").setAttribute("disabled", "");
  } else {
    document.getElementById("regexmode").removeAttribute("checked");
    document.getElementById("accentSensitive").removeAttribute("disabled");
    document.getElementById("caseSensitive").removeAttribute("disabled");
  }

  //
  setTimeout(() => {
    document.getElementById("searchField").focus();
    document.getElementById("searchField").select();
  }, 800);
})();

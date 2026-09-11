const extId = "automate-click";
const temporary = browser.runtime.id.endsWith("@temporary-addon"); // debugging?

function querySelectorAllWithOpenShadow(selector) {
  const results = [];
  const visitedRoots = new Set();

  // Query one root (the document, or a shadow root) and then dive into
  // every shadow root found anywhere below it - to any nesting depth, not
  // just one level - applying the same selector at each level.
  const traverse = (root) => {
    results.push(...root.querySelectorAll(selector));

    root.querySelectorAll("*").forEach((el) => {
      if (el.shadowRoot && !visitedRoots.has(el.shadowRoot)) {
        visitedRoots.add(el.shadowRoot);
        traverse(el.shadowRoot);
      }
    });
  };

  traverse(document);

  return results; // Return an array of matched elements
}

let runningTIDs = [];

const log = (level, msg) => {
  level = level.trim().toLowerCase();
  if (
    ["error", "warn"].includes(level) ||
    (temporary && ["debug", "info", "log"].includes(level))
  ) {
    console[level](extId + "::" + level.toUpperCase() + "::" + msg);
    return;
  }
};

function getRandomInt(min, max) {
  if (max <= min) return 0;
  return Math.floor(Math.random() * (max - min)) + min;
}

function waitFor(selector) {
  log("debug", JSON.stringify(selector, null, 4));

  if (selector.repeatdelay > 0 && selector.maxrepeats === 0) {
    return;
  }

  if (selector.maxrepeats > 0) {
    selector.maxrepeats--;
  }

  for (const item of querySelectorAllWithOpenShadow(selector.cssselector)) {
    if (item) {
      if (typeof item.click === "function") {
        item.click(); // click item
        log("debug", "item by selector clicked");
      } else {
        log("warn", "item by selector has no click function");
      }
    }
  }

  if (selector.repeatdelay > 0) {
    const min = selector.repeatdelay - selector.randomrepeatvariance;
    const max = selector.repeatdelay + selector.randomrepeatvariance;
    const tovalue =
      max - min > 0 ? getRandomInt(min, max) : selector.repeatdelay;
    log("debug", "waitTime: " + tovalue);
    setTimeout(function () {
      waitFor(selector);
    }, tovalue);
  }
} // waitFor end

async function onSelectorsMessage(selectors) {
  runningTIDs.forEach((tid) => {
    try {
      clearTimeout(tid);
    } catch (e) {
      // noop
    }
  });

  runningTIDs = [];

  selectors.forEach((selector) => {
    runningTIDs.push(
      setTimeout(function () {
        selector.maxrepeats--; // negativ maxrepeats will continue forever
        waitFor(selector);
      }, selector.initaldelay || 3000),
    ); // wait initaldelay
  });
}

/* -------------------------------------------------------------------- */
/* On-demand "Test" / "Run" support, used by the buttons in options.html */
/* -------------------------------------------------------------------- */

function flashElements(items, color) {
  items.forEach((el) => {
    const prevOutline = el.style.outline;
    const prevOffset = el.style.outlineOffset;
    el.style.outline = "3px solid " + color;
    el.style.outlineOffset = "1px";
    el.scrollIntoView({
      behavior: "smooth",
      block: "center",
      inline: "center",
    });
    setTimeout(() => {
      el.style.outline = prevOutline;
      el.style.outlineOffset = prevOffset;
    }, 1500);
  });
}

function testSelectorNow(cssselector) {
  try {
    const items = querySelectorAllWithOpenShadow(cssselector);
    flashElements(items, "#ff5722");
    return { ok: true, count: items.length };
  } catch (e) {
    return { ok: false, error: String(e && e.message ? e.message : e) };
  }
}

function runSelectorNow(cssselector) {
  try {
    const items = querySelectorAllWithOpenShadow(cssselector);
    let clicked = 0;
    items.forEach((item) => {
      if (typeof item.click === "function") {
        item.click();
        clicked++;
      }
    });
    flashElements(items, "#2e7d32");
    return { ok: true, count: clicked };
  } catch (e) {
    return { ok: false, error: String(e && e.message ? e.message : e) };
  }
}

/* -------------------------------------------------------------------- */
/* Single message router                                                */
/* -------------------------------------------------------------------- */

function onMessage(message) {
  if (message && typeof message === "object" && message.type) {
    switch (message.type) {
      case "ac-test":
        return Promise.resolve(testSelectorNow(message.cssselector));
      case "ac-run":
        return Promise.resolve(runSelectorNow(message.cssselector));
      default:
        return;
    }
  }
  // legacy shape: a plain array/Set of selector rule objects from
  // background.js's webNavigation trigger
  return onSelectorsMessage(message);
}

browser.runtime.onMessage.addListener(onMessage);

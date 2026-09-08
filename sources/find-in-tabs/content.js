// This script is executed on each tab while typing the search

let cachedPageIndex = null;
let cacheOutdatedTime = 30 * 1000; // 30 seconds
let lastCacheUpdateTime = null;

// Highlight box shown briefly around the exact match that was jumped to.
let jumpHighlightEl = null;
let jumpHighlightTimer = null;

browser.runtime.onMessage.addListener((request, sender) => {
  if (request.cmd === "scroll") {
    // Land the match roughly a third of the way down the viewport rather
    // than jammed against the very top edge.
    const target = Math.max(0, request.yoffset - window.innerHeight / 3);
    window.scrollTo({ top: target, left: 0, behavior: "smooth" });
    if (request.rect) {
      showJumpHighlight(request.rect);
    }
    return;
  }
  if (request.cmd === "search") {
    let searchStr = request.message;

    const pageIndex = getPageIndex();
    let text = pageIndex.text;

    if (!request.accentSensitive) {
      // ignore diacritics in searchbox too
      searchStr = searchStr.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      text = text.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    }

    if (!request.caseSensitive) {
      text = text.toLowerCase();
      searchStr = searchStr.toLowerCase();
    }
    // get Idxs
    let idxs = getIdxsOf(searchStr, text, request.maxhits);
    let hits = [];
    for (const idx of idxs) {
      let left = text.slice(idx - 22 > 0 ? idx - 22 : 0, idx);
      let right = text.slice(
        idx + searchStr.length,
        idx + searchStr.length + 22,
      );
      // Resolved against the same (untouched-length) index the match was
      // found at, so this points at the real on-page location rather than
      // relying on a second, separately-ordered search later.
      let rect = resolveRect(pageIndex, idx, idx + searchStr.length);
      hits.push({ left, right, rect });
    }
    return Promise.resolve({ hits });
  }
  if (request.cmd === "regexsearch") {
    let regexStr = request.message;
    const pageIndex = getPageIndex();
    let text = pageIndex.text;
    let idxgs = getStartEndIdxs(regexStr, text, request.maxhits);

    let hits = [];
    for (const idx of idxgs) {
      let left = text.slice(idx[0] - 22 > 0 ? idx[0] - 22 : 0, idx[0]);
      let mid = text.slice(idx[0], idx[1]);
      let right = text.slice(idx[1], idx[1] + 22);
      let rect = resolveRect(pageIndex, idx[0], idx[1]);
      hits.push({ left, mid, right, rect });
    }
    return Promise.resolve({ hits });
  }
});

function getPageIndex() {
  // Why 30 seconds? Well that seems like a reasonable time ... :-)
  const now = Date.now();
  if (
    cachedPageIndex === null ||
    lastCacheUpdateTime === null ||
    now > lastCacheUpdateTime + cacheOutdatedTime
  ) {
    cachedPageIndex = buildPageIndex(document.body);
    lastCacheUpdateTime = now;
  }
  return cachedPageIndex;
}

// Walks the page's text nodes once, building a whitespace-collapsed copy of
// the visible text (for matching, same idea as before) plus a parallel map
// from each character of that collapsed text back to its exact DOM
// (node, offset). A match's on-page position can then be resolved directly
// from the same search pass that found it, instead of asking a separate API
// to re-find the text afterwards and hoping the match order lines up.
function isVisible(el) {
  if (!el) {
    return false;
  }
  if (typeof el.checkVisibility === "function") {
    // Checks display:none up the whole ancestor chain (which can't be
    // overridden by a descendant) plus this element's own computed
    // visibility/opacity (which already reflects any descendant override).
    return el.checkVisibility({
      checkOpacity: true,
      checkVisibilityCSS: true,
    });
  }
  // Fallback for engines without checkVisibility().
  let node = el;
  while (node && node.nodeType === 1) {
    if (window.getComputedStyle(node).display === "none") {
      return false;
    }
    node = node.parentElement;
  }
  const own = window.getComputedStyle(el);
  if (own.visibility === "hidden" || own.visibility === "collapse") {
    return false;
  }
  if (parseFloat(own.opacity) === 0) {
    return false;
  }
  return true;
}

function buildPageIndex(root) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      if (!parent) {
        return NodeFilter.FILTER_REJECT;
      }
      const tag = parent.tagName;
      if (tag === "SCRIPT" || tag === "STYLE" || tag === "NOSCRIPT") {
        return NodeFilter.FILTER_REJECT;
      }
      if (!isVisible(parent)) {
        return NodeFilter.FILTER_REJECT;
      }
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  let text = "";
  const chunks = []; // { node, start, mapping: [nodeOffset, ...] }
  let pendingSpace = false;

  let node;
  while ((node = walker.nextNode())) {
    const raw = node.nodeValue;
    if (!raw) {
      continue;
    }
    const start = text.length;
    let appended = "";
    const mapping = [];
    for (let i = 0; i < raw.length; i++) {
      const ch = raw[i];
      if (/\s/.test(ch)) {
        if (!pendingSpace && text.length + appended.length > 0) {
          appended += " ";
          mapping.push(i);
        }
        pendingSpace = true;
      } else {
        appended += ch;
        mapping.push(i);
        pendingSpace = false;
      }
    }
    if (appended.length > 0) {
      text += appended;
      chunks.push({ node, start, mapping });
    }
  }

  return { text, chunks };
}

function resolveDomPosition(pageIndex, index) {
  const chunks = pageIndex.chunks;
  let lo = 0,
    hi = chunks.length - 1,
    found = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (chunks[mid].start <= index) {
      found = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  if (found === -1) {
    return null;
  }
  const chunk = chunks[found];
  const offsetInChunk = index - chunk.start;
  const mapping = chunk.mapping;
  if (mapping.length === 0) {
    return null;
  }
  const nodeOffset = mapping[Math.min(offsetInChunk, mapping.length - 1)];
  return { node: chunk.node, nodeOffset };
}

function resolveRect(pageIndex, startIdx, endIdx) {
  try {
    const start = resolveDomPosition(pageIndex, startIdx);
    if (!start) {
      return null;
    }
    const endPos =
      resolveDomPosition(pageIndex, Math.max(startIdx, endIdx - 1)) || start;

    const range = document.createRange();
    range.setStart(start.node, start.nodeOffset);
    if (endPos.node === start.node) {
      range.setEnd(
        endPos.node,
        Math.min(endPos.nodeOffset + 1, endPos.node.length),
      );
    } else {
      range.setEnd(
        start.node,
        Math.min(start.nodeOffset + 1, start.node.length),
      );
    }

    const rect = range.getBoundingClientRect();
    if (
      rect.width === 0 &&
      rect.height === 0 &&
      rect.top === 0 &&
      rect.left === 0
    ) {
      return null;
    }
    return {
      top: rect.top + window.scrollY,
      left: rect.left + window.scrollX,
      width: rect.width,
      height: rect.height,
    };
  } catch (e) {
    return null;
  }
}

function showJumpHighlight(rect) {
  if (jumpHighlightEl) {
    jumpHighlightEl.remove();
    clearTimeout(jumpHighlightTimer);
  }
  const el = document.createElement("div");
  el.style.position = "absolute";
  el.style.top = `${rect.top - 3}px`;
  el.style.left = `${rect.left - 3}px`;
  el.style.width = `${Math.max(rect.width, 4) + 6}px`;
  el.style.height = `${Math.max(rect.height, 4) + 6}px`;
  el.style.background = "rgba(255, 204, 0, 0.55)";
  el.style.outline = "2px solid rgba(230, 150, 0, 0.9)";
  el.style.borderRadius = "3px";
  el.style.zIndex = "2147483647";
  el.style.pointerEvents = "none";
  el.style.transition = "opacity 0.4s ease";
  document.documentElement.appendChild(el);
  jumpHighlightEl = el;
  jumpHighlightTimer = setTimeout(() => {
    el.style.opacity = "0";
    setTimeout(() => el.remove(), 400);
    if (jumpHighlightEl === el) {
      jumpHighlightEl = null;
    }
  }, 4600);
}

function getStartEndIdxs(regexStr, str, maxhits) {
  let out_idx_groups = [];
  try {
    const regex = new RegExp(regexStr, "dgm");

    let m;

    let stop = false;
    while ((m = regex.exec(str)) !== null) {
      // This is necessary to avoid infinite loops with zero-width matches
      if (m.index === regex.lastIndex) {
        regex.lastIndex++;
      }
      //
      for (const el of m.indices) {
        out_idx_groups.push(el);
        if (out_idx_groups.length >= maxhits) {
          stop = true;
          break;
        }
      }
      if (stop) {
        break;
      }
    }
  } catch (e) {
    // console.warn(e);
  }
  return out_idx_groups;
}

function getIdxsOf(searchStr, str, maxhits) {
  var searchStrLen = searchStr.length;
  if (searchStrLen < 3) {
    return [];
  }
  var startIndex = 0,
    index,
    idxs = [];
  while ((index = str.indexOf(searchStr, startIndex)) > -1) {
    idxs.push(index);
    startIndex = index + searchStrLen;
    if (idxs.length >= maxhits) {
      break;
    }
  }
  return idxs;
}

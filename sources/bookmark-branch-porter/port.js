const folders = document.getElementById("folder");

/*
const toHtmlEntities = (str, showInHtml = false) =>
  [...str]
    .map((v) => `${showInHtml ? `&amp;#` : `&#`}${v.codePointAt(0)};`)
    .join(``);
*/

async function importJSON(node, parentId, noroot) {
  if (node.url) {
    await browser.bookmarks.create({
      index: node.index,
      parentId: parentId,
      title: node.title,
      type: "bookmark",
      url: node.url,
      /* not allowed: ref. https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/bookmarks/CreateDetails
      dateAdded: node.dateAdded ? node.dateAdded : Date.now(),
      */
    });
  } else {
    if (node.children && node.children.length > 0) {
      if (noroot) {
        for (let child of node.children) {
          await importJSON(child, parentId, false);
        }
      } else {
        const nBM = await browser.bookmarks.create({
          index: node.index,
          parentId: parentId,
          title: node.title,
          type: "folder",
          /* not allowed: ref. https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/bookmarks/CreateDetails
        dateAdded: node.dateAdded ? node.datAdded : Date.now(),
        dateGroupModified: node.dateGroupModified
          ? node.dateGroupModified
          : Date.now(),
      */
        });
        for (let child of node.children) {
          await importJSON(child, nBM.id, false);
        }
      }
    }
  }
}

async function importData(bookmarkId, data, noroot) {
  // add new childen
  return importJSON(data, bookmarkId, noroot);
}

function exportData(data) {
  document.getElementById("output").value = data;
}

function rec2HtmlStr(bmTreeNode, level = 1) {
  let out = "";
  "\t".repeat(level);
  let tmp = "";
  let title = typeof bmTreeNode.title === "string" ? bmTreeNode.title : "";
  if (typeof bmTreeNode.url === "string") {
    out =
      out +
      "\t".repeat(level) +
      '<DT><A HREF="' +
      bmTreeNode.url +
      '">' +
      title +
      "</A>" +
      "\n";
  } else if (Array.isArray(bmTreeNode.children)) {
    tmp = "\t".repeat(level) + "<DT><H3>" + title + "</H3>" + "\n";
    if (bmTreeNode.children.length > 0) {
      out = out + tmp;
      out = out + "\t".repeat(level) + "<DL><p>" + "\n";
      for (const child of bmTreeNode.children) {
        out = out + rec2HtmlStr(child, level + 1);
      }
      out = out + "\t".repeat(level) + "</DL><p>" + "\n";
    }
  }
  if (level === 1) {
    return (
      "<!DOCTYPE NETSCAPE-Bookmark-file-1>" +
      "\n" +
      '<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">' +
      "\n" +
      '<meta http-equiv="Content-Security-Policy"' +
      "\n" +
      "      content=\"default-src 'self'; script-src 'none'; img-src data: *; object-src 'none'\"></meta>" +
      "\n" +
      "<TITLE>Bookmarks</TITLE>" +
      "\n" +
      "<H1>Bookmarks Menu</H1>" +
      "\n" +
      "\n" +
      "<DL><p>" +
      "\n" +
      out +
      "</DL>"
    );
  }
  return out;
}

function recGetFolders(node, depth = 0) {
  let out = new Map();
  if (typeof node.url !== "string") {
    if (node.id !== "root________") {
      out.set(node.id, { depth: depth, title: node.title });
    }
    if (node.children) {
      for (let child of node.children) {
        out = new Map([...out, ...recGetFolders(child, depth + 1)]);
      }
    }
  }
  return out;
}

async function initSelect() {
  const nodes = await browser.bookmarks.getTree();
  let out = new Map();
  let depth = 1;
  for (const node of nodes) {
    out = new Map([...out, ...recGetFolders(node, depth)]);
  }
  for (const [k, v] of out) {
    folders.add(new Option("-".repeat(v.depth) + " " + v.title, k));
  }
  folders.value = "";
}

function recParseHtmlNode(dlNode) {
  let out = {
    title: dlNode.previousElementSibling.innerText,
    children: [],
  };
  for (const tmp of dlNode.querySelectorAll(":scope > dt > a")) {
    out.children.push({
      title: tmp.innerText,
      url: tmp.href,
    });
  }
  for (const tmp of dlNode.querySelectorAll(":scope > dt > dl")) {
    out.children.push(recParseHtmlNode(tmp));
  }
  return out;
}

function htmlDoc2Json(doc) {
  let out = {
    title: "",
    children: [],
  };
  for (const dl of doc.querySelectorAll("body > dl > dt > dl")) {
    out.children.push(recParseHtmlNode(dl));
  }
  if (out.children.length === 1) {
    return out.children[0];
  }
  return out;
}

/* ---------- UI helpers (visual layer only — logic above is unchanged) ---------- */

function setMessage(text, status) {
  const el = document.getElementById("message");
  el.innerText = text;
  if (status) {
    el.setAttribute("data-status", status);
  } else {
    el.removeAttribute("data-status");
  }
}

function setBusy(isBusy) {
  for (const id of ["doexport", "doimport"]) {
    document.getElementById(id).disabled = isBusy;
  }
}

function initFormatToggle() {
  const hiddenSelect = document.getElementById("format");
  const buttons = document.querySelectorAll(".format-toggle button");
  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      buttons.forEach((b) => b.setAttribute("aria-pressed", "false"));
      btn.setAttribute("aria-pressed", "true");
      hiddenSelect.value = btn.dataset.format;
    });
  });
}

function initDataPanelActions() {
  document.getElementById("docopy").addEventListener("click", async () => {
    const output = document.getElementById("output");
    try {
      await navigator.clipboard.writeText(output.value);
    } catch (e) {
      output.select();
      document.execCommand("copy");
    }
    setMessage("Copied to clipboard", "ok");
  });

  document.getElementById("doclear").addEventListener("click", () => {
    document.getElementById("output").value = "";
    setMessage("", null);
  });
}

async function onDOMContentLoaded() {
  await initSelect();
  initFormatToggle();
  initDataPanelActions();

  document.getElementById("doexport").addEventListener("click", async () => {
    setMessage("", null);
    setBusy(true);
    try {
      const bmId = folders.value;
      const type = document.getElementById("format").value;
      if (bmId === "") {
        const tmp = (await browser.bookmarks.getTree())[0];
        if (type === "html") {
          exportData(unescape(encodeURIComponent(rec2HtmlStr(tmp))));
        }
        if (type === "json") {
          exportData(JSON.stringify(tmp, null, 4));
        }
      } else {
        const tmp = (await browser.bookmarks.getSubTree(bmId))[0];
        if (type === "html") {
          exportData(rec2HtmlStr(tmp));
        }
        if (type === "json") {
          exportData(JSON.stringify(tmp, null, 4));
        }
      }
      setMessage(
        "Export finished — the data panel below is ready to copy",
        "ok",
      );
    } catch (e) {
      console.error(e);
      setMessage("Export failed: " + e.toString(), "error");
    } finally {
      setBusy(false);
    }
  });

  document.getElementById("doimport").addEventListener("click", async () => {
    const bmId = folders.value;
    const type = document.getElementById("format").value;
    const noroot = document.getElementById("noroot").checked;

    console.debug(bmId, type, noroot);

    setMessage("", null);
    setBusy(true);
    try {
      let data;
      if (type === "json") {
        data = JSON.parse(document.getElementById("output").value);
      } else {
        const parser = new DOMParser();
        const htmlDoc = parser.parseFromString(
          document.getElementById("output").value,
          "text/html",
        );
        data = htmlDoc2Json(htmlDoc);
      }
      await importData(bmId, data, noroot);
      setMessage(
        "Import finished without errors — check the results, then you can close this tab",
        "ok",
      );
    } catch (e) {
      console.error(e);
      setMessage("Import failed: " + e.toString(), "error");
    } finally {
      setBusy(false);
    }
  });
}

document.addEventListener("DOMContentLoaded", onDOMContentLoaded);

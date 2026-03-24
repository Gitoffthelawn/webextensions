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

async function onDOMContentLoaded() {
  await initSelect();

  document.getElementById("doexport").addEventListener("click", async () => {
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
  });

  document.getElementById("doimport").addEventListener("click", async () => {
    const bmId = folders.value;
    const type = document.getElementById("format").value;
    const noroot = document.getElementById("noroot").checked;

    console.debug(bmId, type, noroot);

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
      document.getElementById("message").innerText =
        "INFO: Import from file finished without errors, check the results then you can close this tab";
    } catch (e) {
      console.error(e);
      document.getElementById("message").innerText =
        "ERROR: Import failed, " + e.toString();
    }
  });
}

document.addEventListener("DOMContentLoaded", onDOMContentLoaded);

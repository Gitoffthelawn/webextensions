/*
const toHtmlEntities = (str, showInHtml = false) =>
  [...str]
    .map((v) => `${showInHtml ? `&amp;#` : `&#`}${v.codePointAt(0)};`)
    .join(``);
*/

function unHTML(input) {
  const textArea = document.createElement("textarea");
  textArea.innerText = input;
  return textArea.innerHTML.split("<br>").join("\n");
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

async function onDOMContentLoaded() {
  const params = new URL(document.location.href).searchParams;
  const bmId = params.get("bookmarkId");
  const type = params.get("type"); // html or json
  if (bmId === null) {
    document.title = getTimeStampStr() + " Full Bookmarks Export." + type;
    const tmp = (await browser.bookmarks.getTree())[0];
    if (type === "html") {
      exportData(unescape(encodeURIComponent(rec2HtmlStr(tmp))));
    }
    if (type === "json") {
      exportData(JSON.stringify(tmp, null, 4));
    }
  } else {
    const tmp = (await browser.bookmarks.getSubTree(bmId))[0];
    document.title =
      getTimeStampStr() +
      " Partial Bookmarks Export: " +
      tmp.title +
      "." +
      type;
    if (type === "html") {
      exportData(rec2HtmlStr(tmp));
    }
    if (type === "json") {
      exportData(JSON.stringify(tmp, null, 4));
    }
  }

  document.getElementById("save").addEventListener("click", save);
}

function save() {
  let dl = document.createElement("a");
  let textFileAsBlob = new Blob([document.getElementById("output").value], {
    type: "text/plain",
  });
  dl.setAttribute("href", window.URL.createObjectURL(textFileAsBlob));
  dl.setAttribute("download", document.title);
  dl.setAttribute("visibility", "hidden");
  dl.setAttribute("display", "none");
  document.body.appendChild(dl);
  dl.click();
  document.body.removeChild(dl);
  document.getElementById("output").select();
}

document.addEventListener("DOMContentLoaded", onDOMContentLoaded);

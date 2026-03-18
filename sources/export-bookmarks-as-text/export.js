const folders = document.getElementById("folder");

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

function recGetBookmarkUrls(bookmarkItem, depth) {
  let urls = [];
  if (bookmarkItem.url) {
    urls.push(
      " ".repeat(depth) + " " + bookmarkItem.title + " : " + bookmarkItem.url,
    );
  } else if (bookmarkItem.children) {
    urls.push(" ".repeat(depth) + "> " + bookmarkItem.title);
    for (var child of bookmarkItem.children) {
      urls = urls.concat(recGetBookmarkUrls(child, depth + 1));
    }
  }
  return urls;
}

function exportData(urls) {
  document.getElementById("output").value = urls.join("\n");
}

async function onDOMContentLoaded() {
  await initSelect();

  document.title = getTimeStampStr() + " Full Bookmarks Export";
  const tmp = (await browser.bookmarks.getTree())[0];
  exportData(recGetBookmarkUrls(tmp, 1));

  folders.addEventListener("input", async () => {
    if (folders.value !== "") {
      const bmId = folder.value;
      const tmp = (await browser.bookmarks.getSubTree(bmId))[0];
      document.title =
        getTimeStampStr() + " Partial Bookmarks Export: " + tmp.title;
      exportData(recGetBookmarkUrls(tmp, 0));
    } else {
      document.title = getTimeStampStr() + " Full Bookmarks Export";
      const tmp = (await browser.bookmarks.getTree())[0];
      exportData(recGetBookmarkUrls(tmp, 1));
    }
  });

  /*
  const params = new URL(document.location.href).searchParams;
  const bmId = params.get("bmId");
  if (bmId === null) {
    document.title = getTimeStampStr() + " Full Bookmarks Export";
    const tmp = (await browser.bookmarks.getTree())[0];
    exportData(recGetBookmarkUrls(tmp, 1));
  } else {
    const tmp = (await browser.bookmarks.getSubTree(bmId))[0];
    document.title =
      getTimeStampStr() + " Partial Bookmarks Export: " + tmp.title;
    exportData(recGetBookmarkUrls(tmp, 0));
  }
*/

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

document.addEventListener("DOMContentLoaded", onDOMContentLoaded);

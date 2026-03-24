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
  const tmp = (await browser.bookmarks.getTree())[0];
  exportData(recGetBookmarkUrls(tmp, 1));
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

document.addEventListener("DOMContentLoaded", onDOMContentLoaded);

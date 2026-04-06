// Recursively collect bookmark lines (folders and URLs)
function collectBookmarkLines(node, depth = 0) {
  const lines = [];

  if (node.url) {
    lines.push(`${" ".repeat(depth)} ${node.title} : ${node.url}`);
    return lines;
  }

  // Treat non-leaf as folder
  if (depth === 1) {
    const date = new Date();
    const title = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")} Export Bookmarks as Text`;
    document.title = title;
    lines.push(`${" ".repeat(depth)}> ${title}`);
  } else {
    lines.push(`${" ".repeat(depth)}> ${node.title || "(no title)"}`);
  }

  if (Array.isArray(node.children)) {
    for (const child of node.children) {
      lines.push(...collectBookmarkLines(child, depth + 1));
    }
  }

  return lines;
}

// Export collected lines into textarea#output
function exportData(lines) {
  const out = document.getElementById("output");
  if (out) out.value = lines.join("\n");
}

// Entry point after DOM is ready (async to await browser API)
async function onDOMContentLoaded() {
  refresh();
  let myPort = browser.runtime.connect({ name: "port-from-cs" });
  myPort.onMessage.addListener((m) => {
    refresh();
  });
}

async function refresh() {
  try {
    const tree = await browser.bookmarks.getTree();
    const root = Array.isArray(tree) ? tree[0] : tree;
    const lines = collectBookmarkLines(root, 1);
    exportData(lines);
  } catch (err) {
    const msg = "Failed to load bookmarks: " + err;
    console.error(msg);
    const out = document.getElementById("output");
    out.value = msg;
  }
}

// Recursively collect folders into a Map { id => { depth, title } }
function collectFolders(node, depth = 0, map = new Map()) {
  // Treat nodes without a url as folders
  if (typeof node.url !== "string") {
    if (node.id !== "root________") {
      map.set(node.id, { depth, title: node.title || "" });
    }

    if (Array.isArray(node.children)) {
      for (const child of node.children) {
        collectFolders(child, depth + 1, map);
      }
    }
  }

  return map;
}

document.addEventListener("DOMContentLoaded", onDOMContentLoaded);

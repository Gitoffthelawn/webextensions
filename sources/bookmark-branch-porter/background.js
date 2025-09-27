/* global browser */

browser.menus.create({
  title: "Export ALL (JSON)",
  contexts: ["bookmark"],
  onclick: (info, tab) => {
    browser.tabs.create({
      url: "export.html?type=json",
    });
  },
});

browser.menus.create({
  title: "Export ALL (HTML)",
  contexts: ["bookmark"],
  onclick: (info, tab) => {
    browser.tabs.create({
      url: "export.html?type=html",
    });
  },
});

browser.menus.create({
  title: "Export Branch (JSON)",
  contexts: ["bookmark"],
  onclick: async (info, tab) => {
    const tmp = (await browser.bookmarks.get(info.bookmarkId))[0];
    if (tmp.url) {
      browser.tabs.create({
        url: "export.html?type=json&bookmarkId=" + tmp.parentId,
      });
    } else {
      browser.tabs.create({
        url: "export.html?type=json&bookmarkId=" + info.bookmarkId,
      });
    }
  },
});

browser.menus.create({
  title: "Export Branch (HTML)",
  contexts: ["bookmark"],
  onclick: async (info, tab) => {
    const tmp = (await browser.bookmarks.get(info.bookmarkId))[0];
    if (tmp.url) {
      browser.tabs.create({
        url: "export.html?type=html&bookmarkId=" + tmp.parentId,
      });
    } else {
      browser.tabs.create({
        url: "export.html?type=html&bookmarkId=" + info.bookmarkId,
      });
    }
  },
});

browser.menus.create({
  title: "Import Branch (JSON)",
  contexts: ["bookmark"],
  onclick: (info, tab) => {
    browser.tabs.create({
      url: "import.html?type=json&bookmarkId=" + info.bookmarkId + "&noroot=0",
    });
  },
});

browser.menus.create({
  title: "Import Branch (HTML)",
  contexts: ["bookmark"],
  onclick: (info, tab) => {
    browser.tabs.create({
      url: "import.html?type=html&bookmarkId=" + info.bookmarkId + "&noroot=0",
    });
  },
});

browser.menus.create({
  title: "Import Branch (HTML) (w/o root)",
  contexts: ["bookmark"],
  onclick: (info, tab) => {
    browser.tabs.create({
      url: "import.html?type=html&bookmarkId=" + info.bookmarkId + "&noroot=1",
    });
  },
});

browser.menus.create({
  title: "Import Branch (JSON) (w/o root)",
  contexts: ["bookmark"],
  onclick: (info, tab) => {
    browser.tabs.create({
      url: "import.html?type=json&bookmarkId=" + info.bookmarkId + "&noroot=1",
    });
  },
});

/* global browser */

(async () => {
  let online = true;

  function notify(title, message = "", iconUrl = "icon.png") {
    try {
      const nid = browser.notifications.create("" + Date.now(), {
        type: "basic",
        iconUrl,
        title,
        message,
      });
      if (nid > -1) {
        setTimeout(() => {
          browser.notifications.clear(nid);
        }, 2000);
      }
    } catch (e) {
      // noop
    }
  }

  async function onDowloadCreated(info) {
    if (online) {
      // instant cancel, hopeully prevents duplicate downloads
      notify("Block Downloads", "canceled download");
      try {
        browser.downloads.cancel(info.id);
      } catch (e) {
        console.error(e);
        // if we get here, the download is already done ... so lets just stop, no need to forward
        notify(
          "Block Downloads",
          "file slipped by and was downloaded ... will try to remove it",
        );
        try {
          await browser.downloads.removeFile(info.id);
        } catch (e) {}
      }
    }
  }

  function onBAClicked(tab) {
    // toggle state
    online = !online;
    browser.browserAction.setBadgeText({
      tabId: tab.id,
      text: online ? "on" : "off",
    });
    browser.browserAction.setBadgeBackgroundColor({
      color: online ? "green" : "red",
    });
  }

  browser.browserAction.setBadgeBackgroundColor({ color: "green" });
  browser.browserAction.setBadgeText({ text: "on" });

  browser.downloads.onCreated.addListener(onDowloadCreated);
  browser.browserAction.onClicked.addListener(onBAClicked);
})();

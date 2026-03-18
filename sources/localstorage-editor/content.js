/* global browser */

(async () => {
  async function detect() {
    const hasSessionStorageData = window.sessionStorage.length > 0;
    const hasLocalStorageData = window.localStorage.length > 0;
    // send Message to Background Script to update/show the pageAction icon
    try {
      await browser.runtime.sendMessage({
        hasSessionStorageData,
        hasLocalStorageData,
      });
    } catch (e) {
      console.error(e);
    }
    setTimeout(detect, 3000);
  }

  browser.runtime.onMessage.addListener((data, sender) => {
    localStorage.clear();
    sessionStorage.clear();

    let el, store, key, value;
    let i = 0;
    for (i = 0; i < data.length; i++) {
      el = data[i];
      store = el.store;
      key = el.key;
      value = el.value;
      try {
        switch (store) {
          case "Local":
            localStorage.setItem(key, value);
            break;
          case "Session":
            sessionStorage.setItem(key, value);
            break;
        }
      } catch (e) {
        // setItem can throw an QuotaExceededError
        window.alert("Failed to Sync Storage Data", e);
      }
    }
  });

  await detect();
})();

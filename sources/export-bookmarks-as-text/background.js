/* global browser */

let portFromOP = null;

browser.browserAction.onClicked.addListener(() => {
  if (portFromOP === null) {
    browser.runtime.openOptionsPage();
  } else {
    portFromOP.postMessage({ cmd: "refresh" });
  }
});

browser.runtime.onConnect.addListener((p) => {
  portFromOP = p;

  portFromOP.onDisconnect.addListener((p) => {
    portFromOP = null;
  });
});

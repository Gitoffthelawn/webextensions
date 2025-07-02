/* global browser */

(() => {
  if (window.hasRun) {
    return;
  }
  window.hasRun = true;
  let timerID;

  async function onChange() {
    browser.runtime.sendMessage([]);
  }

  function delayed_onChange() {
    clearTimeout(timerID);
    timerID = setTimeout(onChange, 500);
  }

  function init() {
    if (document.body) {
      new MutationObserver(delayed_onChange).observe(document.body, {
        attributes: false,
        childList: true,
        subtree: true,
      });
      delayed_onChange();
    }
  }

  // inital delay
  init();
})();

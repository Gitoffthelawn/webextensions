/*global browser */

// edge case for CTRL+T (new tab creation
let prevTabId = null;
let actiTabId = null;
async function onActivated(activeInfo) {
  prevTabId = activeInfo.previousTabId;
  actiTabId = activeInfo.tabId;
}

async function onCreated(newTab) {
  let activeTab = null;
  if (newTab.id === actiTabId) {
    activeTab = await browser.tabs.get(prevTabId);
  } else {
    activeTab = await browser.tabs.get(actiTabId);
  }
  if (newTab.windowId === activeTab.windowId) {
    const aTab_index = activeTab.index;
    /*
        fix: inconsistent behaviour with tabgroups
        first we move the tab onto the same position as the active tab
        this makes the behaviour consistent if we directly move it to the slot besides the active tab
        and the active tab is the last tab of a group, that tab will be outside the tabgroup
    */
    browser.tabs.move(newTab.id, { index: aTab_index });
    browser.tabs.move(newTab.id, { index: aTab_index + 1 });
    prevTabId = newTab.id;
  }
}

browser.tabs.onActivated.addListener(onActivated);
browser.tabs.onCreated.addListener(onCreated);

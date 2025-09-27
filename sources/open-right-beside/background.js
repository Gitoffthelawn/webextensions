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
        Fix for inconsistent behaviour with tabGroups

        Issue: when the active tab is the last tab in a group, moving any tab to the right position places the tab outside of the group while doing the same with other tabs in the group will result in the new tab becoming a part of the group.

    */

    if (browser.tabGroups) {
      // check if groups are available
      if (activeTab.groupId) {
        // check if the active tab is part of a group
        browser.tabs.move(newTab.id, { index: aTab_index });
      }
    }

    browser.tabs.move(newTab.id, { index: aTab_index + 1 });
    prevTabId = newTab.id;
  }
}

browser.tabs.onActivated.addListener(onActivated);
browser.tabs.onCreated.addListener(onCreated);

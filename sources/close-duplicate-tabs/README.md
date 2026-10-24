Shows how many duplicate tabs there are in your window and closes them with one click. The tab you are looking at, or otherwise the right-most copy, is always kept.

**Quick start**

1. Look at the badge on the toolbar button. The orange number is the count of duplicate tabs in your current window. No badge means there are no duplicates.
2. Click the toolbar button to close all of them. Hover over the button to see the same count in the tooltip ("Close 3 Duplicates").

You can also assign a keyboard shortcut to the toolbar button in the Add-ons Manager (Manage Extension Shortcuts).

**What counts as a duplicate**

Two tabs are duplicates when all of this is true:

- they are in the same window
- they are in the same container (a tab in a container is never a duplicate of a tab outside of it, or in another container)
- they have the same address

When addresses are compared, the part after the # is ignored, and the order of the parameters does not matter. These addresses are all the same page:

    https://example.com/list?sort=asc&page=2
    https://example.com/list?page=2&sort=asc
    https://example.com/list?page=2&sort=asc#top

Addresses with different parameter values are different pages.

The following tabs are never counted or closed:

- pinned tabs
- hidden tabs
- tabs that are still loading

Only the window that you used last is checked. Tabs in other windows are left alone.

**Which tab is kept**

Of a group of identical tabs:

- the tab you are looking at is kept, if it is one of them
- otherwise the right-most one is kept

All other copies are closed, so the left-most copies go first.

**Good to know**

- The count is refreshed every 5 seconds. A click closes the tabs that were counted at the last refresh.
- If there are no duplicates, a click does nothing.
- Closing is done in one step and the tabs are not saved anywhere. If you need a tab back, use "Undo Close Tab" in the tab context menu of Firefox or the history.

**Custom toolbar icon**

You can replace the icon of the toolbar button with your own picture.

1. Right click the toolbar button and choose "Set custom icon".
2. On the page that opens, click "Choose Image" and pick a JPG or PNG file.
3. The picture is resized to 128 by 128 pixels and the toolbar icon changes right away. A preview is shown on the page. A square picture avoids stretching.

The icon is remembered and restored whenever the browser starts. Choose another image any time to change it again.

**Permissions and privacy**

- tabs: read the addresses of the tabs to compare them, and close the duplicates.
- cookies: read the container of each tab, so that tabs in different containers are not mixed up.
- storage: keep your custom icon on your computer.
- menus: add "Set custom icon" to the menu of the toolbar button.

The add-on does not collect or transmit any data. Your custom image never leaves your computer.
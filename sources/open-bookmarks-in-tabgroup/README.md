Open a bookmark folder as a Firefox tab group. One right click opens every bookmark of the folder as a tab, in a tab group that is named after the folder.

**Quick start**

1. Open your bookmarks, for example in the bookmarks sidebar or the Library window.
2. Right click a bookmark folder and choose "Open Tabgroup".
3. All bookmarks of the folder open as tabs in a new tab group with the name of the folder.

The entry is only shown for folders, not for single bookmarks. It requires Firefox 139 or newer, which has tab groups.

**What happens**

- The tabs open in the background. Your current tab stays selected.
- Only the bookmarks directly inside the folder are opened. Bookmarks in subfolders are not included.
- The tabs are in the same order as the bookmarks in the folder.
- The tab group gets the name of the folder. Its color is chosen automatically from the folder name, so the same folder always gets the same color.
- Only web addresses (http and https) can be opened. Reader view bookmarks are opened as the original page.
- Bookmarks that cannot be opened are collected, and a page opens at the end that lists them, so you can see what went wrong.

**If the group already exists**

If a tab group with the name of the folder already exists, the option "Replace an existing tab group" decides what happens:

- **On** (default): the existing group is closed, together with all its tabs, and the folder is opened again as a fresh group.
- **Off**: the existing group is kept. Only the bookmarks whose addresses are not yet open in that group are added to it, and the tabs of the group are put in the order of the bookmarks. Tabs in the group that are not in the folder stay at the end. The name, color and collapsed state of the group are not changed. Addresses that differ only in details like a trailing slash count as the same page.

**Options**

Open the add-on preferences in the Add-ons Manager. The page also opens once after the installation. Changes are saved automatically.

- **Replace an existing tab group**: see above. On by default.
- **Collapse the tab group**: new tab groups start collapsed instead of open. On by default. A group that already exists is not changed.
- **Load tabs immediately**: on by default. If you switch it off, the tabs open unloaded, with the website name as the title, and a page only loads when you click its tab. This is faster for large folders.

**Good to know**

- Groups are matched by name. With "Replace an existing tab group" on, every tab group that has the same name as the folder is closed, including tabs you added to it yourself.
- To open a folder again without losing anything in the group, switch "Replace an existing tab group" off.

**Permissions and privacy**

- bookmarks: read the bookmarks of the folder you click.
- tabs and tabGroups: open the tabs, group them, and look for an existing group.
- menus: add "Open Tabgroup" to the bookmark context menu.
- storage: keep your options on your computer.

The add-on does not collect or transmit any data. Your bookmarks are not changed.
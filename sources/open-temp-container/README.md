Open links, bookmarks and tabs in temporary containers. Every page gets its own fresh, isolated container with its own cookies and site data, and the container removes itself shortly after its last tab is closed.

**Quick start**

1. Right click a link and choose "Open Temp Container". The page opens in a new tab in a brand new container.
2. Close the tab when you are done. A few seconds later the container, and everything it stored, is gone.

Hold Ctrl while clicking the menu entry to open the new tab in the background instead of switching to it.

**Where to find it**

The entry "Open Temp Container" is in the right click menu of:

- **a link**: opens the link in a new temp container.
- **selected text**: opens every link inside the selection, each one in its own temp container. These tabs always open in the background.
- **a tab**: opens the address of the tab in a new temp container. If the tab is part of a multiple selection (Ctrl or Shift click on tabs), every selected tab is opened, each in its own temp container. The original tabs stay open.
- **a bookmark**: opens it in a new temp container.
- **a bookmark folder**: opens every bookmark directly inside the folder, each in its own temp container. Bookmarks in subfolders are not included.

New tabs open right next to the tab you are on. Only web addresses (http and https) are loaded. For other kinds of pages, such as about: pages, you get an empty new tab in a temp container.

**Toolbar button**

Click the toolbar button to open the current page in a new temp container. If the current page is not a web page, an empty new tab is opened in a temp container. In the options you can change the button so that it always opens an empty new tab instead.

**Keyboard shortcuts**

- **Ctrl+Shift+I**: opens an empty new tab in a new temp container.
- **Ctrl+Shift+U**: opens a new tab in the same container as the tab you are on. This is useful when you are working in a temp container and want another tab that shares its cookies. The container then stays until all of its tabs are closed.

You can change both shortcuts in the Add-ons Manager (Manage Extension Shortcuts).

**What a temp container is**

Every temp container is a Firefox container with a name like "Temp" followed by a random emoji and a number, so that you can tell them apart. All of them use the color and the circle icon you chose in the options. Sites in different containers cannot see each other's cookies and stored data.

**Automatic cleanup**

When you close a tab, the add-on waits a few seconds (5 by default) and then removes all temp containers that no longer have any open tab. Removing a container deletes its cookies and site data. The add-on also does this check a few seconds after the browser starts, so that temp containers left over from a crash or a restart disappear too.

**Options**

Open the add-on preferences in the Add-ons Manager. Changes are saved immediately.

- **Toolbar button**: open the address of the active tab (default), or an empty new tab.
- **Container color**: the color of new temp containers. Choose from turquoise (default), blue, green, yellow, orange, red, pink and purple.
- **Cleanup delay**: how many seconds an empty temp container is kept before it is removed, from 1 to 600. The default is 5.

**Good to know**

- Cleanup removes every container whose name starts with "Temp" and which has no open tab, not only the ones created by this add-on. Do not use names that start with "Temp" for containers you want to keep.
- Closing the last tab of a temp container is final. The cookies, logins and site data of that container are deleted.
- Opening many links at once creates many containers, one for each link.

**Permissions and privacy**

- contextualIdentities and cookies: create temp containers and remove them again.
- tabs: open tabs in the containers and read the addresses of tabs.
- bookmarks: read bookmarks and bookmark folders to open them.
- menus: add "Open Temp Container" to the right click menus.
- storage: keep your settings on your computer.

The add-on does not collect or transmit any data.
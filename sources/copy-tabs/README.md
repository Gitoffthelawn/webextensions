Copy the addresses of your tabs to the clipboard as plain text or as HTML hyperlinks, for one tab, a tab group, the whole window or a selection of tabs, optionally with the tracking parameters removed.

**The idea**

Every copy action is a combination of three choices, shown with emoji in the menus and buttons:

1. **Scope**: which tabs
   - 🖱️ the tab you right clicked
   - 🗂️ the tabs in the tab group of the tab you right clicked
   - 🪟 all tabs in the window
   - 🎯 the selected (highlighted) tabs
2. **Format**: how they are copied
   - 📄 plain text, one URL per line
   - 🔗 HTML hyperlinks, with the page title as the link text
3. **Clean** (optional): 🧹 removes the parameters from the URLs

For example, 🪟+🔗 copies all tabs of the window as hyperlinks, and 🎯+📄+🧹 copies the selected tabs as clean plain text URLs.

**Quick start**

1. Click the toolbar button to open the panel and choose a copy action. The panel shows how many URLs were copied.
2. Paste the result wherever you like.

The same actions are also available from the tab context menu, from the middle mouse button on the toolbar button and from keyboard shortcuts.

**Pasting hyperlinks**

The 🔗 actions put two versions on the clipboard: HTML links and plain URLs, one per line. Rich text editors, mail programs and word processors paste the links with the page titles. Plain text editors paste the URLs.

**Where to find the actions**

- **Toolbar button**: a left click opens the panel with all eight combinations of scope (window or selection), format and clean. A middle click runs your chosen action right away.
- **Tab context menu**: right click a tab. The first entries copy only that tab (🖱️), followed by the entries for the tab group (🗂️, only shown when the tab is in a group), then the entries for the window (🪟) and the selection (🎯).
- **Keyboard shortcuts**: all eight window and selection actions can have their own shortcut. None is set by default. Assign them in the Add-ons Manager (Manage Extension Shortcuts).

**Choose the middle click action**

Right click the toolbar button and open "Select MMB Action" to choose which of the eight actions a middle click runs. The tooltip of the toolbar button always shows what the left and the middle click do.

If you prefer it the other way around, tick "Swap LMB and MMB actions" on the options page. Then a left click runs the chosen action and a middle click opens the panel.

**Clean copy (🧹)**

The clean actions remove everything after the path of the address: all parameters (the part after the ?) and also the #fragment. For example:

    https://example.com/article?id=7&utm_source=news#comments

becomes

    https://example.com/article

If a website needs certain parameters to work, you can keep them with the clean copy exceptions on the options page. Write one website per line, followed by the names of the parameters to keep, separated by spaces or commas. Lines that start with # are comments.

    # Examples:
      mozilla.org utm_source utm_medium
      w3c.org page lang

The website name has to match the host name of the address exactly. For example, mozilla.org does not cover www.mozilla.org, so add a line for each host name you use. Lines with only a website name and no parameters are ignored. Changes are saved automatically.

**Which tabs are copied**

- Only tabs of the current window.
- Hidden tabs are skipped.
- Only web pages are copied. Browser pages such as about: pages are skipped.

The toolbar button is briefly disabled after a copy, which tells you that the action has been carried out.

**Options**

- **Swap LMB and MMB actions**: see above.
- **Clean Copy Exceptions**: the parameters to keep for specific websites.

**FAQ**

*After a clean copy, some parameters are missing.*
The clean copy removes all parameters. Add the website and the parameters to keep to the clean copy exceptions on the options page.

*Can you add feature XYZ?*
If you need more than copying addresses, such as other formats or more details about the tabs, take a look at the add-ons "Get Tabs Infos" and "Gather from Tabs". They probably cover it.

**Permissions and privacy**

- clipboardWrite: put the copied addresses on the clipboard.
- tabs: read the addresses and titles of the tabs.
- menus: add the entries to the tab context menu and to the toolbar button menu.
- storage: keep your settings on your computer.

The add-on does not collect or transmit any data.
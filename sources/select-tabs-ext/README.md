Select tabs in many ways: by site, container, group, relation to the current tab, state, last access time, or with your own small scripts. Once the tabs are selected, you can use Firefox's own tab actions on all of them at once, for example close, move, bookmark or reload.

**Quick start**

1. Click the toolbar button. The selector window opens. It controls the window you came from.
2. Click a filter, for example "Same Domain". The tabs that it would select are listed on the right. Nothing is selected yet.
3. Click "Apply" (or press Ctrl+Enter) to select exactly the listed tabs.
4. Right click one of the selected tabs and use any of the tab actions of Firefox.

The tab that was active when you opened the window is the reference tab for filters like "Same Domain" or "Siblings". It is shown at the top of the window. "Use active" makes the tab that is active right now the reference tab.

**The selector window**

- **Filters on the left**: they are sorted into sections and only one section is open at a time. Use the arrow keys, Home and End to move between the section headers. The window remembers which section was open.
- **Search field**: type to narrow the filter buttons down. Enter previews the first match, and Escape clears the search.
- **Preview on the right**: lists the tabs the current filter would select, in tab order. The reference tab is marked. "Refresh" evaluates the filter again, for example after tabs have changed. The bar between the filters and the preview can be dragged to resize the preview.
- **Apply**: selects the previewed tabs. It shows the number of tabs, for example "Apply (5)". If tabs were closed or moved since the preview, it uses their current state, or tells you to refresh.
- **Status line**: tells you what the last action did or why nothing happened.

The window stays open, so you can preview and apply one filter after another.

**Filters**

- **General**: All. Invert Selection (select what is not selected now). Same Container. Same Group. Bookmarked (tabs whose address is bookmarked).
- **Relationship** (based on which tab opened which): Descendants, Siblings, Children, Parent, Ancestors. These need the opener tab to still exist in the same window.
- **Directional**: To the Left, To the Right of the reference tab.
- **URL Property**: Same URL, Same Origin, Same Domain, Same Port, Same Protocol.
- **State**: Pinned, Muted, Loading, Complete, Audible, Auto Discardable.
- **Last access time**: a slider with two thumbs selects the tabs that were last used between two points in time. A mark for every tab shows how the tabs are spread over time. Presets give you "Last hour", "Last 24 h", "Older than 1 day" and "Older than 1 week". "narrow current selection" only keeps tabs that are selected right now. "Refresh range" re-reads the access times.
- **User Scripts**: filters you write yourself (see below).

Only the tabs of the window the selector was opened for are used, and hidden tabs are ignored. After "Apply", the reference tab stays the active tab where possible.

**User scripts**

A script is the body of a function that decides for each tab whether it should be selected. It must return true for every tab that should be selected. Two things are available in it:

- cmpTab: the tab that is being tested.
- clkTab: the reference tab.

Both have the usual tab properties such as url, title, pinned, audible, lastAccessed and cookieStoreId. The code runs inside the page of the tested tab, so document and window are available too. For example:

    const host = (u) => new URL(u).hostname.replace(/^www\./, "");
    return host(cmpTab.url) === host(clkTab.url);

Tabs where scripts are not allowed, such as about: pages and the add-on store, never match.

**Groups of scripts**

Scripts belong to groups. In the selector window every group that has at least one enabled script is a button. It previews the tabs that match all enabled scripts of that group. Scripts that are not enabled are never run. "Scripts…" at the bottom of the section opens the options page.

The keyboard shortcut "UserScripts" selects the tabs that match the enabled scripts of all groups at once, so a tab has to match every one of them.

**The options page**

Click "Scripts…" in the selector window, or open the add-on preferences. The page shows all scripts in a table.

- Columns: Enabled, Group, Tags and Annotation (the last two can be shown with the "Options" button), and the code.
- **New**: adds an empty script at the top. **Delete**: removes the selected scripts.
- **Import**: adds the scripts of a JSON file to the table. **Export**: saves the selected scripts, or all of them if none are selected.
- Drag a row to change the order. Groups can be opened and closed, and a click on a group title selects or deselects its scripts. The Group, Tags and Annotation columns have filters.
- **Save**: stores your changes. Until then the Save button is highlighted and a note says "Unsaved changes". **Discard** throws the changes away. Firefox warns you when you leave the page with unsaved changes.

On a fresh installation, the add-on adds a set of example scripts, all switched off. They cover same host, same base domain, same page without the query and fragment, a pattern for addresses, a word in the title, same title, not used for 7 days, same container and not pinned, neither pinned nor audible, pages with a video, pages with text typed into a form, and pages that contain a phrase. Switch on the ones you want. They are also a good base for your own.

**Keyboard shortcuts**

Every filter can have its own shortcut, and so can "Open Selector". None has a default key. Assign them in the Add-ons Manager (Manage Extension Shortcuts). A shortcut selects the tabs right away, without a preview, and shows what happened in a notification. "Same Container" narrows an existing selection of several tabs down to those in the same container, instead of widening it.

**Good to know**

- Scripts run inside the pages of the tabs they test and can do what any script in that page can do. Only import scripts you understand and trust.
- If a filter finds no tabs, the selection is left unchanged.
- The selector window is re-created for the window it was opened from. Only one is open at a time.

**Permissions and privacy**

- tabs and all websites: read tab properties, run your scripts in the tabs, and select tabs.
- bookmarks: for the "Bookmarked" filter.
- notifications: show the result of keyboard shortcuts.
- storage: keep your scripts on your computer.

The add-on does not collect or transmit any data.
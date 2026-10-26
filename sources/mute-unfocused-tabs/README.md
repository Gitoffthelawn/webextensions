Only the tab you are looking at can make sound. Every other tab is muted automatically, and a tab is unmuted again as soon as you switch to it. You can exclude tabs or whole sites, or switch to a whitelist mode where only the sites you list are managed.

**Quick start**

1. Install the add-on. It starts working right away: all web pages (http and https) in the current window are muted while they are in the background.
2. Switch between tabs as usual. The tab you switch to becomes audible, the tab you leave is muted.
3. To keep a tab audible in the background, click the toolbar button while that tab is selected, or right click the tab and choose "exclude".

**Toolbar button**

The badge on the toolbar button shows the state of the current tab:

- **ON** (green): the tab is managed. It is muted whenever it is not the selected tab. Clicking the button excludes the tab.
- **OFF** (red): the tab is not managed and keeps whatever sound state it has. Clicking the button includes the tab again.
- **NA** (white): the page is not a web page (for example an about: page) and the button is disabled. The add-on only works on http and https pages.

Hover over the button to see what a click will do ("exclude" or "include").

**Tab context menu**

Right click a tab and choose "exclude" or "include". If the tab is part of a multiple selection (Ctrl or Shift click on tabs), the entry applies to all selected tabs of the window.

These manual choices are remembered only for the current browser session and only for that tab. They are cleared when the tab is closed and whenever you change a setting on the options page.

**Settings**

Open the add-on preferences in the Add-ons Manager. Changes are saved automatically.

- **Consider all Windows**: off by default, so only the tabs of the current window are managed. When on, tabs in all windows are managed, and only the selected tab of the focused window is audible.
- **Whitelist mode**: off by default. Off means every web page is managed except the ones that match your list. On means only the pages that match your list are managed and everything else is left alone.
- **List of regular expressions**: one expression per line. Each expression is tested against the full address of the tab, for example:

    ^https:\/\/www\.facebook\.com.*
    ^https:\/\/example\.net.*
    ^https:\/\/.*\.wikipedia\.org.*

  Empty lines are skipped and lines that are not valid regular expressions are ignored.

**How the manual choice and the list work together**

A manual "exclude" or "include" flips the result of the list for that one tab:

- Whitelist mode off: a tab is managed unless it matches the list. Excluding a tab stops it from being managed. Including a tab that matches the list makes it managed anyway.
- Whitelist mode on: a tab is managed only if it matches the list. Including a tab that does not match the list makes it managed. Excluding a tab that matches the list stops it from being managed.

**Good to know**

- A managed tab is unmuted every time you switch to it, even if you had muted it by hand before.
- Excluding a tab does not unmute it. If it was muted in the background, it stays muted until you switch to it or unmute it yourself.
- Like most add-ons, it does not run in private windows unless you allow it in the Add-ons Manager.

**Permissions and privacy**

- tabs: read the address of tabs and mute or unmute them.
- storage: keep your settings on your computer.
- menus: add "exclude" and "include" to the tab context menu.

The add-on does not collect or transmit any data. Your settings stay in your browser.

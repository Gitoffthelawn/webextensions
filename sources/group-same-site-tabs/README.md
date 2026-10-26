Sort your tabs into Firefox tab groups by website. Every group is named after its site and can be created collapsed or open. Do it for all tabs, for the tabs you selected, or for a single site.

**Quick start**

1. Click the toolbar button. All tabs of the window are moved into tab groups, one group for each site, and the groups are collapsed.
2. To keep the groups open, use a middle click on the toolbar button instead.

**Ways to group**

- **Toolbar button**: a left click groups all tabs of the window into collapsed groups. A middle click does the same with open groups.
- **Tab context menu**: right click a tab and choose "Group by Site(s)". If the tab is part of a multiple selection (Ctrl or Shift click on tabs), only the sites of the selected tabs are grouped. Otherwise only the site of the tab you clicked is grouped. Click the entry for collapsed groups, or click it with the middle mouse button for open groups.
- **Keyboard shortcuts**: four actions can have their own shortcut: "Group All Sites", "Group Selected Sites", "Group All Sites (uncollapsed)" and "Group Selected Sites (uncollapsed)". None of them has a default key. Assign them in the Add-ons Manager (Manage Extension Shortcuts).

**What gets grouped**

- Only the tabs of the current window.
- Pinned tabs and hidden tabs are left alone.
- Only web pages (http and https) are grouped. Other pages stay where they are.
- All tabs of a site end up in the same group, even if they were far apart in the tab bar.
- The title of a group is the name of the site, for example google.com.

**Domain or full subdomain**

By default, tabs are grouped by the domain, so mail.google.com and drive.google.com end up together in a group called google.com. The domain is taken as the last two parts of the host name.

On the options page, a list of subdomains lets you change this for specific hosts. There are two ways to use it:

- **Keep these subdomains separate** (default): hosts in the list get their own group named after the full host name. Everything else is grouped by domain.
- **Merge these subdomains into the domain**: hosts in the list are grouped by domain. Everything else keeps its full host name.

Write one host name per line, exactly as it appears in the address bar, without https:// and without a path, for example:

    mail.google.com
    addons.mozilla.org
    support.example.com

The options page counts the hosts in your list and shows an example that matches your choice. Click "Save" to apply your changes.

**Good to know**

- Every time you group, new groups are created for the sites. Tabs that were already in a group are moved into the new group of their site, so groups you made yourself, with your own names and colors, are not kept for those tabs.
- For sites with a two-part ending, such as .co.uk or .com.au, the last two parts of the host name are only the ending, so all those sites end up in one group. To avoid this, use the list with the mode "Keep these subdomains separate", and add the host names of those sites, for example www.example.co.uk.
- Host names in the list have to match exactly. Leave out spaces at the end of a line.
- Tab groups need a Firefox version that supports them.

**Permissions and privacy**

- tabs: read the addresses of your tabs to find out which site they belong to.
- tabGroups: create tab groups and give them names.
- menus: add "Group by Site(s)" to the tab context menu.
- storage: keep your subdomain list and your mode on your computer.

The add-on does not collect or transmit any data.
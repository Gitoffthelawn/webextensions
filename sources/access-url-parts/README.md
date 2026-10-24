Quickly jump to any part of the current tab's URL. 
Click the button in the address bar and the popup lists the host, every path segment, the query string and the fragment as clickable rows. Each row opens the URL up to that point.

**Example**

For `https://www.example.com/docs/guide?lang=en#install` the popup shows:

* `www.example.com`
* `docs` (opens `https://www.example.com/docs`)
* `guide` (opens `https://www.example.com/docs/guide`)
* `?lang=en`
* `#install`

**Features**

* Page action button in the address bar, available on every page
* Click a row to open that part of the URL in a new tab, a background tab or the current tab
* Middle-click always opens a background tab
* Optional copy button on every row to copy the URL of that part
* The row matching the current page is highlighted
* Optional rows for each domain level (`example.com`, `www.example.com`, ...), the protocol, and every query parameter on its own
* Public suffixes are handled correctly, so `foo.co.uk` is treated as one registrable domain
* Light, dark or browser-controlled theme, adjustable font size, compact rows and a maximum label length
* Keyboard shortcut support: assign one under Manage Extension Shortcuts in the add-ons manager

**Usage**

1. Open any web page
2. Click the Access URL Parts button in the address bar
3. Click the part of the URL you want to open

**Options**

Open the settings with the Settings button in the popup, or from the add-ons manager.

* Behavior: where a click opens the URL (new tab, background tab, current tab), and whether to show the copy button
* Which parts to show: protocol in the first row, each domain level, the query string as one row, each query parameter as its own row, the fragment, and decoding of %-escapes in labels
* Appearance: theme, font size, maximum label length and compact rows

All options can be reset to their defaults with one click.

**Permissions**

* `activeTab`: read the URL of the current tab when you open the popup
* `storage`: save your settings
* `publicSuffix`: find the registrable domain so domain levels are split correctly

The add-on collects no data and makes no network requests.

**Requirements**

Firefox 153 or newer.
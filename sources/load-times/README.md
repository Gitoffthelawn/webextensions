See how long your pages take to load. A small colored number in the address bar shows the load time of the current page, and a list shows the load times of all your tabs.

**Quick start**

1. Open a web page and wait for it to load.
2. Look at the small square in the address bar. The number in it is the load time, and the color tells you if that is fast or slow.
3. Click the square to see the load time and the address of this page. Click the toolbar button to see all tabs of the window.

**The load time**

The load time is the time from the start of the navigation until the page has finished loading. Only web pages (http and https) are measured. If a page cannot be reached, the time until the error is shown.

**The address bar icon**

Every page that has been measured gets a small square in the address bar. It shows the load time in milliseconds, for example 450. Longer times are shortened, so 2k means about 2,000 milliseconds, which is 2 seconds. The color tells how fast the page was:

- **green**: less than 1 second
- **yellow**: from 1 to 2.5 seconds
- **orange**: from 2.5 to 5 seconds
- **red**: 5 seconds or more

Hover over the square to read the exact time ("Load Time: 1234 ms"). Click it to open a small list with the position, the address and the load time of the current tab.

**The toolbar button**

Click the toolbar button to see a list of all tabs of the current window that are web pages. For each tab it shows:

- **Idx**: the position of the tab in the tab bar, starting with 1.
- **URL**: the address of the page.
- **Load Time (ms)**: the load time in milliseconds, or "n/a" if there is none.

Click a row to switch to that tab.

**When you see "n/a"**

- The page is still loading.
- The page was loaded before the add-on was installed or started, for example tabs that Firefox restored when it started. Reload the tab to measure it.

**Good to know**

- Every time a tab loads a new page, its time is measured again and replaces the old one.
- The times are kept while the browser is running and are forgotten when you close the tab. Nothing is saved to disk.
- The time measures the loading of the page itself. Content that a page loads later, after it has finished loading, is not included.

**Permissions and privacy**

- tabs: read the addresses of your tabs for the list.
- webNavigation: find out when a page starts and finishes loading.

The add-on does not collect or transmit any data.
Keeps tabs that open in the background empty until you switch to them. This saves bandwidth, memory and CPU, and stops pages from running scripts or playing sound before you have even looked at them.

**What it does**

When a page is opened in a new tab without switching to it (middle click, "Open Link in New Tab", links from other applications), the add-on stops the page from loading. The address is remembered. As soon as you switch to that tab, the page loads. Until then the tab stays empty.

The following is not affected:

- tabs that were already open when the add-on started, and tabs that you open in the foreground
- tabs that have been selected once or have already loaded something
- everything while the add-on is paused

**Quick start**

1. Install the add-on. The options page opens once with a short welcome message.
2. Choose a mode (see below) and add URL patterns, one per line.
3. Open some links in the background and see that they stay empty until you click on them.
4. Click the toolbar button at any time to pause or resume the add-on.

Important: the default is Whitelist mode with an empty list. This holds back every background tab. Add patterns for the sites that should always load in the background, or switch to Blacklist mode to hold back only specific sites.

**Modes**

- **Whitelist** (default): only URLs that match a pattern may load in the background. Everything else is held back.
- **Blacklist**: only URLs that match a pattern are held back. Everything else loads normally.

**URL patterns**

- One regular expression per line.
- Each pattern is tested against the full address of the page, so anchor it with ^ if you want to match the beginning of the address.
- Empty lines are ignored. Lines that are not valid regular expressions are ignored too. The options page shows the first error with its line number and counts your patterns.
- Examples:

    ^https:\/\/www\.facebook\.com.*
    ^https:\/\/example\.net.*
    ^https:\/\/.*\.wikipedia\.org.*

Changes are saved automatically while you type.

**Toolbar button**

- Badge **on** (green): the add-on is active.
- Badge **off** (red): the add-on is paused. All tabs load as usual.
- Click the button to switch between the two. The options page shows the same state at the top ("Active" or "Paused").

**Good to know**

- Changing the mode or the patterns, and pausing or resuming, resets the add-on. All tabs that are open at that moment are treated as already loaded. A tab that was still waiting for you stays empty and has to be reloaded by hand.
- Only the first page of a tab is held back. Once a tab has loaded something or has been selected, links you click inside it load normally.

**Permissions and privacy**

- webRequest, webRequestBlocking and all websites: hold back the loading of the page in a background tab.
- storage: keep your mode, your patterns and the paused state on your computer.

The add-on does not collect or transmit any data. The addresses of waiting tabs are only kept in memory until you open the tab or close it.

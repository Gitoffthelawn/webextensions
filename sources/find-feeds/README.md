Adds a toolbar button to find RSS, ATOM and JSON feeds

Click the toolbar button to start the detection of page related feed-like assets (left click opens a popup window, middle click opens a tab).

**Detection**
- Feeds the page declares itself (`<link rel="alternate">`) are always checked and marked "declared".
- The addon also has a basic set of detection functions to find potential feed urls, that can be customized by the user. The options page lists all detector rules (site URL regex + JS code that returns candidate feed URLs for that site). You can edit, add, or delete rules there, test a rule against the page in your last used tab, restore missing default rules, and use Import/Export to save or share your rule set as JSON.
- Every candidate is verified by looking at the actual response (not only the Content-Type header), so feeds served with an unusual content type are found and sitemaps/HTML pages are ignored. Candidates are checked in parallel.
- Optional: detect automatically when a page finishes loading and show the number of feeds found as a toolbar badge (options page, off by default).

**Found feeds window**
- Shows the feed title, item count and date of the latest item for each feed.
- Preview opens a rendered view of the feed (search, raw source, audio enclosures) in a new tab.
- Copy a single URL, copy all/shown URLs, or select several rows to copy or remove them.
- Filter by type or text, sort by declared/title/type/newest.
- Removed feeds are kept in a "Removed" list and can be restored; they are left out of Copy all.
- Export the listed feeds as an OPML file.
- Optional "Subscribe" button using a link template for your feed reader (options page).
- "Checked URLs" lists every candidate that was tested and why it was rejected.
- Opening a feed link from the window shows the feed as plain text instead of downloading it.

Search for text in all the tabs of your window at once. Matches show up as you type, with a bit of the surrounding text, and a click takes you to the exact spot in the right tab.

**Quick start**

1. Click the toolbar button or press Ctrl+Shift+F.
2. Type at least 3 characters. Results appear while you type, tab by tab, with the matches highlighted.
3. Click a result to switch to that tab and jump to the match.

**Searching**

- A search starts when you have typed 3 or more characters. The note under the search field tells you what is going on: "Type at least 3 characters", "No matches found", or the number of matches and tabs, for example "7 matches in 3 tabs". A progress bar shows how far the search is.
- The search covers the tabs of the window the button was used in. These are web pages that are fully loaded. Tabs that are still loading or have been unloaded are not searched. The list of tabs is taken when the search opens, so tabs opened later are not included until you open it again.
- Tabs are listed from the right-most to the left-most. Every tab with matches shows its icon and title and up to a few matches, each with about 20 characters of text around it.
- The search looks at the visible text of a page. Hidden elements, scripts and styles are skipped, and runs of spaces and line breaks count as a single space. Text inside embedded frames is not searched. The text of a page is read again at most every 30 seconds, so very recent changes on a page can take a moment to show up.

**Options**

- **Max**: the maximum number of matches shown per tab. The default is 3.
- **Aa**: match case. Off by default, so upper and lower case are treated alike.
- **áâã**: match diacritics. Off by default, so "e" also finds "é" and "è".
- **Regex** (the button with `.*`): regex mode. Your input is used as a regular expression (JavaScript syntax). It is case sensitive. Match case and match diacritics are switched off while regex mode is on.

The search text and all options are remembered for the next time.

**Going to a result**

Click a match, or the title of a tab, to:

- switch to that tab and bring its window to the front
- scroll to the match, about a third of the way down the page
- mark the match with a yellow box for a few seconds.
- highlight all other occurrences of the text on the page with the highlighting of the Firefox search

Clicking the title of a tab instead of a specific match jumps to its first match.

**Keyboard**

- **Up and Down arrow**: move through all the matches that are shown, across tabs.
- **Enter**: jump to the selected match. If nothing is selected yet, Enter uses the first match.
- Moving the mouse over a match selects it too, so the mouse and keyboard always agree.
- **Ctrl+Shift+F**: open the search. You can change the shortcut in the Add-ons Manager (Manage Extension Shortcuts).

**Popup or window**

The search can open in two ways. Pick one in the add-on preferences:

- **Classic toolbar popup**: closes as soon as you pick a result.
- **Standalone window**: a separate window that stays open after you pick a result, and that you can move and resize. After a jump, the focus returns to the search field, so you can go through result after result. If the window is already open, using the button again brings it to the front.

You can also right click the toolbar button and choose "Open in Window" to use the standalone window once, whatever you picked in the preferences.

**Appearance**

The preferences contain the stylesheet of the search as editable text, so you can change colors and sizes. "Reset to default" restores it. The stylesheet is also reset to the shipped one when the add-on is installed or updated.

**Permissions and privacy**

- all websites: a small script on every page reads the visible text of the page when you search.
- tabs: read the titles, icons and addresses of tabs and switch between them.
- find: highlight the occurrences on the page after a jump.
- menus: add "Open in Window" to the menu of the toolbar button.
- storage: remember your last search, your options and your preferences.

The add-on does not collect or transmit any data. The text of your pages is only searched on your computer and is never saved.
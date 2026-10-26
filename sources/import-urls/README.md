Pull the web addresses out of any text, such as an email, a chat log, a note or a file, then open them as tabs, optionally in a tab group, or save them as bookmarks.

**Quick start**

1. Click the toolbar button. The importer opens in a new tab. It also opens once after the installation.
2. Paste your text into the box, or drop a text file onto it.
3. Click "Extract URLs". The addresses found appear in a list.
4. Untick the ones you do not want, then open the selected addresses in tabs or add them to a bookmark folder.

**Step 1: provide the text**

- Type or paste text into the box.
- Drop a file onto the box, or click "Load from file", to read any text file.
- Click "Paste from clipboard" to read the clipboard. The first time, Firefox asks you to allow reading the clipboard.
- "Clear" empties the box.

Click "Extract URLs" to search the text. The result replaces the list of the last search. A message tells you how many addresses were found and how many of them are duplicates.

**Advanced: extraction pattern**

Open "Advanced: extraction pattern" to see the regular expression used to find addresses. By default it finds web addresses that start with http:// or https://. You can change it, for example to find only addresses of one website or to find other kinds of links. It is applied to the whole text, over several lines, and every match becomes one entry. A message tells you if the pattern is not a valid regular expression. "Reset" brings back the default. Your pattern is saved automatically and is kept when the add-on is updated.

**Step 2: review and select**

- Every address has a check box. Unticked addresses are greyed out and are ignored by the actions in step 3.
- The "x" button removes an address from the list.
- "Select all" and "Select none" change all addresses at once.
- "Remove duplicates" is on by default. It shows each address only once. Switch it off to see every match, including repeated ones. The choice is remembered.
- A counter shows how many addresses are selected.

**Step 3: open as tabs**

Click "Open selected in tabs" to open the selected addresses. The tabs open in the background, one after the other at the end of the tab bar of the current window. If there are more than 25, you are asked to confirm first.

- **load tab content**: off by default. The tabs are then opened without loading and a page only loads when you click its tab. That is easy on your computer and your connection when you open many addresses. Switch it on to load the pages right away.
- **delay**: the number of seconds to wait between opening two tabs. It is used when "load tab content" is on, to avoid loading everything at once.
- **add to a tab group**: puts the new tabs into a tab group.
  - **New group**: creates a new group. You can give it a name and pick a color (blue, cyan, grey, green, orange, pink, purple, red or yellow), or leave both on default.
  - **Existing group**: adds the tabs to a group that already exists in the current window. Choose it from the list. Use "Refresh list" if you created or renamed groups in the meantime.

Tab groups need a Firefox version that supports them. The option is disabled otherwise. All these settings are remembered.

**Step 3, alternative: add to bookmarks**

Choose a bookmark folder and click "Add to bookmarks" to create one bookmark for each selected address in that folder. The list shows all of your folders, with subfolders indented. When it is done, the folder choice is reset so that you do not add the same addresses twice by accident.

Bookmarks need an extra permission that is only requested on demand. Click "Enable bookmarks" and allow it in the Firefox prompt. After that, the folder list appears right away and on every later visit.

**Permissions and privacy**

- storage: remember your settings, such as the extraction pattern and the tab options.
- tabGroups: put the new tabs into tab groups.
- bookmarks (optional): only requested when you click "Enable bookmarks".
- clipboardRead (optional): only requested when you click "Paste from clipboard".

The add-on does not collect or transmit any data. The text you provide stays in the page and is never saved.
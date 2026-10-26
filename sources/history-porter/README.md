Carry your browsing history from one profile or computer to another. Export your history to a file, and import that file somewhere else.

**Quick start**

To move your history:

1. In the browser that has the history, click the toolbar button. The History Porter page opens in a tab.
2. Click "Save a copy" in the Export panel. A file named history.json is saved to your downloads folder.
3. Copy that file to the other profile or computer and open the History Porter page there.
4. In the Import panel, choose the file. A progress bar shows how far it is, and a message tells you the result.

Check your history afterwards. Then you can close the tab.

**Export**

"Save a copy" writes your complete browsing history to history.json. For every page in your history, the file contains the address, the title and the time of the last visit. A message tells you how many entries were saved.

Every page is saved once, with the time of its last visit. The number of visits and the earlier visits of a page are not part of the file.

**Import**

Choose a history.json file in the Import panel. The file is checked first. It has to be a list of entries, and each entry needs an address. If something is wrong, the message tells you which entry caused the problem and nothing is imported.

The entries are then added to your history, 100 at a time, with their title and their original visit time, so they appear in your history on the date of the visit. A progress bar and a counter show the progress. When it is finished, a message tells you how many entries were imported. If some entries could not be added, their number is shown too, with a hint to look at the console of the page for details.

- Importing only adds entries. Nothing in your existing history is removed or changed.
- Importing the same file again adds the visits again, so pages will count more visits than they really had. Import each file once.
- Large files can take a moment. Keep the page open until the message appears.

**The file format**

history.json is a plain JSON list. It is easy to create from other tools, too. Each entry looks like this:

    {
        "url": "https://example.com/page",
        "title": "Example page",
        "visitTime": 1760000000000
    }

The address is required. The title and the visit time are optional. The visit time is a number of milliseconds since 1 January 1970, which is what the export writes.

**Appearance**

The three buttons Auto, Light and Dark at the top right of the page switch the color theme. Auto follows your system. Your choice is remembered.

**Good to know**

- The add-on is not available in private windows.
- The add-on does not change anything in your history unless you import a file.

**Permissions and privacy**

- history: read your history for the export and add entries for the import.
- storage: remember the theme you chose.

The add-on does not collect or transmit any data. The exported file is saved on your computer, and it contains the addresses of the pages you visited, so keep it safe.
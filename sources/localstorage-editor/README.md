View and edit the local storage and the session storage of the current web page in one table. Add, edit, copy, delete, export and import entries and apply your changes to the page with one click.

**Quick start**

1. Open a web page and click the toolbar button. The editor opens with one row for every storage entry of the page.
2. Edit, add or delete entries. Nothing happens to the page yet.
3. Click "Submit" to write your changes to the page, or "Discard" to throw them away.

You can also assign a keyboard shortcut to the toolbar button in the Add-ons Manager (Manage Extension Shortcuts).

**The toolbar button**

- The button is only enabled on web pages. On other pages, such as about: pages, it stays disabled.
- A badge shows what the page currently stores: **L** for local storage, **S** for session storage, **SL** for both. No badge means that both are empty.
- A left click opens the editor as a popup. A middle click opens it in a separate window titled with the website name. That is handy for longer sessions, because the popup closes when you click somewhere else.

Only the storage of the page itself is shown, not the storage of frames embedded in the page.

**The table**

- **Handle** (far left): drag a row to change the order of the rows.
- **Check box**: selects a row. The check box in the header selects all rows that are currently shown by the filters. Selected rows are the ones that "Copy", "Export" and "Delete" act on.
- **SA** (storage area): **L** for local storage, **S** for session storage. Filter it to show only one area or both.
- **Key**: the name of the entry.
- **Value**: the content of the entry.
- **VL**: the length of the value.

The table is sorted by key and storage area at the start, and every column header can be clicked to sort. The filter fields in the headers narrow down the rows. Filtering does not change which rows are selected. Hover over a cell to see its full text.

Values that contain valid JSON are shown nicely formatted with line breaks and indentation.

**Editing**

- Click a key to change it, or the SA cell to switch between Local and Session.
- Click a value to edit it in the cell. Press Shift+Enter to accept the edit.
- Double click a value to open the row editor. It shows the storage area, the key and the value in a large text field with line numbers and a "wrap" switch. "Save" applies the changes to the row, "Discard" closes the editor without changes. Use it for long values such as JSON.
- "Add" inserts a new row at the top and selects it.
- "Delete" removes the selected rows.

All of this only changes the table. The page is not touched until you click "Submit".

**Checks before submitting**

- The storage area must be Local or Session.
- A key is required.
- A key can only be used once per storage area. The same key in local and in session storage is fine.

Cells that fail a check are highlighted. Hover over a cell to see the reason in the status line. Submit is refused as long as a check fails.

**Submit and Discard**

- **Submit**: writes the table to the page. The editor then reloads itself and shows what the page really stores.
- **Discard**: reloads the editor and drops everything you changed.

As soon as the table differs from the page, the outlines of Submit and Discard are highlighted.

Submit replaces the complete local and session storage of the page with the rows of the table. Rows you deleted are gone, and values that were shown formatted as JSON are stored in that formatted form. The page itself is not reloaded, so it may not notice the change before it reads its storage again. If a page has already read its storage into memory, reload the page.

**Copy, Paste and Export**

- **Copy**: copies the selected rows to the clipboard as JSON.
- **Paste**: reads JSON in the same format from the clipboard and adds its entries as new rows at the bottom. The new rows are selected. Entries that do not have a storage area, a key and a value as text are skipped. The status line shows how many items were imported.
- **Export**: saves the selected rows as a JSON file named like "Storage Export 2026-10-16_14-03-22 example_com.json".

Copy and Paste together duplicate entries. Change the key or the storage area of the new rows before you submit, because a key can only be used once per storage area. You can also copy entries from one page and paste them into the editor of another page.

**Select on load**

The check box "select on load" in the toolbar decides whether all rows are selected when the editor opens. It is off by default and the choice is remembered.

**Permissions and privacy**

- all websites: read and change the storage of the pages you use the editor on. A small script runs on every page. Every 3 seconds it checks whether the local and the session storage contain anything, only to show the badge. It never reads the content on its own.
- clipboardWrite and clipboardRead: needed for Copy and Paste.
- storage: remembers the "select on load" setting.

The add-on does not collect or transmit any data. Everything happens in your browser.
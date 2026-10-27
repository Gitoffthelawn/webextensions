Import or export a branch of your bookmark tree as JSON or HTML. A short step-by-step wizard guides you through it: choose Export or Import, then follow the steps. Exported bookmarks can be copied or saved to a file, and imports can be loaded from a file or pasted text.

**Features**

* Guided wizard: start with Export or Import and only see the steps you need
* Export the entire bookmark tree or any single folder with all its subfolders
* Export as JSON or as an HTML bookmarks file (Netscape format)
* Import JSON or HTML into any folder of your bookmark tree
* Save the exported data to a file with a file name of your choice, or open a JSON/HTML file to import it
* The file format is detected automatically when you open or paste data
* Optional "strip root node" on import, to merge the contents straight into an existing folder instead of creating an extra folder
* Light and dark theme, following the browser

**Usage**

To export:

1. Click the toolbar button to open the wizard and choose Export
2. Select the folder to export, or leave it on "Entire Bookmark Tree"
3. Select the format (JSON or HTML) and click Export
4. Copy the result, or enter a file name and click "Save file" to download it (the extension is added automatically)

To import:

1. Click the toolbar button to open the wizard and choose Import
2. Click "Open file" or paste your data (the format is detected for you)
3. Select the folder to import into
4. Check "Strip the root node" if you want to skip the top-level folder of the data
5. Click Import

**Notes**

* Imports add to the selected folder. Existing bookmarks are not replaced or removed.
* The root of the bookmark tree cannot be an import target, so select a folder first.
* Exported data always has one root node. Use "strip root node" to skip it when importing.
* Empty folders are skipped on import and in the HTML export.
* HTML import expects the standard bookmarks file structure, as written by this add-on and by most browsers.

**Permissions**

* `bookmarks`: read the bookmark tree (export) and create bookmarks and folders (import)

The add-on collects no data and makes no network requests. Files are read and written only when you click "Open file" or "Save file".

**FAQ**

*Where are my tags and keywords?*

The browser's bookmark API does not give access to them, so they can't be exported or imported.

*Why are the creation times wrong after an import?*

For the same reason: the API does not allow setting the creation time of a new bookmark, so imported bookmarks get the time of the import.

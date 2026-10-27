Shows all your bookmarks as text that you can read, edit, copy or download. Choose between an indented list, Markdown and a plain list of URLs.

**Quick start**

1. Click the toolbar button. A tab opens with your whole bookmark tree as text.
2. Pick a format at the top.
3. Click "Copy" to put the text on the clipboard, or "Download" to save it as a file.

The page can also be opened from the add-on preferences in the Add-ons Manager. Requires Firefox 140 or newer.

**Formats**

- **Indented text**: a header line, then every folder with a ">" in front, and every bookmark as "title : address". Subfolders and their bookmarks are indented by two spaces per level.

      > 2026-10-16 Export Bookmarks as Text
        > Bookmarks Toolbar
          Example Site : https://example.com/

- **Markdown**: a heading, then a nested list with the folders in bold and the bookmarks as Markdown links. Square brackets in titles are escaped.

      # 2026-10-16 Export Bookmarks as Text

      - **Bookmarks Toolbar**
        - [Example Site](https://example.com/)

- **URLs only**: one address per line, without folders or titles.

A bookmark without a title is listed with its address instead. A folder without a title is listed as "(no title)". Line breaks and repeated spaces in titles are replaced by a single space, so every entry stays on one line. Separators are left out.

**The buttons and options at the top**

- **Format**: the format of the text.
- **Wrap text**: wrap long lines instead of scrolling sideways.
- **Include empty folders**: off by default. A folder counts as empty if there is no bookmark anywhere inside it, so folders that only contain separators or other empty folders are hidden too.
- **Refresh**: read the bookmarks again.
- **Copy**: copy the text to the clipboard.
- **Download**: save the text as a file named like 2026-10-16-bookmarks.md. Markdown is saved as .md, the other two formats as .txt.

On the right you see how many bookmarks and folders are in the text. Your choice of format, wrap text and empty folders is remembered.

**Editing the text**

The text area is editable, so you can remove or change lines before you copy or download the result. An "Edited" mark appears as soon as the text differs from what was generated.

Regenerating the text overwrites your changes. Because of that, you are asked to confirm before a change of the format, of "Include empty folders", a refresh or a click on the toolbar button replaces text you have edited.

**The view does not update by itself**

The text is a snapshot of your bookmarks from the moment it was generated. If you add or change bookmarks while the page is open, click "Refresh" or click the toolbar button again. Clicking the toolbar button while the page is open brings it to the front and reloads the bookmarks, instead of opening a second tab.

**Permissions and privacy**

- bookmarks: read your bookmarks. The add-on never changes them.

The add-on does not collect or transmit any data. The text is created in your browser and only leaves it when you copy or download it.
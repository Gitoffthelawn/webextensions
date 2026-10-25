Save a complete web page as an image with one click, not just the part that is visible. Works for a single tab or for many tabs at once, and gives you control over the format, the file name and the confirmation sound.

**Quick start**

1. Open the page you want to save.
2. Click the toolbar button (or use a keyboard shortcut, see below).
3. The image is saved to your downloads folder. A shutter sound tells you that the screenshot has been taken.

By default the page is saved as a JPEG with a file name made of the date and time, the page title and the address of the page. Everything can be changed on the options page.

**Keyboard shortcut**

You can assign a keyboard shortcut to the toolbar button in the Add-ons Manager (Manage Extension Shortcuts).

**Very tall pages**

Browsers can only create images up to a certain size. If a page is too big for one image, the add-on saves it as a series of images in a .cbz file instead. A .cbz file is a normal zip archive (a "comic book archive") that contains the parts in order, named 1, 2, 3 and so on. Comic book readers open it directly, and any zip program can extract the parts.

**Several tabs at once**

1. Select the tabs: Ctrl or Cmd click, or Shift click, on the tabs in the tab bar.
2. Click the toolbar button.

Every selected tab is saved as its own file, one after the other. The tooltip of the button shows the progress ("capturing tab 2 of 5") and a single sound is played when all screenshots have been taken. The result of each capture is shown on the badge of its own tab.

**The toolbar button**

- **+** (gray): ready to capture.
- A small animation on the badge: a capture is running. The button is disabled until it is finished.
- **✓** (green): the last capture of this page worked.
- **✕** (red): the last capture of this page failed.

Hover over the button to see the details, including the time and the reason of a failure. The result is shown on the tab that was captured and disappears when you open another page in that tab. Moving around inside the same page (for example to a #section) keeps it.

A capture can fail, for example, on pages that Firefox does not allow add-ons to access (such as about: pages and the add-on store), on tabs that have not been loaded yet (discarded tabs), or when the download itself fails.

**Options**

Open the add-on preferences in the Add-ons Manager. Changes are saved automatically. The options page also opens once after the installation.

- **Image format**: JPEG (smaller files, slight quality loss) or PNG (lossless, larger files).
- **JPEG quality**: from 1 to 100, default 90. It only applies to JPEG.
- **File name**: a pattern made of text and placeholders. Click a placeholder to insert it at the cursor. The default pattern is {timestamp}_{title}_{url}. A live preview shows the result for an example page.
- **Replace spaces with underscores**: on by default.
- **Sound**: switch it on or off, choose "Shutter", "Soft click", "Chime" or your own audio file (up to 1 MB), set the volume and use "Preview" to listen.

**File name placeholders**

- {timestamp}: date and time, for example 2026-09-28_14-03-22
- {date}: the date, for example 2026-09-28
- {time}: the time, for example 14-03-22
- {title}: the title of the page
- {domain}: the website without www., for example example.com
- {url}: the address without https:// and without the #fragment, for example example.com/articles/42

Everything else you type is kept as it is. Unknown placeholders are ignored and flagged on the options page. If you empty the field, the default pattern is used again, and "Reset" brings it back at any time.

Characters that are not allowed in file names are replaced. Very long names are shortened, and the title and the address are shortened first. Names that Windows reserves are avoided. If a file with the same name already exists, a number is added to the new one.

**Permissions and privacy**

- all websites and activeTab: measure the page and take the screenshot of the tab.
- downloads: save the image to your downloads folder.
- storage: keep your settings, including a custom sound file, on your computer.

The screenshots are made and saved locally on your computer. The add-on does not collect or transmit any data.
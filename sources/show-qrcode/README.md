Create QR codes for the current page, a selected text, a link, an image address or a bookmark. Copy or save them as PNG or SVG, or collect many of them on a board.

**Quick start**

1. Click the toolbar button. The popup shows a QR code for the text you have selected on the page, or for the address of the current tab if nothing is selected.
2. Change the text in the popup if you like. The QR code updates while you type.
3. Click "Copy" to put the image on the clipboard, or "Save" to save it as a file.

You can also assign a keyboard shortcut to the toolbar button in the Add-ons Manager (Manage Extension Shortcuts).

**Right click menu**

Right click on a selected text, a link, an image, a page, a tab or a bookmark and choose "Show QRcode". The popup opens with the matching content already filled in. The first match of this list is used:

1. the address of the bookmark
2. the selected text
3. the address of the link
4. the address of the image
5. the address of the page

Bookmark folders have no entry, only bookmarks with an address do.

**Types of codes**

The drop down at the top of the popup selects what kind of code to create. The add-on remembers your last choice.

- **URL or Text**: any text or web address.
- **E-Mail**: an email address, created as a mailto: code.
- **Phone Number**: a phone number, created as a tel: code.
- **Geo Location**: latitude and longitude, created as a geo: code.
- **WiFi**: network name, password, security type (WPA/WPA2, WEP or no password) and whether the network is hidden. Scanning the code with a phone lets it join the network.

A small counter shows the number of characters. If the text is too long for the chosen error correction level, the popup tells you to use shorter text or a lower level.

**Buttons in the popup**

- **Copy**: copies the QR code image to the clipboard.
- **Save**: saves the QR code as PNG or SVG. The file name is made from the content, for example example_com.png.
- **Board**: adds the QR code to the board (see below).
- **Clock button**: shows the recent codes. Click one to load it again.
- **Gear button**: opens the quick settings.

**Quick settings**

- **Filetype**: PNG or SVG for saved files.
- **Save size**: size of saved images in pixels (115 to 1000, default 460).
- **Error correction**: Low (7%), Medium (15%), Quartile (25%) or High (30%). Higher levels make the code more robust but denser.
- **Padding**: size of the empty border around the code.
- **Foreground and background**: a hex color code, a row of ready made colors and an opacity slider for each.

Settings are saved automatically and are shared by the popup and the board.

**Recent codes**

The last 8 codes you copied, saved or added to the board are remembered. Click a code to load it again, or use "Clear history" to remove them.

**QR Code Board**

The board is a page in a browser tab that collects many QR codes in a grid.

- Click "Board" in the popup to add the current code. The board tab is opened, or brought to the front if it is already open. Only one board tab is used.
- Select several tabs in the tab bar (Ctrl or Shift click) and open the popup. A button "Add N selected tabs to board" creates one QR code per tab in one go.
- Each card has "Copy", "Save" and "Edit" buttons and an x button to remove it. "Edit" loads the code into the composer.
- "New Code" opens a composer on the board page. It works like the popup, including the types, quick settings, history, Copy and Save, and has an "Add to board" button.
- Use the check boxes with "Select all", "Clear selection", "Save selected" and "Remove selected" to work with several codes at once. "Clear all" empties the board.
- Every card keeps the colors, padding and error correction level it had when it was added. File type and save size always follow the current quick settings.
- A code is only added once. Adding the same content with the same look again does nothing.

You can also open the board from the add-on preferences in the Add-ons Manager.

**Notes**

- On pages where Firefox does not allow add-ons to read the selected text, such as about: pages or the add-on store, the address of the tab is used.
- Opacity values below 16 (the very left end of the slider) currently give a higher opacity than expected. Values from 16 up are not affected.

**Permissions and privacy**

- activeTab and tabs: read the selected text and the address of the current tab, and the addresses of tabs you add to the board.
- menus: adds the "Show QRcode" entry to the right click menu.
- storage: keeps your settings, recent codes and board on your computer.
- clipboardWrite: copies the QR code image to the clipboard.
- bookmarks (optional): only needed for the right click entry on bookmarks.

QR codes are created locally in your browser. The add-on does not collect or transmit any data. Recent codes and board entries are stored locally and contain exactly what was encoded, which includes the password of a WiFi code. Use "Clear history" and "Clear all" or "Remove selected" on the board to delete them.
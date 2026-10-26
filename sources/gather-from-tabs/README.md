Run your own small JavaScript snippets in one or many tabs, collect what they return, and copy it, save it, download it or open it. Use it to gather links, titles, page text, metadata or anything else you can read from a web page.

**The idea**

A script is a piece of JavaScript that runs inside a web page and returns a text. Gather from Tabs runs it in the tabs you choose, joins the results, and then does what you ask with them: copy as text, copy as HTML, save to a file, download the results as files, open them in a window, or nothing at all.

**Quick start**

1. Install the add-on. The options page opens with 16 ready-made example scripts, for example "URL + Title", "Markdown Link", "Domain Only" and "CSV Row".
2. Select some tabs: Ctrl or Shift click on tabs in the tab bar.
3. Right click one of the selected tabs, open the Gather from Tabs entries, pick an action such as "Copy as Text", then pick a script.
4. Paste the result somewhere. The toolbar button shows a check mark for a moment to tell you that it worked.

**Running a script**

Right click a tab or a web page. The menu contains the actions "Copy as Text", "Copy as HTML", "Save Output to File", "Download as Files", "Open Window" and "Run Only (ignore output)". Each of them lists all of your scripts, and a final entry "Configure" opens the options page. You choose the action first and the script second. Firefox may collect these entries in a submenu named after the add-on.

Which tabs are used:

- If you right click a tab that is part of a multiple selection, all selected tabs of the window are used.
- Otherwise only the tab you clicked is used.
- Tabs that are still loading, tabs that are unloaded and tabs that are not web pages are skipped.

The results of the tabs are joined in tab order. If a script fails in a tab, for example on a page that Firefox does not let add-ons touch, the error message and the address of that tab are put into the output instead.

**The actions**

- **Copy as Text**: copies the output as plain text.
- **Copy as HTML**: copies the output as formatted HTML, so that links stay clickable when you paste them into an editor or a mail. The output is treated as HTML code, and line breaks become line breaks in the pasted text. Plain text is copied along with it.
- **Save Output to File**: saves the output as a text file named with the date, the time and "Gather from Tabs".
- **Download as Files**: treats the output as a list of web addresses and downloads every one of them. The script has to return an address per tab, or, from the menu, a list of addresses.
- **Open Window**: treats the output as a list of web addresses and opens all of them in a new window.
- **Run Only**: runs the script and ignores the result. Useful for scripts that do something on the page, such as clicking a button.

**Writing scripts**

- The first line of a script is its name in all the menus. Make it a comment, for example /* My script */.
- The value of the last expression of the script is its output. Wrapping the code in a function that is called right away and returns a text is the easiest way. A new script starts like this:

      /* new script */
      (() => {
          return "Hello World!\n";
      })()

- End every output with a line break, so that the results of several tabs end up on separate lines.
- A script can read and change the page like any other script, for example with document.title, document.location.href or document.querySelectorAll.
- Scripts run once in every chosen tab, separately.

The examples that come with the add-on gather the page address together with the title, the full text, the first paragraph, the first link, a meta description, the canonical address, the Open Graph image, the selected text, a word count or all links of the page. They also produce an HTML link, a Markdown link, a CSV row, JSON or just the domain. They are a good starting point for your own.

**The options page**

Click the toolbar button to open it. It has two tabs, "Scripts" and "Shortcuts".

**Scripts**

- The list on the left shows all scripts by their first line. Each one has a check box for the bulk actions, an export button and a delete button. A dot marks a script with unsaved changes.
- "New Script" adds a script. "Import" adds the scripts of a JSON file to the list. Imported scripts are always added to the existing ones.
- "Select all" and the buttons above the list export, reset or delete all checked scripts at once. Exporting writes a JSON file that you can share or import again.
- The editor on the right has syntax highlighting for JavaScript. "Fullscreen" enlarges the editor and the output, and Escape leaves it again. The list can be made wider or narrower by dragging the bar next to it. A double click on the bar restores the default width. Your width is remembered.
- "Run" (or Ctrl+Enter) tries the script on your selected tabs. Select one or more other tabs first, with Ctrl or Shift click. The result appears in the output panel below the editor, with buttons to copy it as text or as HTML.
- "Reset" brings the script back to the last saved version.
- "Save" stores all scripts. Empty scripts are dropped. The context menus are updated right away. Until you save, changes only exist on the page. The link "reload without saving" throws away all unsaved changes.

**Shortcuts**

Twelve slots, numbered 0 to 11, let you combine a script, a scope and an action under a keyboard shortcut:

- **Script**: one of your scripts.
- **Scope**: Current Window, Selected Current Window, All Windows or Selected All Windows.
- **Action**: Copy as Text, Copy as HTML, Save Output as File, Download as Files, Open Window or Ignore Output.

Click "assign shortcuts" to open the Firefox page where you give each slot ("Script-Scope-Action 0" and so on) a keyboard shortcut. None of them has a default key. Then a single key press runs the script on those tabs and carries out the action.

**Good to know**

- Scripts can do anything a web page can do, including reading the content of a page and contacting other sites. Only use and import scripts you understand and trust.
- Scripts only run in web pages, not in the pages of Firefox itself.
- Copy as HTML treats the output as HTML. If your output contains characters like < or &, use the text actions instead, or write the output as valid HTML.

**Permissions and privacy**

- all websites: run your scripts in the tabs you choose.
- clipboardWrite: copy the output.
- menus: add the actions to the context menus.
- storage: keep your scripts, your shortcut slots and the width of the script list.
- downloads: save files and download the addresses of the output.

The add-on does not collect or transmit any data. Your scripts and the gathered output stay on your computer.
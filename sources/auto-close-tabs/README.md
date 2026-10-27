Automatically closes tabs you haven't used for a while, based on rules you define. Closed tabs can be saved as bookmarks first, so nothing is lost.

**Quick start**

1. Open the add-on preferences (click the toolbar button, or go to the Add-ons Manager and open the preferences of Auto Close Tabs).
2. Open the "Close rules" section and click "+ Add close rule".
3. Choose an idle time, which tabs the rule applies to (container and URL pattern) and where to save the closed tabs.
4. Click "Save changes".
5. Turn auto-close ON with the "Turn on/off" button on the preferences page. The toolbar badge shows "on" or "off". Auto-close is OFF until you switch it on.

**How it works**

A tab is closed when ALL of these are true:

- It has not been accessed for at least the idle time of a close rule.
- Its container matches the rule's container setting.
- Its URL matches the rule's URL pattern (a regular expression).
- It is not matched by any ignore rule.
- Closing it would still leave at least "Tabs to keep" tabs open.

Each close rule checks your tabs on its own schedule, once per idle-time period. If more tabs qualify than can be closed, the least recently accessed tabs are closed first.

The add-on never touches:

- the active tab
- pinned tabs
- tabs that are playing audio
- tabs outside of normal browser windows

**Settings**

- **Tabs to keep**: the minimum number of tabs that always stay open (default 7), no matter how long they have been idle.
- **Auto save (default folder)**: tabs closed automatically are first saved as bookmarks in this folder. Choose "Don't save (just close)" to disable bookmarking.
- **Close rules**: each rule has these fields:
  - **Idle for**: a time in seconds, minutes or hours.
  - **Container**: see "Container matching" below.
  - **Save to**: the bookmark folder for tabs closed by this rule. Choose "Default folder" to use the folder from the Auto save setting, or "Don't save (just close)" to skip bookmarking for this rule.
  - **URL matches**: a regular expression, required. Tip: the field suggests patterns, including ones for the sites you currently have open.
- **Ignore rules**: tabs matching an ignore rule (container + URL pattern) are never closed, even if a close rule matches. Ignore rules always win over close rules.

**Container matching**

Firefox container tabs can be targeted separately from normal tabs. The container setting of a rule combines two independent options:

- **No container** (checkbox): matches tabs that are not in a container.
- **No container pattern / Any container / Custom pattern** (dropdown): "Any container" matches tabs in any container. "Custom pattern" matches tabs in a container whose name matches your regular expression.

The two options can be combined. For example, "No container" together with "Any container" matches every tab. At least one option must be active, otherwise the rule can never match a tab. Tabs in private windows count as "no container".

**Editing helpers**

- Each rule shows how many of your currently open tabs its URL pattern and container settings match, so you can check a rule before saving it.
- Rules can be reordered, duplicated and removed. Invalid rules are highlighted and block saving until fixed.
- A link next to each URL field opens the pattern in regex101.com for testing.
- A banner reminds you of unsaved changes, and "Discard changes" restores the last saved state.
- Use "Export config" and "Import config" to back up your settings or move them to another profile as a JSON file. An imported config is not active until you click "Save changes". Bookmark folders are specific to a profile, so a folder that does not exist is replaced by the default folder.

**Examples**

- Close any tab that has been idle for 2 hours, and save it as a bookmark:
  idle 2 hours, container: "No container" + "Any container", URL: ^https?:\/\/.*
- Close tabs in a container named "Tmp" after 10 minutes, without saving them:
  idle 10 minutes, container: custom pattern ^Tmp$, URL: ^https?:\/\/.*, save to: Don't save
- Never close your mail tab (ignore rule):
  container: "No container" + "Any container", URL: ^https?:\/\/mail\.example\.com\/.*

**Permissions**

- tabs: read tab URLs, titles and last access times, and close tabs.
- alarms: run the periodic checks for each close rule.
- bookmarks: save closed tabs as bookmarks and list your bookmark folders.
- contextualIdentities: read container names so rules can match them.
- storage: store your settings locally.

The add-on does not collect or transmit any data. All settings stay in your browser. It also runs in private windows, so tabs closed there are bookmarked like any other tab unless the rule says "Don't save".

**Links**

Source code and issue tracker: https://github.com/igorlogius/webextensions/tree/main/sources/auto-close-tabs

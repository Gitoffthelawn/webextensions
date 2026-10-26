A Firefox extension that adds extra actions to links and to links inside a text selection. Every action is also available as a keyboard shortcut.
Features

    Extra link actions: Open in tabs, open in unloaded/unloaded tabs, open in specific windows, bookmark, download, and copy links with custom formats
    Text selection support: Actions available for links selected within document text
    Keyboard shortcuts: All actions assignable via about:addons → gear menu → Manage Extension

Permissions

| Permission | Purpose |
|------------|---------|
| activeTab | Required to access tab-based actions |
| clipboardWrite | Used for copying links and formats |
| menus | Required for browser action UI |
| storage | For storing settings/options locally |
| bookmarks | Enables bookmark links functionality |
| downloads | Enables download link functionality |
| notifications | Shows short message after each action |

Available Actions

    open_tabs: Opens selected links in browser tabs
    open_unloaded: Opens selected links in unloaded/unloaded browser windows
    open_window: Opens selected links in specific window contexts
    bookmark: Creates bookmarks for selected link entries
    download: Downloads links to the default download folder
    Copy formats (HTML, HTML w/o params, Markdown, Markdown w/o params, BBCode, LaTeX) - one or two URL formats supported

Configuration Options

Settings are managed in options.html with tabs including:

    Link format options per copy action row (default: URL only)
    Default bookmark folder configuration
    Optional permissions list and grant/revoke controls
    Keyboard shortcuts setup

Keyboard Shortcuts

All actions can be configured via the Extensions manager. Default shortcuts include:

    Format-based copy actions (1-10)
    Open in tabs/windows
    Bookmarks and downloads
# NAME

**copy-tabs** - copy tab URLs as HTML hyperlinks or as plain text, similar to MS Edge, but better since this addons supports copying mutliple tabs at once

# SYNOPSIS

click the toolbar button to access the copy modes, or select a set of tabs and use the context menu to invoke the copy action, or set a custom shortcut for each of the copy actions.

1. Pick Copy Scope
    • 🖱️ Clicked Tab
    • 🗂️ Tabs in Group
    • 🪟 Tabs in the Window
    • 🎯 Selected/Highlighted Tabs

2. Pick Copy Format
    • 📄 Plain Text URLs
    • 🔗 HTML Hyperlink URLs 

3.  🧹 Clean URLs  

# USER INPUTS

- scope 
- action

# OPTIONS

- toggle to swap the LMB and MMB toolbar action
- modify the cleanup function to decide what you want to strip form the URL

# REQUIRED PERMISSIONS

- **clipboardWrite**: used to place the URLs into the clipboard 
- **menus**: used to add the menu items
- **storage**: used to store the timer name and end time.
- **tabs**: used to access the URLs of the involved tabs 

# OPTIONAL PERMISSIONS

none 

# DEMO VIDEO

https://github.com/user-attachments/assets/6ce15126-246d-450f-b10f-3d201274d9a9

# COMMON ISSUES / FAQ

**After copy Some parameters are missing**

The clean copy mode removes all url parameters. This can be fruther customize to only remove certain paramters on specified URLs via the preferences page where the processing function is exposed and can be edited.

**Can you function/feature XYZ?**

No. if you need more functionality, please take a look some of my other addons. The ones that allow you to do more but also require more permission are [Get Tabs Info](https://addons.mozilla.org/firefox/addon/get-tabs-infos/) and [Gather from Tabs](https://addons.mozilla.org/firefox/addon/gather-from-tabs/)

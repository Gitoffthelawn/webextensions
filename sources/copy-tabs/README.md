# NAME

copy-tabs

# SYNOPSIS

Copy tab URLs as HTML hyperlinks or as plain text, similar to MS Edge, but better since this addons supports copying mutliple tabs at once.
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
- **menus**: used to add the context menu entry
- **storage**: used to store the MMB/LMB action state  and the custom parameter function
- **tabs**: used to access the URLs of involved tabs 

# OPTIONAL PERMISSIONS

none 

# DEMO VIDEO

https://github.com/user-attachments/assets/6ce15126-246d-450f-b10f-3d201274d9a9

# COMMON ISSUES / FAQ

**After copy Some parameters are missing**

The clean copy mode removes all url parameters. This can be customize to only remove certain paramters on specified URLs via the options page where the processing function can be edited.

**Can you add feature XYZ?**

Please take a look at [Get Tabs Info](https://addons.mozilla.org/firefox/addon/get-tabs-infos/) or [Gather from Tabs](https://addons.mozilla.org/firefox/addon/gather-from-tabs/) since it is likely that whatever you are missing is covered either already.

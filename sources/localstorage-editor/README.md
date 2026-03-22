# NAME

**localstorage-editor**

# SYNOPSIS

adds a toolbar button to view and modify the localstorage for the current active tab
click the toolbar button to open a storage editor for the currently active tab which is mostly just a big table that shows each storage item in a row where you can filter, search, copy, export, modify, add,  import items and sync or discard your changes. 

# USER INPUTS

- the active tab when the toolbar button is clicked
- storage data to add, modify or delete

# OPTIONS

there is a checkbox in the UI at the top which allows to change the inital checkstate for all displayed storage items, when checked all items will be selected when the panel is opened which allows to quickly export or copy the storage. When unchecked (default), the items will not be selected which might be prefereable when your default action is to modify and sync the storage or export only a small set of items. Pick what fits your workflow better.

# REQUIRED PERMISSIONS

- **storage**: used to store selection state which is managed though ght checkbox in the UI panel at the top 
- **clipboardRead**: this is used to import json data quickly from within the clipboard (without having to save it as a file)
- **clipboardWrite**: this is used to export/write the storage data as json to the clipboard to copy or to transfer within without having to save it as a file
- **<all_urls>**: this is necessary to injects a tiny for the site undetectable content-script into each site. It functions as a proxy between the addon UI and the page storage

# OPTIONAL PERMISSIONS

none

# DEMO VIDEO

https://github.com/user-attachments/assets/fd09a71d-a14e-443e-9cc2-6b4896871ac2


# FAQ / COMMON ISSUES

**Why do you require the clipboard permissions?**

Strictly speaking the clipboard permissions could be replaced with textareas as i've done with some other addons. 
The difference to these addons and this one is that they dont already require a much more powerful permission to just work, which makes worrying about the clipboard permissions just a mood point.

**Why doesnt the addon work on some mozilla sites?**

Some sites are protected by firefox internal addon restrictions, so out of the box addons can not function on those sites. 
There are workarounds for this. Search around and you'll likely be able to find them. Not adding specifics here, since i dont wanna play catch up when things change.

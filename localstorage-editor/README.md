# NAME

**localstorage-editor** - adds toolbar button to view and modify the localstorage for the current active tabs site

# SYNOPSIS

click the toolbar button to open the main UI panel which is a big table that each storage item in a row.
you can filter, search, copy, export, modify, add , import items and sync or discard your changes. 

# USER INPUTS

- the active tab when the toolbar button is clicked
- storage data to add or modify

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

**Why do you require the clipboard permissions? Why arent they optional?**

Strictly speaking the copboard permissions are not 100% necessary and i have replaced these in other addons of mine with simpler textareas where users can copy the data themself. 
The difference to these addons and this one is simply that they dont already require a much more powerful permission which this addon already needs to just work. 
Or to say it in laymans terms: If the addon wanted to be malicious - which it isnt - the **<all_urls>** permission would by more than enough for that, so worrying about the extra clipboard permissions is kind of a moot point.

**The UI is to big/small, cant read text/labels. How can i change that?**

You can resize the panel UI by using the mouse wheel to zoom in or out. Obviously this wont be persistent so it will reset after you close the panel. 
If you feel like it would make sense to have a function that allows user to add their own custom styling for the editor, let me know by opening an issue on the homepage. 
I am not against it, just lazy and did not think many people would want this.  

**Why doenst the addon work on some sites?**

Some sites are protected by firefox internal addon restrictions, so out of the box addons can not function on those sites. 
There are workarounds for this. Search around and you'll likely be able to find them. Not adding specifics here, since i dont wanna play catch up when things change.
# NAME

**localstorage-editor** - adds toolbar button to open a localstorage editor panel where the localstorage can be viewed and modified from

# SYNOPSIS

click the toolbar button to open the panel which if the page is a real website will display the editor

# USER INPUTS

- the active tab/page/site 

# OPTIONS

the only option at the moment is the toggle in the toolbar panel that allows to change the inital selection state of the localStorage items when the panel is opened

# REQUIRED PERMISSIONS

storage
- **storage**: used to store setting for the inital selection state of storage items
- **clipboardRead**: used to read data from the clipboard for importing/adding 
- **clipboardWrite**: used to write data into the clipboard for exporting
- **<all_urls>**: used to access the localStorage 


# OPTIONAL PERMISSIONS

none

# DEMO VIDEO

tbd

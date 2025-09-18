
# NAME

**tbl2csv** - adds a context menu entry to export HTML Tables, CSS Pseudo DIV tables or lists (UL/OL) as a Comma Seperated Values (CSV), also adds a toolbar button to highlight exportable elements by adding a dashed outline border to them

# SYNOPSIS

click the toolbar button to highlight the exportable elements, then right click into a exportable area to open the page context menu. The context menu should contain a submenu labled "Table to CSV". click one of the entries in the submenu to copy or export the table data as raw html or plain text. 


# USER INPUTS

- (pseudo) table element 
- export mode (html/text)

# OPTIONS

none

# REQUIRED PERMISSIONS

- **menus**: used to add the context menu 
- **activeTab**: used to inject the content script to execute the data export from a page

# OPTIONAL PERMISSIONS

none

# DEMO VIDEO

https://github.com/user-attachments/assets/e571afdd-aab9-4b2a-b7f5-087f5048a2af


# COMMON ISSUES / FAQ

**The table i want to export doenst get highlighted. What gives?**

Most likely the "table" you are trying to export isnt actually a exportable table ... but something that looks like it but contructed from elements not commently used for this.
This is a site issue and there is not much i can do about that. You can always create a userscript to handle the export of such unusual structures. 


**The exported csv data looks wrong. Is your tool broken?**

Most likely this is also caused by the website not using tables or table like structures in the way they are intended to. 
Most likely adding useless sub-element for styling or something. You will also very likely need a custom userscript solution to handle this situation. 

**This shit doenst work**

Skill issue. But seriously ... this addon is not made to handle every possible error a webdesigner can make when presenting table-like data to its users. 
I assume some basic knowlege how web elements should be used - which isnt too much to ask - and if thats no done, well there is not much i can do here. 

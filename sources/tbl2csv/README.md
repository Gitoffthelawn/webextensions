
# NAME

tbl2csv

# SYNOPSIS

click the toolbar button to highlight the exportable elements, then right click into a exportable area to open the context menu. 
The context menu will contain the submenu labled "Table to CSV" containing entries for HTML and Text export.


# USER INPUTS

- table element 
- export mode 

# OPTIONS

none

# REQUIRED PERMISSIONS

- **menus**: used to add the context menu entry
- **activeTab**: used to inject the content script to execute the data export 

# OPTIONAL PERMISSIONS

none

# DEMO VIDEO

https://github.com/user-attachments/assets/e571afdd-aab9-4b2a-b7f5-087f5048a2af


# COMMON ISSUES / FAQ

**The table i want doenst get highlighted**

It either not a real table or it could be that the table is contained inside an isolated subelement (closed shadowroot).
In either cases the highlighting and export function will not work. 

**The exported data looks wrong / is incomplete**

This is likely caused by mis-/improper- use of html elements by website creators. 


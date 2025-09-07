# NAME

**select-tabs-in-group** - adds a tab context entry and a toolbar button to quickly select all tabs in a tabgroup

# SYNOPSIS

clicking the toolbar button will select (aka. highlight) all tabs which are part of the currently active (aka. focused) tab (custom trigger shortcut available)
to quickly select a different tabgroup, you can right click on any tab in the group and use the context menu entry to do the same with that group

# USER INPUTS

- a tab that is part of a tabgroup

# OPTIONS

none

# REQUIRED PERMISSIONS

- **menus**: used to add the context menu when right clicking on a tab
- **tabs**: used to query the related tabs to the one that was clicked on
- **tabGroups**: used to access the group property of the tabs

# OPTIONAL PERMISSIONS

none

# DEMO VIDEO

https://github.com/user-attachments/assets/73a95057-24aa-4971-b4b6-5fb184e1adfe

# COMMON ISSUES / FAQ

**When i click on the tabgroup header there is no option. Can you add that?**

Sadly the tabs api does not yet allow to add context entrys to the tabGroup header, but if that becomes available, i'll look into it.

**How can i prevent the focus switch when when i select another tab group?**

That is as far as i know not possible. If the active tab would keep its focus that would make it a part of the selection, which would prevent the user from execute actions on group. 

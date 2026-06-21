# NAME

open-temp-container

# SYNOPSIS

open links or bookmarks in temporary self removing isolated containers (TC's)

# USER INPUTS

- link or bookmark 

# OPTIONS

- Toolbar Action 
- TC color 

# REQUIRED PERMISSIONS

- "contextualIdentities", used to create/delete containers
- "cookies", used to determine which tab belongs to a container (aka. cookieStore)
- "menus", used to add context menus to bookmarks and links
- "storage", used to save user options 
- "tabs", used to create tabs and access tab properties 
- "bookmarks", used to create TC from bookmarks

# OPTIONAL PERMISSIONS

none 

# DEMO VIDEO

https://github.com/user-attachments/assets/38a7172f-0501-4dae-b3cf-e9505665a726

# COMMON ISSUES / FAQ

**History of Temporary Containers is not removed**

This is a known limitation of firefoxs history and tabs API. 
History deletion by container can currently not be not be reliably implemented. 
Should the situation change the feature will be added, but for now this is blocked.


# NAME

auto-close-tabs

# SYNOPSIS

Auto close tabs via container and url regex rules
on the preference page add at least one valid closing rule, then toggle the toolbar button to ON 

# USER INPUTS

- closing rule

# OPTIONS

- number of tabs to keep open
- Auto Save folder
- Close Rules
- Ignore Rules 

# REQUIRED PERMISSIONS

- **contextualIdentities**: necessary to query actual container names 
- **cookies**: necessary to read the container id from the tab entities 
- **bookmarks**: used to backup closed tabs  ( strictly not necessary if this feature isnt used)
- **"tabs**: necessary to access tab URLs 
- **storage**: used to remember options and closing rules

# OPTIONAL PERMISSIONS

none 

# DEMO VIDEO

https://github.com/user-attachments/assets/af82f947-f9e4-4de3-8440-ea8bcf544be1

# COMMON ISSUES / FAQ

**This addon has the worst UI i've ever seen!**

Look at my other addons, you might find something more awful there. 

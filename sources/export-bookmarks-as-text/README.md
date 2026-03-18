# NAME

**export-bookmarks-as-text**

# SYNOPSIS

click on the toobar icon to open the export view. there you can export the entire bookmark tree or just a branch

# USER INPUTS

- bookmark folder

# OPTIONS

none

# REQUIRED PERMISSIONS

- **bookmarks**: used a read the bookmark titles and urls 

# OPTIONAL PERMISSIONS

none 

# DEMO VIDEO

https://github.com/user-attachments/assets/d61db462-21c9-4696-a8a0-7a1e21a6f6f2

# COMMON ISSUES / FAQ

**Why does the addon require to modify bookmarks?**

It doenst, but that is a limitation with the current addon API. 
There is simply no such sub-permission that would only allow to only read but not modify bookmarks.
Both functions are contained in the 'bookmarks' permission at the moment. 
Hopefully this will be impoved at one point in the future, but for now there is nothing i can do about it. 
I dont like that as well, but maybe that will be improved in the future. For now there is no alternativ for an addon to access bookmark information. 

**I cant use this to transfer/import my bookmarks, please help.**

This addon isnt intened to export bookmarks in a structured way that allows importing. For that i'd suggest you take a look at my other addon 'bookmark-porter' instead.

# NAME

**find-feed** - adds a toolbar button to find RSS, ATOM and JSON feeds

# SYNOPSIS

Click the toolbar button to start the detection of page related feed-like assets. 
The addon has a basic set of detection functions to find potential feed urls, that can also be further customized by the user.

# USER INPUTS

- the current website 

# OPTIONS

a set of custom javascript URL detection functions, that will be run in the page context to find potential feed URLs 

# REQUIRED PERMISSIONS

- **storage**: used to store the detection rules/functions 
- **<all_url>**: used to send HEAD requests to potential urls to check if those return a feed-like content-type  

# OPTIONAL PERMISSIONS

none

# DEMO VIDEO

https://github.com/user-attachments/assets/fd15e407-6839-444a-b6b7-72f2985a38cb

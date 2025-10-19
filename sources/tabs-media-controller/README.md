
# NAME

**tabs-media-controller** - adds the toolbar button that shows a popup that displays media elements with options to control them or bring them into focus

# SYNOPSIS

click the toolbar button to open a popop that show all playing media elements with standard html media controls

# USER INPUTS

none

# OPTIONS

- you can add custom CSS to re-style the media popup to for example hide or rearrange buttons and stuff

# REQUIRED PERMISSIONS

- **storage**: used to save the custom CSS when provided
- **tabs**: used to inject the content script 
- **<all_urls>**: used to inject a content script to communicate with the media elements 

# OPTIONAL PERMISSIONS

none

# DEMO VIDEO

https://github.com/user-attachments/assets/ca3d56a2-46ad-41f4-8444-eeb937acf7d5

# COMMON ISSUES / FAQ

**Can you add a Forward/Backwards aka. Next/Previous button?**

Since these function are site specific and would require to play catch up each time a site decided to change something currently it is not planned to support these. 

**The player looks ugly, can you change XYZ?**

If XYZ hold some degree of usability improvment that can be backed up by common and well established User interface guidelines ... maybe. If you just have a personal preferecne, please look into the custom CSS style option. 

**I have some media that doens show up.**

Please report the site via the support site link and i'll try to look into it. 


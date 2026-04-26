# NAME

show-qrcode

# SYNOPSIS

Clicking the toobar button shows the QR Code for the current url or selected text. right clicking on a link, tab or some selected text will shows a context menu containing the "Show QRCode" entry. Clicking on the context entry will open the toolbar popup with the related data pre-filled. 
In the toolbar popup the qrcode information can be directly modified in various ways. 

# USER INPUTS

- data to QR'ify 

# OPTIONS

- save type (png or svg)
- png save size
- error correction level 
- border padding
- forground color
- background color

# REQUIRED PERMISSIONS

- **activeTab**: used to read selected text, or url in a page/tab when triggered via the context menu or the toolbar button
- **storage**: used to store the qrcode settings
- **menus**: used to add the context menu entry

# OPTIONAL PERMISSIONS

- **bookmarks**: when given, allows the addon to also add the context menu entry to bookmarks 

# DEMO VIDEO

https://github.com/user-attachments/assets/35d714f7-8aa5-459f-87d0-69369fe1752b

# COMMON ISSUES / FAQ

**It fails to generate a Code for a link**

Likely that the link is not actual a html anchor. 

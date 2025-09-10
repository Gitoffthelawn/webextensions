# NAME

**show-qrcode** -  show and edit a qrcode for the current url, any link, bookmark, tab or selected text and more 

# SYNOPSIS

click the toobar button shows the QR Code for the current url. right clicking on a link, tab or some selected text will show a context menu containing a new entry "Show QRCode". Clicking on the Context menu will open the toolbar popup with the the related data pre-filled. In the toolbar popup the qrcode information can be directly modified in various ways. 

# USER INPUTS

- elmeent to QR'ify 
- visual and meta options (type, error correction, ..)  for the QRCode

# OPTIONS

- visual and meta options (type, error correction, ..)  for the QRCode

# REQUIRED PERMISSIONS

- **activeTab**: used to read selected text, or url in a page/tab when triggered via the context menu or the toolbar button
- **storage**: used to store the qrcode settings
- **menus**: used to add the context menu entry

# OPTIONAL PERMISSIONS

- **bookmarks**: when given, allows the addon to also add the context menu entry to bookmarks 

# DEMO VIDEO

https://github.com/user-attachments/assets/35d714f7-8aa5-459f-87d0-69369fe1752b

# COMMON ISSUES / FAQ

**I want to add custom Images/Icons to the QRCode, can you add that?**

Thats not something i plan to add. Basically you can just increase the error correction and just place whatever icon you want over the QRCode.
You can do that with any image processing or heck even document processing tool, so it seems a bit to out of scope at the moment.

**I want to generate multiple QRCodes, Can you add that function?**

It's part of the backlog - i wanted to add this feature ... but haven gotton around adding the feature yet. Not sure if or when i'll get the time.
That said, pull requests are very much welcome. 

**It fails  to generate a QR Code for a link. What gives?**

Very likely that supposed link isnt actually a real html anchor (aka. hyperlink) element, but some other element where a crazy webdesigner used the onclick handler to make a fake link.
I am sure they had their reasons, but sadly there is nothing i can do here since technically there is no link present. The best you can do is open the and then QR'ify the opend URL of the tab. 

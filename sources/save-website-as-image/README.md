# NAME

**save-website-as-image** - adds toolbar button that allows to capture a website completely  

# SYNOPSIS

Click the toolbar button take capture of the current website

# USER INPUTS

- tab/page

# OPTIONS

none

# REQUIRED PERMISSIONS

- **storage**: used to store the timer name and end time.
- **tabs**: used to necessary to access internal function that allows to capture the tab viewport 
- **<all_urls>**: necessary since host permissions are necessary to capture a tab 

# OPTIONAL PERMISSIONS

none

# DEMO VIDEO

https://github.com/user-attachments/assets/7f0d510b-bbb4-496a-820d-f76a44f7c808


# COMMON ISSUES / FAQ

**Your addon did not creat/download an image at all.**

Some websites are restricted by browser internal mechanics, there are ways around this, but its nothing intentional on my side

**Your addon did not create/download an image but some strange CBZ file?**

when a capture exceeds the built-in canvas size limit, the addon will fall back to a CBZ (comic book archive, aka. a ZIP file which contains a set of images. This was to my knowlege the most reliable workaround to ensure to always get a full website snapshot. Most other addons use the browsers built-in canvas API which is hard limited in how large an in memory image can be. This addon doenst care about that limit but you'll have to accept the image fragmentation and use other tools to stich the image together if that is what you need. 

**Can you add an editor/preview/highlight mode? I want modify/drawn on the image before downloading.**

Sorry, this is out of scope. There are already numerous addons that allow you to draw on pages so just use those or directly edit the HTML via firefox built-in developer tools.

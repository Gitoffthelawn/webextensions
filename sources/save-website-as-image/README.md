# NAME

**save-website-as-image** - adds a toolbar button that allows to capture a website completely

# SYNOPSIS

Click the toolbar button to take full capture of the current website

# USER INPUTS

- tab/page

# OPTIONS

none

# REQUIRED PERMISSIONS

- **storage**: used to store output format, segmentation height and scaleFactor
- **tabs**: used to update the toolbar icon status and to allow snapshoting multiple tabs at the same time 
- **<all_urls>**: necessary to use to the browser.tabs.captureTab method 

# OPTIONAL PERMISSIONS

none

# DEMO VIDEO

https://github.com/user-attachments/assets/7f0d510b-bbb4-496a-820d-f76a44f7c808


# COMMON ISSUES / FAQ

**Your addon did not create/download an image at all.**

Some websites are restricted by browser internal mechanics, there are ways around this, but its nothing intentional on my side

**Your addon did not create/download an image but some strange CBZ file?**

When a capture exceeds the built-in canvas size limit, the addon will fall back to a CBZ (comic book archive, aka. a ZIP-Archive file which basically only contains a set of images. This is to knowlege the most reliable workaround to ensure to always get a full snapshot. Most other addons use the browsers built-in canvas API which is hard limited in how large an in memory image can be. This addon doenst care about that limit but you'll have to accept the image fragmentation and use other tools to stich the image together if that is what you need. 

**Can you add an editor/preview/highlight mode? I want to modify/draw on the image before saving it.**

Sorry, this is out of scope. There are already numerous addons that allow you to draw on pages so just use those or directly edit the HTML via firefox built-in developer tools.

# NAME

**copy-video-frame** - adds a context menu entry that allows to capture a still frame image from a html video element

# SYNOPSIS

Hold shift and right click on a html video element to open the context menu. If the element you clicked on is a html video element the context menu will contain the "Copy Video Frame" entry.

# USER INPUTS

- the html video element 

# OPTIONS

Granting the addon the optional notifications permissions allows it to show a notification when done.
Granting the addon the optional clipboardWrite permissions will change its behavior from opening the captured frame into a new tab to copying it into the clipboard directly

# REQUIRED PERMISSIONS

- **menu**: used to add the menu entry
- **activeTab**: used to access tabCapture function triggered by the useraction of clicking on the menu entry

# OPTIONAL PERMISSIONS

- **clipboardWrite**: when given, skips the opening of the screenshot into a tab and direclty copies it into the clipboard instead 
- **notifications**: when given, shows a notification when the timer ends.

# DEMO VIDEO

https://github.com/user-attachments/assets/5c16d6d8-1092-40fc-8f8f-a23d814de0c7

# COMMON ISSUES / FAQ 

**I clicked on a video but the context menu doenst have the Copy Video Frame entry. What gives?**

Well technically this can have a couple of reasons, but the most likely ones are hat the clicked element is either not a html video element or some other transparent element is overshadowing it. To get around overshadowing either the overlayed elements needs to be removed or the video needs to be brought to the front. Usually uBlock Origin's element picker or Firefox's built-in element inspector will be able to help here.

**Can't the addon just copy the frame into the clipboard?**

Yes it can. Just grant it the optional clipboardWrite permission and it will from then on directly copy the frame into the clipboard and not open a tab with it.

**Why are there video control elements visible in the captured frame?**

This only happens with DRM and CORS protected content. This kind of content is sadly not extractable in the same way as other none-protected content, so a different method is used which unfortunetly has the drawback of also capturing overlayed content and using the videos displayed size instead of its natural values.

**Why is the dimension of the frame so small, not like i expected?**

For none DRM protected content the video size should be the same as the natural width and height of the video. For DRM protected content the displayed size on the screen will be used since direct access to the video data is not available. 

**Why is the direct Copy to Clipboard not the default? This is stupid nobody wants to right click twice.**

Well, i personally try to write addons with a high degree of respect for user autonomy and privacy in mind. My prefered defaults therefor are the ones that require only the absolute necessary permissions to get a task done in a resonable time and manner. So i opted to not require the clipboardWrite permission because a user could already right click on any image and copy it into the clipboard, which seems not too much of an extra step if not done to often. - But i do acknowlege that different users have different workflows and priorities so i added a simple switch that allows users to change the behaviour. 


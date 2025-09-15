# NAME

**copy-video-frame** - adds a context menu entry that allows to capture a still frame image from a html video element

# SYNOPSIS

Hold shift and right click on a html video element to open the context menu. If the element you clicked on is a html video element the context menu will contain the "Copy Video Frame" entry. Clicking on the entry, will take a snapshot of the current video frame and save it to a popup window or to the clipboard the addon is given the permission todo so.

# USER INPUTS

- the html video element 

# OPTIONS

Granting the addon the optional clipboardWrite permissions will change its behavior from opening the captured frame into a new tab to copying it into the clipboard directly

# REQUIRED PERMISSIONS

- **menu**: used to add the menu entry
- **activeTab**: used to inject the capture content function into the page context and to use the tabCapture fallback function when necessary, triggered by the user clicks on the menu entry

# OPTIONAL PERMISSIONS

- **clipboardWrite**: when given, skips the opening of the screenshot into a tab and direclty copies it into the clipboard instead 

# DEMO VIDEO

https://github.com/user-attachments/assets/5c16d6d8-1092-40fc-8f8f-a23d814de0c7

# COMMON ISSUES / FAQ 

**I clicked on a video but the context menu doenst have the Copy Video Frame entry. What gives?**

Well technically this can have a couple of reasons, but the most likely ones are that the clicked element is either not a video element or some other transparent element is overshadowing it. To get around overshadowing either the overlayed elements needs to be removed or the video needs to be brought to the front. Usually uBlock Origin's element zapperor Firefox's element inspector will be able to help here.

**Can't the addon just copy the frame into the clipboard?**

Yes it can. Just grant it the optional clipboardWrite permission and it will from then on directly copy the frame into the clipboard and not open a window.

**Why are there video control elements visible in the captured frame?**

You are likely trying to capture DRM or otherwise protected video content. 
Sadly there is to my knowlege no way to access the underlying video data to access the frame data. To still provide the users with some something (aside from an not very helpful error message) that might be usable for many usecases, i decided to implement a fallback form such conent which sadly has a few drawbacks. - Please note that in many cases you can still achieve a relatively clean capture by pausing and removing undesired overlayed elements.

**Why is the dimension of the frame so small, not like i expected?**

For none protected content the video size should be the same as the natural width and height of the video. For protected content the display size will equal the capture size. 

**Why do you open the frame in a new window? Why is the copy to clipboard not the default? This is stupid nobody wants to right click twice.**

I personally try to write addons with a high degree of respect for user autonomy and privacy in mind. My prefered defaults are the ones that require only necessary permissions to get a task done in a resonable manner. So i opted to not require the clipboardWrite permission since users can already right click on any image and copy it to the clipboard, which did not seem too much of an extra step if it is not done to often. But i do acknowlege that different users have different workflows and priorities so i added a optional permission switch that allows to change the default behaviour easily.

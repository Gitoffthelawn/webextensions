# SYNOPSIS

Adds a toolbar button that when clicked will take a full capture of the current website
if possible as one JPEG. If the size of the generated image exceeds the browsers internal canvas limit 
the addon will instead save the website as a series of images inside a zip archive (aka. comic book zip-archive ) 

# DEMO VIDEO

https://github.com/user-attachments/assets/7f0d510b-bbb4-496a-820d-f76a44f7c808

# REQUIRED PERMISSIONS

- activeTab: used get the url for the filename and the page dimensions
- all_urls: necessary to use the tabs.captureTab method (ref. https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/tabs/captureTab )
- downloads: used to reliably download the captured image/cbz file

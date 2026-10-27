Capture the current picture of a video as an image. Copy it to the clipboard or look at it in a small window, from a right click, a keyboard shortcut or the toolbar button.

**Quick start**

1. Hold Shift and right click a video. Holding Shift gets you the normal Firefox menu even on pages that show their own menu for the video.
2. Choose "Copy Video Frame".
3. The picture is captured, a short white flash and a shutter sound confirm it, and the image is ready:
   - if you have allowed clipboard access, it is copied to the clipboard as an image, ready to paste
   - otherwise it opens in a small window. Right click the image there to copy or save it.

**Three ways to capture**

- **Right click menu**: Shift and right click the video, then "Copy Video Frame". This works for videos in embedded frames too.
- **Keyboard shortcut**: press Alt+Shift+V to capture the video under the mouse. If the mouse is not over a video, the first video on the page is used. You can change the keys in the Add-ons Manager (Manage Extension Shortcuts).
- **Toolbar button**: click it to capture the first video that is visible in the tab. This is handy when you would rather not hover over the video.

The shortcut and the toolbar button only find videos in the page itself, not in embedded frames. Use the right click menu for videos inside frames.

If no video is found, a small window explains what went wrong.

**Where the image goes**

- **Clipboard**: needs the optional permission to put data into the clipboard. Allow it in the Add-ons Manager on the Permissions tab of this add-on. After that, every capture is copied as an image right away.
- **Window**: without the permission, the image opens in a small window that fits the video, up to 90 percent of your screen. The picture scales down to fit.

**How the picture is taken**

- **Directly from the video**: the default. The current frame is read from the video in its original size, so it is sharp. It works even if the video is scrolled out of view. Anything drawn on top of the video, such as subtitles or buttons of a custom player, is not part of the picture.
- **Screenshot of the video**: used automatically for protected (DRM) videos and other videos that do not allow reading their frames. The visible area of the video is captured from the screen, cropped to the video. Everything visible on top of it, including subtitles, is part of the picture. The video has to be on screen for this.

The controls of the video are hidden for a moment during the capture, so that they do not end up in the picture, and are brought back right after.

**Options**

The options page opens once after the installation and later from the add-on preferences. It has a "How to use" section and these settings, which are saved right away:

- **Shutter sound**: switch the sound on or off, test it, upload your own sound (MP3, WAV or OGG, up to 500 KB) or go back to the built-in sound.
- **Always use screenshot capture**: always use the screenshot method, even for ordinary videos. Use it to get subtitles and other overlays in your pictures. The video must be on screen.

**Permissions and privacy**

- menus: add "Copy Video Frame" to the right click menu of videos.
- activeTab: read the video in the tab you use the add-on on, and take the screenshot of the tab.
- storage: remember the sound and capture settings.
- clipboardWrite (optional): copy the image to the clipboard.

The add-on does not collect or transmit any data. The pictures stay on your computer.
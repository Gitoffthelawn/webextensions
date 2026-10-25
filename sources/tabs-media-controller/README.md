Control the audio and video of all your tabs from one popup. See what is playing, mute or pause it, jump to the tab it plays in, change volume, speed and position, and pop a player out into its own small window.

**Quick start**

1. Click the toolbar button. The popup lists the websites that currently have audio or video on any of their tabs. Tabs that are making sound are listed first.
2. Use the small mute and pause buttons in a row to silence or stop everything from that site, or click the row to open the controls.
3. Use "Back", "All sites" and "Next" at the top to move around.

You can also assign a keyboard shortcut to the toolbar button in the Add-ons Manager (Manage Extension Shortcuts).

**The site list**

Each row shows the icon and the name of a website and what it has to offer:

- Buttons to mute and to pause the media of that site. If the site has more than one media element, they act on all media of that site, on every tab.
- If the site has exactly one media element, the row also shows the title of its tab and the type and position ("video · 1:20 / 4:05"), and has a button to jump to the tab. The mute and pause buttons then control that single element. A long tab title scrolls so that you can read it.
- If the site has several elements, the row shows how many ("3 items") and whether something is playing. Click the row to see them.

Click a row with one element to go straight to its controls.

**The media of one site**

The page of a site groups its media by tab. Click the tab name to switch to that tab. Every media element has a compact row with:

- a button to jump to the tab and scroll the element into view
- a mute button
- a play and pause button
- the type, the position and a small arrow to open the full controls

Elements that are playing come first, and unmuted ones before muted ones.

**The full controls**

- **Preview**: the current picture of a video, updated live. Audio shows a waveform symbol.
- **Buttons**: jump to the element, mute, play or pause, and "open in its own window".
- **Playback speed**: from 0.25x to 1.75x.
- **Volume**: from 0 to 100 percent. Mute and volume are disabled when a video has no audio track.
- **Position**: a seek bar with the time. For live streams it shows "LIVE" and the seek bar is disabled.
- **Next**: switch to the next media element on any site.

Playing an element that has reached its end starts it again from the beginning. The popup shows changes made on the page, for example with the buttons of the site itself, as they happen. It also remembers the last element you opened and takes you straight back to it the next time, if it is still there.

**Own window**

The button "open in its own window" moves the controls of one element into a separate small window. The window controls only that element, has the same buttons and sliders, and adjusts its size to fit. It tells you when the tab or the element is gone.

In the own window you can enlarge the preview with the button in its top right corner. The picture then fills the window. A vertical slider at the right edge sets the quality of the preview (10 to 100 percent, 80 by default). A lower quality uses less processing power. The slider fades out after two seconds without mouse movement and comes back when you move the mouse. The quality is remembered for each element while the browser is open. Resizing the window only scales the picture and does not change how it is captured.

**Keyboard shortcuts**

None of these has a default key. Assign them in the Add-ons Manager (Manage Extension Shortcuts).

- **Open the popup**: the toolbar button.
- **Switch to next audible tab right**: jumps to the next tab to the right in the current window that is playing sound, and starts again at the left end after the last one.
- **Switch to next audible tab left**: the same towards the left.

The two tab shortcuts do nothing if no tab or only the current tab is audible.

**Good to know**

- Only web pages (http and https) are searched. This includes media inside embedded frames, such as video players embedded in other sites, and players built with open web components.
- Tabs that are still loading or have been unloaded are not included.
- The preview of a video from another website is not available when that site does not allow it. Controls work as usual.
- Audio that a page creates by script without putting it on the page is found once it starts to play.
- Media in closed web components cannot be reached by any add-on.

**Permissions and privacy**

- all websites: a small script on every page and frame finds the media and carries out your commands.
- tabs: read the titles, addresses and icons of tabs and switch between them.
- webNavigation: find the frames inside tabs, so that media in embedded players can be controlled.
- storage: remember the element you opened last.

The add-on does not collect or transmit any data. Previews are made on your computer and never leave it.
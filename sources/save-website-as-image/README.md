Adds a toolbar button that when clicked will take a full capture of the current website
if possible as one JPEG. If the size of the generated image exceeds the browsers internal canvas limit 
the addon will instead save the website as a series of images inside a zip archive (aka. comic book zip-archive ) 

The options page lets you choose the image format (JPEG or PNG), the JPEG quality and
a sound (built-in or your own file) that is played when a screenshot has been taken.
The toolbar button shows ✓ or ✕ (and its tooltip explains) whether the last capture of the
current page succeeded or failed; the indicator is reset when you navigate to another page.
The file name of the saved image can be customized on the options page with a pattern
made of text and placeholders (`{timestamp}`, `{date}`, `{time}`, `{title}`, `{domain}`, `{url}`).
The default pattern is `{timestamp}_{title}_{url}`. Characters that are not allowed in
file names are replaced, and overly long names are shortened automatically.
To capture several pages at once, select (highlight) the tabs first with Ctrl/Cmd+click or
Shift+click and then click the toolbar button: every selected tab is saved as its own file,
one after the other. The result of each capture is shown on the badge of the respective tab.

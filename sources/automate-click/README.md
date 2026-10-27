Automatically click things on websites you visit, such as accept or reject buttons of cookie messages, "close" buttons of pop-ups or any other button you always have to click. You describe what to click with a rule, and the add-on does it every time the page has loaded.

**How a rule works**

A rule has two required parts:

- **URL Regular Expression**: which pages the rule is for.
- **CSS Selector**: what to click on those pages.

When a page has finished loading and its address matches the regular expression, the add-on waits for the initial delay and then clicks every element on the page that matches the selector. It also works inside embedded frames and inside web components. Optionally a rule can keep checking and clicking again, in case the element appears later or comes back.

**Quick start**

1. Open the page that has the button you want to click automatically.
2. Click the toolbar button. The options page opens with a new rule for the address of that page. The rule is switched off at first.
3. Fill in the CSS selector of the button (see "Finding the CSS selector" below), then use "Test" to check it.
4. Tick "Enabled" for the rule and click "Save Changes".

If you are new to this, click "Guided Setup" on the options page instead. It leads you through the steps and saves the finished rule right away.

**Finding the CSS selector**

1. Right click the button on the website and choose "Inspect" (or "Inspect Element").
2. In the developer tools, right click the highlighted line of code and choose "Copy", then "CSS Selector".
3. Paste it into the CSS Selector field of your rule.

Anything that works with the querySelectorAll function of the browser is allowed. If a selector matches several elements, all of them are clicked.

**Guided Setup**

- **Step 1, which website**: paste the address of a page. Choose "Only this exact page" (and pages that start with that address) or "Any page on this website".
- **Step 2, what to click**: paste the CSS selector. "Test on the open page" flashes the matching elements orange on the web page you used last, and shows how many were found.
- **Step 3, timing**: how long to wait before clicking (immediately, 1, 3 or 5 seconds), whether to keep checking and clicking again every 1, 3, 5 or 10 seconds, an optional name for the rule, and whether to turn the rule on right away.
- **Step 4, review**: a sentence that explains what the rule will do. "Save Rule" adds it to the table and saves it.

**The rules table**

- **Handle** (far left): drag a rule to change the order.
- **Check box**: select rules for the buttons above the table. A click on a group title selects or deselects all rules of that group.
- **Enabled**: switches a rule on or off. Only enabled rules are carried out.
- **Actions**: "Test" highlights the matching elements on the web page you used last. "Run" clicks them right now. "Delete" removes the rule.
- **Group**: any word, to keep related rules together. Rules are grouped by this column. Groups are collapsed when the page opens.
- **Annotation**: a note that describes the rule.
- **CSS Selector** and **URL Regular Expression**: the two required parts. Invalid regular expressions are highlighted in red, and saving is refused until they are fixed.
- Most columns have filter fields in the header.

The button "More Options" shows or hides these extra columns. Your choice is remembered.

- **Tags**: one or more words separated by spaces or commas. The header filter lists all the tags in use.
- **Initial Delay**: the number of milliseconds to wait after the page has finished loading, before the first click.
- **Repeat Delay**: a number of milliseconds above 0 makes the rule check and click again and again, with this pause in between. 0 means a single click.
- **Max Repeats**: an upper limit for the repeating, so that it does not go on forever. Leave it at 0 for no limit.
- **RRV** (Random Repeat Variance): a number of milliseconds that makes the pause between repeats random. The pause is chosen between the Repeat Delay minus this number and the Repeat Delay plus this number. This makes the clicks look less mechanical.

**The buttons above the table**

- **Guided Setup**: the step by step helper described above.
- **Add Rule Manually**: adds an empty rule that you fill in yourself.
- **Duplicate Rule(s)**: copies the selected rules.
- **Delete Rule(s)**: removes the selected rules after a confirmation.
- **Enable/Disable**: switches the selected rules on or off at once.
- **Import Rules**: adds the rules of a JSON file to the table. They are added to the existing rules and only kept after you click "Save Changes".
- **Export Rules**: saves the selected rules to a JSON file named AC-rules.json.
- **Save Changes**: saves all rules so that they take effect. Until then, changes only exist on the page. The button gets a red border while there are unsaved changes, the status bar says so, and Firefox asks before you leave the page.
- **Discard Changes**: reloads the page and drops everything that is not saved.
- **Auto, Light, Dark**: the color theme. Auto follows your system.

The status bar shows the number of rules and the number of selected rules. A switch at its right end hides or shows the "Guided Setup" button.

**The toolbar button**

Click it on any web page to add a new rule for that page. The rule uses the address of the page, up to and including everything after it, so it matches that page and any address that starts with it. If the options page is already open, the new rule is added to it right away without losing your unsaved edits. New rules are always created switched off, so that nothing happens before you have tested the rule.

**Regular expressions**

The URL regular expression is tested against the full address of the page. A good start is to put a ^ in front of the address, escape dots and slashes with a backslash, and put .* at the end, for example:

    ^https:\/\/www\.example\.com\/.*

This is what the toolbar button and the Guided Setup create for you.

**Good to know**

- Only enabled rules whose regular expression matches the address of a page are carried out. The check happens when a page has finished loading.
- Clicking uses the click of the element itself, as if you had clicked it with the mouse. Elements that are not clickable are reported in the Test and skipped.
- To reach elements in web components, the add-on makes the hidden parts of web components on all pages accessible to itself. Pages are not changed otherwise.

**Permissions and privacy**

- all websites, tabs and activeTab: run the clicks in the pages you visit and remember the page you used last for "Test" and "Run".
- webNavigation: find out when a page has finished loading.
- storage: keep your rules.

The add-on does not collect or transmit any data. Your rules stay on your computer.
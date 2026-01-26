# NAME

**automate-click** - automate click actions that users might have to perform when visiting a website

# SYNOPSIS

automate click actions that users might have to perform when visiting a website. For example accept or reject cookie consent messages.

# USER INPUTS

- CSS selector of the to be clicked element (required)
- Regular Expression matching the page url (required)
- see OPTIONS for more

# OPTIONS

- Group: a single word/string (ref. https://tabulator.info/examples/6.3#grouping)
- Tags: one or more space or "," seperated words
- Annotation: some text to describe a rule
- Inital Delay: ( number >= 0 ) delay befor the rule is executed after the page has finished loading
- Repeat Delay: ( number >= 0 ) if a value greater than zero is entered, the action will be executed continuously with the given values as a millisecond delay between the repeats
- Max Repeats: (number >=0) Defines an upper limit how often the "Repeats" should be done until the action is stopped (kind of like a failsafe, to not continue forever)
- RRV (Random Repeat Variance): adds a random millisecond variance to the Repeat Delay, the number is the MAX variance offset so if you want the variance to randomly fluctuate between 10 seconds, you have to set it to 10000 and each cylce a random number from 0-10000 is picked as an offset for the Repeat Delay
- X/Y-Position: if any of these is set to a value > 0, then the selector is ignored and instead the click is done on the absolute pageOffset position (i'd advice against using this)
- CSS Selector: everything you can put into document.querySelectorAll (ref. https://developer.mozilla.org/en-US/docs/Web/API/Document/querySelectorAll)
- URL Regular Expression: RE to match the URLs where the rules should trigger (ref. https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_expressions )

# REQUIRED PERMISSIONS

- **storage**: used to store the automation rules  
- **webNavigation**: used to monitor URL changes to detect matching automation rules 
- **activeTab**: used to pass the current tab url to the rules page to generate a inial regex  

# OPTIONAL PERMISSIONS

none

# DEMO VIDEO

https://github.com/user-attachments/assets/f83b1464-94eb-4d6b-ac48-57dca6b5f634

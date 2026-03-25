# NAME

load-background-tabs-on-select

# SYNOPSIS

Prevents tabs opened in the background from loading until the user selects (aka. activates/focuses) them 
After installation tabs which are opend in the background for example via CTRL+LMB will be stopped from loading and instead idle in a discarded state until the user brings them to the foreground. On the option page the textarea allows to add regular expressions to define whitelist entries (tabs allowed to load if they match the given Pattern)  or when the backlist mode is toggled the patterns will act as a blacklist blocking only matching tabs from loading

# USER INPUTS

- opened background tabs
- black mode toggle
- black or whitelist regular expressions

# OPTIONS

- blacklist mode option to toggle the function of the regular expression textarea below
- the regular expression textarea which defines the either white or backlist patterns 

# REQUIRED PERMISSIONS

- **storage**: used to store the patterns and mode  
- **tabs**: used to read the tab urls and discard the background tabs

# OPTIONAL PERMISSIONS

none

# DEMO VIDEO

https://github.com/user-attachments/assets/188f9c78-e7e7-4437-9444-ba10f1bad348

# FAQ / COMMON ISSUES

**How do i use the black/whitelist?**

Check or Uncheck the checkbox on the options page depending on what you want, then enter Regular Expressions that match the URLs you want to match with line by line into the textarea below 

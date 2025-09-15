# NAME

**auto-close-duplicate-tabs** - automatically close other duplicate tabs when opening the same URL/bookmark/link multiple times, contains options to specify the matching and scope 

# SYNOPSIS

runs passively in the background and monitors tabs for duplicates and will close them if they match to the degree specified by the options. note: the toolbar button allows to toggle the activation state if for some reason you want to open some tabs as duplicates

# USER INPUTS

- tab creation
- tab navigation 
- toggle the activation state via the toolbar button

# OPTIONS

- **ignore window scope**: expands the scope convering tabs in different windows
- **ignore container scope**: expand the scope covering tabs in different containers
- **ignore URL parameters**: URL will be considert duplicates even if they have different URL parameters 
- **ignore URL path**: URL will be considert duplicates when they have the same domain  (mapping one tab per site/domain)

# REQUIRED PERMISSIONS

- **tabs**: used to read the tab URLs related events 
- **storage**: used to store the option setting 
- **cookies**: used to read the tab container id (aka. cookieStoreId)
- **tabGroups**: used to read the groupId properties of tabs

# OPTIONAL PERMISSIONS

none 
(note: i would really have liked to make the cookies and tabgroup permission optional (let the user toggle them on when necessary) ... but at the current time these permissions can not be set as optional. If that changes i'll update the addon.)

# DEMO VIDEO

https://github.com/user-attachments/assets/0d430b31-0549-40d1-9d30-dcde01bc94b4

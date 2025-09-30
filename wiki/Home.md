# Automate Click

## Example: clicking on a "button"

Let say we have this page: 

<img width="100%" alt="image" src="https://github.com/user-attachments/assets/5b312d57-98d3-4959-916e-1c208a8ec2aa" />

and we want to automatically when visiting it click marked "button"

What we need for this is a way to identify the element and the way todo this with is by using a CSS selector.

We need to get create or extract a uniq css selector that will only match the button we want to click on. 

To find this we'll have to take a look at the underlying html code of the page. This can be done by using firefoxs built-in Element Inspector (link: tbd.) 

Having selected the element using the element inspector it will get highlighted in the source view window. 

<img width="100%" alt="image" src="https://github.com/user-attachments/assets/ba61d088-e0ce-4e90-92a0-016956b90f14" />


Now right clicking on the highlighted element, will open a context menu where there is a entry to Copy a CSS Selector

<img width="100%" alt="image" src="https://github.com/user-attachments/assets/733b118a-ecc1-4ccb-8e97-e73ea96268a6" />

Clicking on this we get  `a.mzp-c-button:nth-child(1)`

And in this case this is all we'll need. 

Now we can click on the addons toolbar button to open the rules page. It should look something like this: 

<img width="100%" alt="image" src="https://github.com/user-attachments/assets/5606a846-8cc7-4d27-acc4-c9df939d9c14" />

We are only interested in the first table row, specifically the CSS Selector colum. Click on it and it should become editable. Then paste the previously aquired selector `a.mzp-c-button:nth-child(1)` inside

<img width="100%" alt="image" src="https://github.com/user-attachments/assets/2d120fde-4ce2-4819-85e1-f541b0822dc0" />

Finally click on the "Save" button at the top to save the automation rule.

Now you can return to the page and reload it.

After a brief delay (1 seconds) after the page has loaded, the button should be clicked automatically. 
 

## Example: add an inital delay 

Now lays say your internet is loading the page takes longer for some reason and the element is available initally. 
This can be a source of error. To get around this one can simply increase the "inital delay" for the click action to be executed.
Click the toolbar button and open the rules page and then click into the "Inital Delay" colum of the rule you want to delay. The number needs to entered in milliseconds (1000ms = 1s) 

# Gather From Tabs (gather-from-tabs)

tbd. 







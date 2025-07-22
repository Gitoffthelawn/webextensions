(() => {
  /* const vidEl = browser.menus.getTargetElement(${info.targetElementId}); */
  /* vidEl is set with a prior executeScript call in the global content script scope */
  if (typeof vidEl === "undefined") {
    throw new Error(
      "Failed to process video element\nIf possible please report this issue on the support site.",
    );
  }
  const tmp = vidEl.getBoundingClientRect();
  let element = vidEl;
  var top = 0,
    left = 0;
  do {
    top += element.offsetTop + element.clientTop;
    left += element.offsetLeft + element.clientLeft;
    element = element.offsetParent;
  } while (element);

  return {
    x: left,
    y: top,
    width: tmp.width,
    height: tmp.height,
  };
})();

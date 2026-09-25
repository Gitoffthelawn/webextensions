(() => {
  /* const vidEl = browser.menus.getTargetElement(${info.targetElementId}); */
  /* vidEl is set with a prior executeScript call in the global content script scope */
  if (typeof vidEl === "undefined") {
    throw new Error(
      "Failed to process video element\nIf possible please report this issue on the support site.",
    );
  }
  // getBoundingClientRect() is viewport-relative (and scroll-aware),
  // which is the coordinate space captureVisibleTab's `rect` crop needs
  // — it crops out of whatever is currently visible on screen, not the
  // full page. The previous version computed x/y via an offsetTop/
  // offsetLeft walk up the page instead, which ignores scroll position
  // entirely; on any page scrolled away from the very top, that shifted
  // the crop away from the video's actual on-screen position.
  const rect = vidEl.getBoundingClientRect();
  return {
    x: rect.left,
    y: rect.top,
    width: rect.width,
    height: rect.height,
  };
})();

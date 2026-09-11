(function () {
  window._shadowRootRedirectEnabled = true;

  const originalAttachShadow = HTMLElement.prototype.attachShadow;

  HTMLElement.prototype.attachShadow = function (init) {
    console.log("Custom attachShadow called with options:", init);
    return originalAttachShadow.call(this, { ...init, mode: "open" });
  };

  /**/
  const injectIntoIframe = (iframe) => {
    if (isSameOrigin(iframe)) {
      const iframeDocument =
        iframe.contentDocument || iframe.contentWindow.document;
      const script = iframeDocument.createElement("script");
      script.textContent = `
        (function() {
          const originalAttachShadow = HTMLElement.prototype.attachShadow;
          HTMLElement.prototype.attachShadow = function(init) {
            console.log("Custom attachShadow called inside iframe with options:", init);
            return originalAttachShadow.call(this, { ...init, mode: 'open' });
          };
        })();
      `;
      iframeDocument.documentElement.appendChild(script);
    } else {
      console.warn("Cross-origin iframe detected:", iframe.src);
    }
  };

  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeName === "IFRAME") {
          node.onload = () => injectIntoIframe(node);
        }
      });
    });
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
  /**/
})();

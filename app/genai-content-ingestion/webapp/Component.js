sap.ui.define(["sap/ui/core/UIComponent"], function (UIComponent) {
  "use strict";

  return UIComponent.extend("genaicontentingestion.Component", {
    metadata: {
      manifest: "json",
    },

    init: function () {
      // Dynamically load XLSX if not already loaded
      if (!window.XLSX) {
        var script = document.createElement("script");
        script.src = sap.ui.require.toUrl(
          "genaicontentingestion/thirdparty/xlsx.full.min.js"
        );
        script.onload = function () {
          // XLSX is now available as window.XLSX
        };
        document.head.appendChild(script);
      }
      UIComponent.prototype.init.apply(this, arguments);
    },
  });
});

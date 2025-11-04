sap.ui.define(
    ["sap/fe/core/AppComponent"],
    function (Component) {
      ("use strict");
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
      return Component.extend("genaicontentingestion.Component", {
        metadata: {
          manifest: "json",
        },
      });
    }
);
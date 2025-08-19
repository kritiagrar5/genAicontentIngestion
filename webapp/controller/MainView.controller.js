sap.ui.define([
    "sap/ui/core/mvc/Controller",
     "sap/m/MessageToast"
], (Controller,MessageToast) => {
    "use strict";

    return Controller.extend("genaicontentingestion.controller.MainView", {
        onInit() {
        },
            onCategoryChange: async function (oEvent) {
         // const ID = oEvent.getSource().getSelectedKey();
        //  const oModel = this.getView().getModel();
        const oContext = oEvent.getSource().getSelectedItem().getBindingContext();
      if (!oContext) return;
      const DestinationName = await oContext.requestProperty("DestinationName");
      console.log(DestinationName);
       MessageToast.show(DestinationName);
        },
          onApproveFiles: function () {
            MessageToast.show("Approve pressed!");
        },

        onRejectFiles: function () {
            MessageToast.show("Reject pressed!");
        }
    });
});
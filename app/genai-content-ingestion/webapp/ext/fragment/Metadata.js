sap.ui.define([
  "sap/m/MessageToast",
  "sap/ui/core/Fragment",
  "sap/ui/model/json/JSONModel"
], function (MessageToast, Fragment, JSONModel) {
  "use strict";
  function _customColumnController(oExtensionAPI) {
    var detailDialog;
    function closeDialog() {
      detailDialog && detailDialog.close();
    }
    return {
      onBeforeOpen: function (oEvent) {
        detailDialog = oEvent.getSource();
      },
      onCloseDialog: function (oEvent) {
        closeDialog();
      },
    }
  }
  return {
    onPress: async function (oEvent) {
      // MessageToast.show("Custom handler invoked.");
      const oContext = oEvent.getSource().getBindingContext();
      if (!oContext) return;
      const metaDataValue = await oContext.requestProperty("metaData");
      const decision = await oContext.requestProperty('status');
      try {
        // const metaDataValue = await oContext.requestObject("metaData");
        if (!metaDataValue) {
          console.warn("metaData field not available");
          return;
        }
        const parsedMeta = JSON.parse(metaDataValue);
        const metaData = parsedMeta.metadata || parsedMeta;
        // const oMetaModel = new JSONModel(metaData);
        // this.editFlow.getView().setModel(oMetaModel, "viewModel");  

        const oView = this.editFlow.getView();
        //   oView.getModel("viewModel").setData(metaData);
        const oViewModel = oView.getModel("viewModel");
        const oExistingData = oViewModel.getData() || {};
        oViewModel.setData({ ...oExistingData, ...metaData });
        oView.getModel("viewModel").setProperty("/decision", decision);

        if (!this._oDialog) {
          this._oDialog = await Fragment.load({
            id: this.editFlow.getView().getId(),
            name: "genaicontentingestion.fragment.MyDialog",
            controller: _customColumnController(this)
          });
          this.editFlow.getView().addDependent(this._oDialog);
        }
        this._oDialog.open();
        // const oDialog = await oView._oMyDialogPromise;
        // oDialog.open();
      } catch (e) {
        console.error("Error parsing metaData:", e);
      }
    }
  };
});
sap.ui.define(
  [
    "sap/ui/core/mvc/ControllerExtension",
    "sap/m/MessageBox",
    "sap/ui/core/BusyIndicator",
    "sap/ui/core/Fragment",
    "sap/m/MessageToast",

  ],
  function (ControllerExtension, MessageBox, BusyIndicator, Fragment, MessageToast) {
    "use strict";
    return ControllerExtension.extend(
      "genaicontentingestion.controller.CustomExpandedHeader",
      {
        override: {
          onInit: function () {

            const oModel = new sap.ui.model.json.JSONModel();
            this.getView().setModel(oModel, "viewModel");
            this.getView().getModel("viewModel").setProperty("/decision");
            this.getView().getModel("viewModel").setProperty("/useCase");
            this.getView().getModel("viewModel").setProperty("/destination");
            this.onAppSelection();
          }
        },
        onAppSelection: async function () {
          const baseUrl = sap.ui.require.toUrl('genaicontentingestion');
          const csrf = await this.onfetchCSRF(baseUrl);
          const appUrl = baseUrl + "/odata/v4/catalog/AppSelection";
          const teamUrl = baseUrl + "/odata/v4/catalog/ConfigStore";
          const response = await fetch(appUrl, {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              "X-CSRF-Token": csrf
            },
            credentials: "include",
          });
          const res = await response.json();
          const sKey = res.value?.[0]?.AppName;
          this.getView().getModel("viewModel").setProperty("/usecase", sKey);
           const responseTeam = await fetch(teamUrl, {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              "X-CSRF-Token": csrf
            },
            credentials: "include",
          });
          const resTeam = await responseTeam.json();
        const sKeyTeam = resTeam.value.map(r => r.team);
         // const sKeyTeam = ["Liquidity", "Capital"];
const oTeamModel = new sap.ui.model.json.JSONModel({
  selectedTeams: sKeyTeam
});
this.getView().setModel(oTeamModel, "teamModel");
          this.onFilterBarChange(sKey);
       //  this.onFilterBarChange("Treasury");
        },
        onTypeMismatch: function () {
          MessageBox.error("Only pdf, docx, xlsx files are allowed");
        },
        onSizeExceed: function () {
          MessageBox.error("File too large. Maximum size is 20MB");
        },
        getBaseURL: function () {
          var appId = this.getOwnerComponent().getManifestEntry("/sap.app/id");
          var appPath = appId.replaceAll(".", "/");
          var appModulePath = jQuery.sap.getModulePath(appPath);
          return appModulePath;
        },
        calculateFileHash: async function (file) {
          const arrayBuffer = await file.arrayBuffer();
          const hashBuffer = await crypto.subtle.digest("SHA-256", arrayBuffer);
          const hashArray = Array.from(new Uint8Array(hashBuffer));
          return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
        },
        _getText: function (sTextId, aArgs) {
          return this.base
            .getOwnerComponent()
            .getModel("i18n")
            .getResourceBundle()
            .getText(sTextId, aArgs);
        },
        onUseCaseChange: async function (oEvent) {
          const oSelectedItem = oEvent.getParameter("selectedItem");
          if (!oSelectedItem) return;
          const sKey = oSelectedItem.getText();
          this.getView().getModel("viewModel").setProperty("/usecase", sKey);
          const oContext = oEvent.getSource().getSelectedItem().getBindingContext();
          // if (!oContext) return;
          //const DestinationName = await oContext.requestProperty("DestinationName");
          
          this.onFilterBarChange(sKey);
        },
        onFileTypeChange: async function (oEvent) {
          const oSelectedItem = oEvent.getParameter("selectedItem");
          if (!oSelectedItem) return;
          const sKey = oSelectedItem.getText();
          this.getView().getModel("viewModel").setProperty("/fileType", sKey);
          const UseCase = this.getView().getModel("viewModel").getProperty("/usecase");
          const ft = sap.ui.core.Fragment.byId(
            this.getView().getId() + "--myUploadDialog",
            "teamSelect"
          )
          const oBinding = ft.getBinding("items");
          if (oBinding) {
            oBinding.filter([
              new sap.ui.model.Filter("fileType", "EQ", sKey),
              new sap.ui.model.Filter("usecase", "EQ", UseCase),
               
            ]);
          }

        },
        onTeamChange: async function (oEvent) {
          const oSelectedItem = oEvent.getParameter("selectedItem");
          if (!oSelectedItem) return;
          const sKey = oSelectedItem.getText();
          this.getView().getModel("viewModel").setProperty("/team", sKey);

        },
        onFilterBarChange: function (sKey) {
          const oFilterBar = sap.ui.getCore().byId(
            "genaicontentingestion::ContentList--fe::FilterBar::Content"
          );
           const oTeamModel = this.getView().getModel("teamModel");
           const aTeams = oTeamModel.getProperty("/selectedTeams");
   //  const sKeyt = "Treasury";
  //   const aTeams = ["Liquidity", "Capital"];
     const aTeamConditions = aTeams.map(v => ({ operator: "EQ", values: [v] }));
          if (oFilterBar) {
           
            oFilterBar.setFilterConditions({
              UseCase: [
                {
                  operator: "EQ",
                  values: [sKey]
                }
              ],
               team: aTeamConditions
            });

            oFilterBar.triggerSearch();
          } else {
            console.warn("⚠️ FilterBar not found yet");
          }
        },
        onfetchCSRF: async function (url) {
          const response = await fetch(url, {
            method: "HEAD",
            credentials: "include",
            headers: {
              "X-CSRF-Token": "Fetch"
            }
          });
          const token = response.headers.get("X-CSRF-Token");
          if (!token) {
            throw new Error("Failed to fetch CSRF token");
          }
          return token;
        },
        onOpenDialog: function (response) {
          var that = this;
          var metaData = response.metadata;
          if (!metaData) {
            return;
          }
          metaData["filename"] = response.filename;

          this.getView().getModel("viewModel").setData(metaData);
          // this.iProgress = 0;
          if (!this._oDialog) {
            this._pDialog = Fragment.load({
              id: this.getView().getId() + "--myDialog",
              name: "genaicontentingestion.fragment.MyDialog",
              controller: this
            }).then(function (oDialog) {
              that._oDialog = oDialog;
              that.getView().addDependent(oDialog);
              that._oDialog.open();

            });
          }
          else {
            that._oDialog.open();
          }
          return true;
        },

        onCloseDialog: function () {
          this._oDialog.close();
        },

        onUploadPress: function () {
          MessageToast.show("Upload pressed!");

          const UseCase = this.getView().getModel("viewModel").getProperty("/usecase");
          var that = this;
          if (!this._oDialog) {
            this._pDialog = Fragment.load({
              id: this.getView().getId() + "--myUploadDialog",
              name: "genaicontentingestion.fragment.UploadFileDialog",
              controller: this
            }).then(function (oDialog) {
              that._oDialog = oDialog;
              that.getView().addDependent(oDialog);

              that._oDialog.open();

            });
          }
          else {
            that._oDialog.open();
          }


        },
        onCancelUpload: function () {
          this._oDialog.close();
        },
        onConfirmUpload: async function (oEvent) {
          try {
            var that = this;
            BusyIndicator.show(0);

            const UseCase = this.getView().getModel("viewModel").getProperty("/usecase");
            var oteam = this.getView().getModel("viewModel").getProperty("/team");
            var ofileType = this.getView().getModel("viewModel").getProperty("/fileType");
        
            //const oFileUploader = this.base.byId("__fileUploader");
            const oFileUploader = sap.ui.core.Fragment.byId(
              that.getView().getId() + "--myUploadDialog",
              "__fileUploader"
            );



            const oFile = oFileUploader.getDomRef("fu").files[0];
            const baseUrl = sap.ui.require.toUrl('genaicontentingestion');

            const chatUrl = baseUrl + "/api/upload";
            const contentUrl = baseUrl + "/odata/v4/catalog/Content";
            const csrf = await this.onfetchCSRF(baseUrl);
            console.log(oFile);
            let formData = new FormData();
            formData.append("file", oFile);


            if (!oFile) {
              sap.m.MessageToast.show("Please select a file to upload.");
              return;
            }
            const fileHash = await this.calculateFileHash(oFile);

            //check for duplicate file
            const resDuplicate = await fetch(contentUrl, {
              method: "GET",
              headers: {
                "Content-Type": "application/json",
                "X-CSRF-Token": csrf
              },
              credentials: "include",
            });
            const dupl = await resDuplicate.json();
            var flag;
            if (dupl.value && dupl.value.length > 0) {
              dupl.value.forEach(record => {
                if (record.ID == fileHash) {
                  MessageBox.error(`File already exists!`);
                  oFileUploader.setValueState("None");
                  flag = true;
                }
              })
              if (flag)
                return;
            }
            // get the API response
            const responseAPI = await fetch(chatUrl, {
              method: "POST",
              headers: {
                "X-CSRF-Token": csrf,
              },
              body: formData
            });
            if (!responseAPI.ok) {
              const res = await responseAPI.json();
              sap.m.MessageToast.show(res.message);
              return;
            }
            const json = await responseAPI.json();
            sap.m.MessageToast.show("opening dialog box");
            const dialog = await this.onOpenDialog(json);
            const decision = json.metadata.processing_decision;
            this.getView().getModel("viewModel").setProperty("/decision", decision)
            if (dialog) {
              if (decision == "REJECTED")
                return;
              else {
                const putUrl = baseUrl + "/odata/v4/catalog/Content/" + fileHash + "/content";

                const metadata = json.metadata;

                if (oFileUploader.getValue()) {
                  oFileUploader.setValueState("None");

                  // create a record in Content Table
                  const response = await fetch(contentUrl, {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      "X-CSRF-Token": csrf
                    },
                    credentials: "include",
                    body: JSON.stringify({
                      "ID": `${fileHash}`,
                      fileName: oFile.name,
                      "url": putUrl,
                      status: "SUBMITTED",
                      metaData: JSON.stringify({ metadata }),
                      UseCase: UseCase,
                      team: oteam
                    })
                  });

                  if (!response.ok) {
                    if (response.status === 400) {
                      sap.m.MessageToast.show("400-Bad Request");
                      return
                    } else {
                      throw new Error(`Entity creation failed: ${response.status}`);
                    }
                  }
                  //  const metadataRes = await this.saveMetaData(csrf, json.metadata, oFile.name);
                  const oExtModel = this.base.getExtensionAPI().getModel();
                  var fileType;
                  if (oFile.type.includes("pdf"))
                    fileType = 'PDF'
                  else if (oFile.type.includes("spreadsheet"))
                    fileType = 'Excel'
                  else
                    fileType = 'Document/Word'
                  await fetch(putUrl, {
                    method: "PUT",
                    headers: {
                      "Content-Type": oFile.type,
                      "Slug": encodeURIComponent(oFile.name),
                      "X-CSRF-Token": csrf
                    },
                    credentials: "include",
                    body: oFile
                  });
                  oExtModel.refresh();
                  oFileUploader.setValue("");
                } else {
                  oFileUploader.setValueState("Error");
                }
              }
            }

          } catch (error) {
            console.error(error);
            MessageBox.error("fileUploadError", {
              details: error,
            });
          } finally {
            BusyIndicator.hide();
          }
        },




      }
    );
  }
);

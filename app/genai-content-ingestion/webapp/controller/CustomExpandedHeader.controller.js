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
            const oToolbar = sap.ui.getCore().byId("genaicontentingestion::ContentList--fe::DynamicPageTitle");

            if (oToolbar) {
              oToolbar.setVisible(false);
            }
            const oModel = new sap.ui.model.json.JSONModel();
            this.getView().setModel(oModel, "viewModel");

            var appModulePath = jQuery.sap.getModulePath("genaicontentingestion");

            let oImageModel = new sap.ui.model.json.JSONModel({
              path: appModulePath,
            });
            this.getView().setModel(oImageModel, "imageModel");

            this.getView().getModel("viewModel").setProperty("/decision");
            this.getView().getModel("viewModel").setProperty("/useCase");
            this.getView().getModel("viewModel").setProperty("/destination");
            this.onAppSelection();

          }
        },
        onfetchRoles: async function () {
      
          const baseUrl = sap.ui.require.toUrl('genaicontentingestion');
          const url = baseUrl + "/user-api/currentUser";
          const usecase = this.getView().getModel("viewModel").getProperty("/usecase");

          try {
            const response = await fetch(url, {
              method: "GET",
              headers: { "Content-Type": "application/json" }
            });

            if (!response.ok) {
              throw new Error(`HTTP error! Status: ${response.status}`);
            }

            const data = await response.json();
            const roles = data.scopes;
            const checkerRole = `${usecase}_ContentChecker`;
            const makerRole = `${usecase}_ContentMaker`;
            const hasScopeForChecker = roles.some(role => role.includes(checkerRole));
            const hasScopeForMaker = roles.some(role => role.includes(makerRole));

            // Create a new authModel for this controller
            const authModel = new sap.ui.model.json.JSONModel({
              // isChecker: hasScopeForChecker,
              // isMaker: hasScopeForMaker,
              isChecker: true,
              isMaker: true,
              usecase: usecase
            });

            this.getView().setModel(authModel, "authModel");  // set the model with a named model

            console.log("Auth model created:", authModel.getData());

          } catch (error) {
            console.error("API Error:", error);
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

          const oTeamModel = new sap.ui.model.json.JSONModel({
            selectedTeams: sKeyTeam
          });
          this.onfetchRoles();
          this.getView().setModel(oTeamModel, "teamModel");
          this.onFilterBarChange(sKey);

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
          this.onfetchRoles();
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
          const aTeamConditions = aTeams.map(v => ({ operator: "Contains", values: [v] }));
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

          //   this.getView().getModel("viewModel").setData(metaData);
          const oViewModel = this.getView().getModel("viewModel");
          const oExistingData = oViewModel.getData() || {};
          oViewModel.setData({ ...oExistingData, ...metaData });
          // this.iProgress = 0;
          if (!this._oResultDialog) {
            this._oResultDialog = Fragment.load({
              id: this.getView().getId() + "--myDialog",
              name: "genaicontentingestion.fragment.MyDialog",
              controller: this
            }).then(function (oDialog) {
              that._oResultDialog = oDialog;
              that.getView().addDependent(oDialog);
              that._oResultDialog.open();

            });
          }
          else {
            that._oResultDialog.open();
          }
          return true;
        },

        onCloseDialog: function () {
          if (this._oResultDialog) {
            this._oResultDialog.close();
            this._oResultDialog.destroy();
            this._oResultDialog = null;
          }
        },

        onUploadPress: function () {
          MessageToast.show("Upload pressed!");

          const UseCase = this.getView().getModel("viewModel").getProperty("/usecase");
          var that = this;
          Fragment.load({
            id: this.getView().getId() + "--myUploadDialog",
            name: "genaicontentingestion.fragment.UploadFileDialog",
            controller: this
          }).then(oDialog => {
            this._oDialog = oDialog;
            this.getView().addDependent(oDialog);
            oDialog.open();
          });

        },
        onCancelUpload: function () {
          if (this._oDialog) {
            this._oDialog.destroy();
            this._oDialog = null;
          }
        },
         _validateFile: async function (file) {
          //read the excel file and check the columns sequence
          const fileReader = new FileReader();
          const oFile = file;
          let isValid = false;
          let headers,dataRows;
          const readFilePromise = new Promise((resolve, reject) => {
            fileReader.onload = async (e) => {
              const arrayBuffer = e.target.result;
              const data = new Uint8Array(arrayBuffer);
              const workbook = XLSX.read(data, { type: "array" });
              const firstSheetName = workbook.SheetNames[0];
              const worksheet = workbook.Sheets[firstSheetName];
              const jsonData = XLSX.utils.sheet_to_json(worksheet, {
                header: 1,
              });
              headers = jsonData[0];
              dataRows = jsonData.slice(1);
              if (
                headers.length !== 4 ||
                headers[0] !== "bankID" ||
                headers[1] !== "stdMetric" ||
                headers[2] !== "bankMetric"
              ) {
                MessageBox.error(
                  "Invalid Template Format."
                );
                reject("Invalid Header");
              }else {
                resolve("Valid Header");
              }
            };
            fileReader.readAsArrayBuffer(oFile);
          });
          try {
            await readFilePromise;
            isValid = true;
          } catch (error) {
            isValid = false;
          }
          this._checkBankIDExists(dataRows.map(r => r[0])).then(exists => {
            if (!exists) {
              MessageBox.error("One or more Bank IDs do not exist in the system.");
              isValid = false;
            }
          }).catch(err => {
            console.error("Error checking Bank IDs:", err);
            isValid = false;
          });
          return isValid;
        },
        _checkBankIDExists: async function (bankIDs) {
          const baseUrl = sap.ui.require.toUrl('genaicontentingestion');
          const csrf = await this.onfetchCSRF(baseUrl);
          const bankUrl = baseUrl + "/odata/v4/catalog/checkBanks?codes=" + bankIDs.map(id => `${id}`).join(",");
          const response = await fetch(bankUrl, {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              "X-CSRF-Token": csrf
            },
            credentials: "include",
          });
          const res = await response.json();
          return res.value;
        },
        onConfirmUpload: async function (oEvent) {
          try {

            var that = this;
            BusyIndicator.show(0);

            const UseCase = this.getView().getModel("viewModel").getProperty("/usecase");
            if (!UseCase) {
              sap.m.MessageToast.show("Please Select the UseCase ");
              return;
            }

            const use_case = UseCase.toLowerCase();
            var oteam = this.getView().getModel("viewModel").getProperty("/team");
            if (!oteam) {
              sap.m.MessageToast.show("Please Select the Team ");
              return;
            }
            var ofileType = this.getView().getModel("viewModel").getProperty("/fileType");
            if (!ofileType) {
              sap.m.MessageToast.show("Please Select the FileType ");
              return;
            }

            //const oFileUploader = this.base.byId("__fileUploader");
            const oFileUploader = sap.ui.core.Fragment.byId(
              that.getView().getId() + "--myUploadDialog",
              "__fileUploader"
            );
            const oFile = oFileUploader.getDomRef("fu").files[0];
            const baseUrl = sap.ui.require.toUrl('genaicontentingestion');

            const chatUrl = baseUrl + "/api/upload?use_case=" + use_case;
            const contentUrl = baseUrl + "/odata/v4/catalog/Content";
            if (ofileType === "Meta Data") {
              const isValid = await this._validateFile(oFile);

              if (!isValid) {
                BusyIndicator.hide();
                return;
              }
            }
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
              dupl.value.forEach(async record => {
                if (record.ID == fileHash) {
                  flag = true;
                  if (record.team.includes(oteam) == 1) {
                    MessageBox.error(`File already exists!`);
                    oFileUploader.setValueState("None");

                  }
                  else {
                    const newteam = record.team + "," + oteam;
                    const putteamUrl = baseUrl + "/odata/v4/catalog/Content/" + fileHash;
                    const res = await fetch(putteamUrl, {
                      method: "PATCH",
                      headers: {
                        "Content-Type": "application/json",
                        "X-CSRF-Token": csrf
                      },
                      credentials: "include",
                      body: JSON.stringify({
                        team: newteam
                      })
                    });

                  }

                }
              })
              if (flag) {
                this.onCancelUpload();
                return;
              }

            }


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
            const oExtModel = this.base.getExtensionAPI().getModel();
            oExtModel.refresh();
          }
        },
      }
    );
  }
);

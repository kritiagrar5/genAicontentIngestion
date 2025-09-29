sap.ui.define([
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/ui/core/BusyIndicator"
], function (MessageToast, MessageBox, BusyIndicator) {
    'use strict';

    return {
        onPress: function (oEvent) {
            const ctx = oEvent.getSource().getBindingContext();
            const fileID = ctx.getProperty("ID");

            //  Confirmation before delete
            MessageBox.confirm("Do you want to delete this file?", {
                actions: [MessageBox.Action.OK, MessageBox.Action.CANCEL],
                emphasizedAction: MessageBox.Action.OK,
                onClose: async (sAction) => {
                    if (sAction === MessageBox.Action.OK) {
                        BusyIndicator.show(0);
                        const baseUrl = sap.ui.require.toUrl('genaicontentingestion');
                        const deleteUrl = baseUrl + "/odata/v4/catalog/Content/" + fileID + "/deleteContent";

                        try {
                            const response = await fetch(baseUrl, {
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

                            const resContent = await fetch(deleteUrl, {
                                method: "POST",
                                headers: {
                                    "Content-Type": "application/json",
                                    "X-CSRF-Token": token
                                },
                                credentials: "include",
                            });

                            const res = await resContent.json();
                            if (resContent.ok) {
                                MessageBox.information("File has been successfully deleted");
                                this.getEditFlow().getView().getController().getExtensionAPI().refresh();
                            } else {
                                MessageBox.error(res.error.message);
                            }
                        } catch (err) {
                            MessageBox.error(err.message || err);
                        } finally {
                            BusyIndicator.hide();
                        }
                    }
                }
            });
        }
    };
});

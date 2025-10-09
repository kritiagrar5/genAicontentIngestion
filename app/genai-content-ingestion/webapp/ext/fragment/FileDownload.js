sap.ui.define([
    "sap/m/MessageToast"
], function (MessageToast) {
    'use strict';

    return {
        onPress: async function (oEvent) {
            const ctx = oEvent.getSource().getBindingContext();
            const fileName = ctx.getProperty("fileName");
            const baseUrl = sap.ui.require.toUrl('genaicontentingestion');
            const contentUrl = baseUrl + "/odata/v4/catalog/Content";
            var url;
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
            const resContent = await fetch(contentUrl, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    "X-CSRF-Token": token
                },
                credentials: "include",
            });
            const res = await resContent.json();
            if (res.value && res.value.length > 0) {
                const values = res.value;
                const record = values.find(item => item.fileName === fileName);
                url = record.url;
            }
            if (url) {
                // Open in new tab
                window.open(url, "_blank");
            } else {
                MessageToast.show("File URL not available for " + fileName);
            }
        }
    };
});

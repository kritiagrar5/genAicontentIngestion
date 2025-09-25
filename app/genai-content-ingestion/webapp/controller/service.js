sap.ui.define([
    '../lib/util'
], function (util) {
    'use strict';


    /**
     * Executes custom actions for Post Feedback
     * @param {object} extensionApi Fiori Element V4 extension API
     * @param {object} parameters - Payload params
     * @returns {Promise} for the action context
     */
    async function createContent(extensionApi,oParams,action,model) {
        
       // const model = mParameters.context.oModel;
        return await util.executeUnBoundInvokeAction(
            extensionApi,
            model,
            action,
            oParams
        );
    }

    return {
        createContent
    };
});
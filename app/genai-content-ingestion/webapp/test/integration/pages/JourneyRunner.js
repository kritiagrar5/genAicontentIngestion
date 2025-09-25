sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"genaicontentingestion/test/integration/pages/ContentList",
	"genaicontentingestion/test/integration/pages/ContentObjectPage"
], function (JourneyRunner, ContentList, ContentObjectPage) {
    'use strict';

    var runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('genaicontentingestion') + '/index.html',
        pages: {
			onTheContentList: ContentList,
			onTheContentObjectPage: ContentObjectPage
        },
        async: true
    });

    return runner;
});


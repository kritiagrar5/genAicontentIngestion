using CatalogService as service from '../../srv/service';

annotate service.Content with 
    @Capabilities.DeleteRestrictions.Deletable: false;

annotate service.Content with {
    // Annotation for the virtual field
    canApprove @UI.Hidden;
};


annotate service.Content with @UI.LineItem: [
    {
        $Type                : 'UI.DataField',
        Label                : 'Media Type',
        Value                : mediaType,
        visibleInAdvancedArea: false,
        ![@HTML5.CssDefaults]: {width: 'auto', }
    },
    {
        $Type                : 'UI.DataField',
        Label                : 'Tag Type',
        Value                : tagType,
        ![@HTML5.CssDefaults]: {width: 'auto', },
        @UI.Hidden           : true
    },
    {
        $Type                : 'UI.DataField',
        Label                : 'Status Code',
        Value                : status,
        ![@HTML5.CssDefaults]: {width: 'auto', }
    },
    {
        $Type                : 'UI.DataField',
        Label                : 'Embedding Status Code',
        Value                : embeddingStatus,
        ![@HTML5.CssDefaults]: {width: 'auto', },
        @UI.Hidden           : true
    },
    {
        $Type                : 'UI.DataField',
        Label                : 'Content',
        Value                : content,
        ![@HTML5.CssDefaults]: {width: 'auto', },
        ![@UI.Hidden]        : true
    },
    {
        $Type                : 'UI.DataField',
        Label                : 'Created By',
        Value                : createdBy,
        ![@HTML5.CssDefaults]: {width: 'auto', }
    },
    {
        $Type                : 'UI.DataField',
        Label                : 'Changed By',
        Value                : modifiedBy,
        ![@HTML5.CssDefaults]: {width: 'auto', }
    },
    {
        $Type     : 'UI.DataField',
        Value     : metaData,
        @UI.Hidden: true
    },
    {
        $Type     : 'UI.DataField',
        Value     : fileName,
        @UI.Hidden: true
    },
    {
        $Type     : 'UI.DataField',
        Value     : url,
        @UI.Hidden: true
    },
    {
        $Type     : 'UI.DataField',
        Value     : ID,
        @UI.Hidden: true
    },
    {
        $Type     : 'UI.DataField',
        Value     : isChecker,
        @UI.Hidden: true
    },
     {
        $Type                : 'UI.DataField',
        Label                : 'UseCase',
        Value                : UseCase,
          ![@HTML5.CssDefaults]: {width: 'auto', },
        ![@UI.Hidden]        : false
    },
   /* {
      $Type: 'UI.DataFieldForAction',
      Action: 'CatalogService.approveContent',
      Label: 'Approve',
      
      InvocationGrouping: #ChangeSet,
     
      Determining: false  ,
     ![@UI.Hidden]: { $edmJson: { $Path: '/CatalogService.ActionVisibility/isChkr' } }
    }, 
   {
      $Type: 'UI.DataFieldForAction',
      Action: 'CatalogService.rejectContent',
      Label: 'Reject',
      InvocationGrouping: #ChangeSet,
      Determining: false  
    },
     {
      $Type: 'UI.DataFieldForAction',
      Action: 'CatalogService.deleteContent',
      Label: 'Delete',
      InvocationGrouping: #ChangeSet,
      Determining: false  
    },*/
    
    {
        $Type             : 'UI.DataFieldForAction',
        Action            : 'CatalogService.approveContent',
        Label             : 'Approve',
        IconUrl           : 'sap-icon://accept',
        Inline            : true,
        Criticality       : #Positive,
        Determining       : true,
        @title            : 'Approve',
        @HTML5.CssDefaults: {width: '5rem'},
        ![@UI.Hidden]     : {$edmJson: {$Not: {$And: [
            {$Eq: [
                {$Path: 'status'},
                'SUBMITTED'
            ]},
            {$Path: 'canApprove'}
        ]}}},
        InvocationGrouping: #Isolated
    },{
        $Type             : 'UI.DataFieldForAction',
        Action            : 'CatalogService.rejectContent',
        Label             : 'Reject',
        IconUrl           : 'sap-icon://decline',
        Inline            : true,
        Criticality       : #Negative,
        @HTML5.CssDefaults: {width: '5rem'},
      
        ![@UI.Hidden]     : {$edmJson: {$Not: {$And: [
            {$Eq: [
                {$Path: 'status'},
                'SUBMITTED'
            ]},
            {$Path: 'canApprove'}
        ]}}},
        InvocationGrouping: #Isolated,
    },
    {
        $Type             : 'UI.DataFieldForAction',
        Action            : 'CatalogService.deleteContent',
        Label             : 'Delete',
        IconUrl           : 'sap-icon://delete',
        Inline            : true,
        Criticality       : #Positive,
        Determining       : true,
        @title            : 'Delete',
        @HTML5.CssDefaults: {width: '5rem'},
        ![@UI.Hidden]     : {$edmJson: {$Not: {$And: [
           
            {$Path: 'canDelete'}
        ]}}},
        InvocationGrouping: #Isolated
    }
   
   
];

annotate service.Content with @(
    UI.SelectionPresentationVariant #qa          : {
        $Type              : 'UI.SelectionPresentationVariantType',
        PresentationVariant: {$Type: 'UI.PresentationVariantType'},
        SelectionVariant   : {
            $Type        : 'UI.SelectionVariantType',
            SelectOptions: [{
                $Type       : 'UI.SelectOptionType',
                PropertyName: tagType,
                Ranges      : [{
                    Sign  : #I,
                    Option: #EQ,
                    Low   : 'QA'
                }],
            }],
        },
        Text               : 'Q&A',
        @UI.Hidden         : true
    },
    UI.SelectionPresentationVariant #summary     : {
        $Type              : 'UI.SelectionPresentationVariantType',
        PresentationVariant: {$Type: 'UI.PresentationVariantType'},
        SelectionVariant   : {
            $Type        : 'UI.SelectionVariantType',
            SelectOptions: [{
                $Type       : 'UI.SelectOptionType',
                PropertyName: tagType,
                Ranges      : [{
                    Sign  : #I,
                    Option: #EQ,
                    Low   : 'SUMMARY'
                }]
            }],
        },
        Text               : 'Summary',
        @UI.Hidden         : true
    },
    UI.SelectionPresentationVariant #qainbox     : {
        $Type              : 'UI.SelectionPresentationVariantType',
        PresentationVariant: {$Type: 'UI.PresentationVariantType'},
        SelectionVariant   : {
            $Type        : 'UI.SelectionVariantType',
            SelectOptions: [{
                $Type       : 'UI.SelectOptionType',
                PropertyName: tagType,
                Ranges      : [{
                    Sign  : #I,
                    Option: #EQ,
                    Low   : 'QA'
                }]
            }],
        },
        Text               : 'Q&A',
        @UI.Hidden         : true
    },
    UI.SelectionPresentationVariant #summaryinbox: {
        $Type              : 'UI.SelectionPresentationVariantType',
        PresentationVariant: {$Type: 'UI.PresentationVariantType'},
        SelectionVariant   : {
            $Type        : 'UI.SelectionVariantType',
            SelectOptions: [
                {
                    $Type       : 'UI.SelectOptionType',
                    PropertyName: tagType,
                    Ranges      : [{
                        Sign  : #I,
                        Option: #EQ,
                        Low   : 'SUMMARY'
                    }]
                },
                {
                    $Type       : 'UI.SelectOptionType',
                    PropertyName: status,
                    Ranges      : [{
                        Sign  : #I,
                        Option: #NE,
                        Low   : 'DRAFT'
                    }]
                }
            ]
        },
        Text               : 'Summary Inbox',
        @UI.Hidden         : true
    },
   
);

annotate service.Content with {
    mediaType @Common.Label: 'Media Type';
};

annotate service.Content with {
    status @Common.Label: 'Status Code'
};

/*annotate service.approveContent with @(
  Common.SideEffects : { TargetEntities: ['CatalogService.Contents'] }
);*/
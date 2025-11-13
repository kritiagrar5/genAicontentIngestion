namespace genai;

using {
  cuid,
  managed
} from '@sap/cds/common';

entity AppSelection {
  key ID              : UUID;
      AppName         : String;
     }

  @UI.lineItem: [{ position: 40, label: 'UseCase',value:UseCase, hidden: false }]
@cds.search: {
      ID:false,
      fileName:true,
      mediaType:true,
      status:true,
      isChecker:false,
      UseCase:false,
      team:false,
      fileType:false,
      embeddingStatus:false,
      url:false,
      content:false,
      metaData:false
}
entity Content : managed {
      @UI.AdaptationHidden: true
      key ID              : String;

      @UI.AdaptationHidden: true
      status_reason: String;
      
      @Common.Label       : 'File Name'
      fileName        : String;
      mediaType       : String;

      @UI.AdaptationHidden: true
      tagType         : String;
      status          : String;
      @UI.HiddenFilter: true
      embeddingStatus : String;

      @UI.AdaptationHidden: true
      url             : String;

      @Core.MediaType     : mediaType
      content         : LargeBinary;

      @UI.AdaptationHidden: true
      metaData        : LargeString;
      @UI.HiddenFilter: true
      isChecker       : Boolean;
      UseCase         : String;
      @UI.HiddenFilter: true
      team            : String;
      @UI.HiddenFilter: true
      fileType        : String;

}

@odata.singleton
entity ActionVisibility : cuid, {
  isChkr  : Boolean default false;
  isMaker : Boolean default false;
  usecase : String;
  team    : String;
}

entity FileType {
  key ID              : UUID;
      fileType         : String;
   }

entity ConfigStore {

  key ID: String;
  team : String;
  roles : String;
  usecase : String;
  fileType : String;
  
}
entity MetaData : cuid {
  key bankID: String;
  key stdMetric: String;
  bankMetric: String;
  userID: String;
}

entity DataDictionary : cuid {
  key column: String;
  description: String;
  longDescription: LargeString;
  userID: String;
}
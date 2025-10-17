namespace genai;

using {
  cuid,
  managed
} from '@sap/cds/common';

entity AppSelection {
  key ID              : UUID;
      AppName         : String;
     }
entity Content : managed {
      @UI.AdaptationHidden: true
  key ID              : String;

      @UI.AdaptationHidden: true
      @Common.Label       : 'File Name'
      fileName        : String;
      mediaType       : String;

      @UI.AdaptationHidden: true
      tagType         : String;
      status          : String;
      embeddingStatus : String;

      @UI.AdaptationHidden: true
      url             : String;

      @Core.MediaType     : mediaType
      content         : LargeBinary;

      @UI.AdaptationHidden: true
      metaData        : LargeString;

      @UI.AdaptationHidden: true
      isChecker       : Boolean;

      UseCase         : String;
      team            : String;
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
namespace genai;

aspect SearchableManagedFields {
  @Search.fuzziness: 0.8
  @Search.searchMode: 'text'
  createdBy     : String;
  @Search.fuzziness: 0.8
  @Search.searchMode: 'text'
  modifiedBy    : String;
}

using {
  cuid,
  managed
} from '@sap/cds/common';

entity AppSelection {
  key ID              : UUID;
      AppName         : String;
     }

  @UI.lineItem: [{ position: 40, label: 'UseCase',value:UseCase, hidden: false }]
entity Content : managed, SearchableManagedFields {
      @UI.AdaptationHidden: true
      key ID              : String;

      @UI.AdaptationHidden: true
      @Common.Label       : 'File Name'
      @Search.defaultSearchElement
      @Search.fuzziness: 0.8
      @Search.searchMode: 'text'
      fileName        : String;
      @Search.fuzziness: 0.8
      @Search.searchMode: 'text'
      mediaType       : String;

      @UI.AdaptationHidden: true
      tagType         : String;
      @Search.fuzziness: 0.8
      @Search.searchMode: 'text'
      status          : String;
      @Search.searchable: false
      embeddingStatus : String;

      @UI.AdaptationHidden: true
      @Search.searchable: false
      url             : String;

      @Core.MediaType     : mediaType
      @Search.searchable: false
      content         : LargeBinary;

      @UI.AdaptationHidden: true
      @Search.searchable: false
      metaData        : LargeString;

      @Search.searchable: false
      isChecker       : Boolean;
      @Search.searchable: false
      UseCase         : String;
      @Search.searchable: false
      team            : String;
      @Search.searchable: false
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
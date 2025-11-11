using genai as schema from '../db/schema';

service CatalogService {
  entity AppSelection     as
    select from schema.AppSelection {
      *,
     
    }

  entity FileType         as
    select from schema.FileType {
      *,

    }

  entity ActionVisibility as
    select from schema.ActionVisibility {
      *,

    }
entity ConfigStore as
    select from schema.ConfigStore {
      *,
    }
entity MetaData as
    select from schema.MetaData {
      *,
    }
entity DataDictionary as
    select from schema.DataDictionary {
      *,
    }
  entity Content          as
    select from schema.Content {
      *,
  
      UseCase,
      isChecker,
      metaData,
      @UI.Hidden      : true
      @UI.HiddenFilter: true
      virtual canApprove : Boolean @Core.Computed,
      @UI.Hidden      : true
      @UI.HiddenFilter: true
      virtual canDelete  : Boolean @Core.Computed
    }
    actions {
      @cds.odata.bindingparameter.name  : '_it'
      @sap.fe.core.RefreshAfterExecution: true
      @Common.IsActionCritical          : true
      action approveContent() returns Content;

      @cds.odata.bindingparameter.name  : '_it'
      @sap.fe.core.RefreshAfterExecution: true
      @Common.IsActionCritical          : true
      action rejectContent()  returns Content;

      @cds.odata.bindingparameter.name  : '_it'
      @sap.fe.core.RefreshAfterExecution: true
      @Common.IsActionCritical          : true
      action deleteContent()  returns Content;

    };

 

  action createContent(initialData: String)             returns String;
  
  // returns the excel file as attachment
  action downloadMetadata() returns String;
  action downloadDataDictionary() returns String;

}

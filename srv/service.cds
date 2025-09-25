using genai as schema from '../db/schema';

service CatalogService {
  entity AppSelection     as
    select from schema.AppSelection {
      *,
      @UI.Hidden      : true
      @UI.HiddenFilter: true
      virtual isAllowed : Boolean @Core.Computed,
      DestinationName,

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

  entity Content          as
    select from schema.Content {
      *,

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

      @cds.odata.bindingparameter.name  : '_it'
      @sap.fe.core.RefreshAfterExecution: true
      action submit()         returns Content;

    };

  //action approveAll(IDs: array of UUID);
  action Treasury()                                     returns String;
  action createContent(initialData: String)             returns String;

  @Core.MediaType: 'application/octet-stream'
  action uploadFile(AppName: String, file: LargeBinary) returns String;
}

sap.ui.define([], function () {
  "use strict";
  return {
    formatMediaType: function (mediaType) {
      switch (mediaType) {
        case "application/pdf":
          return "PDF Document";
        case "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
          return "Excel Spreadsheet";
        case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
          return "Word Document";
        default:
          return mediaType || "Unknown";
      }
    }
  };
});
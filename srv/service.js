const cds = require("@sap/cds");
const { executeHttpRequest } = require('@sap-cloud-sdk/http-client');
const { getDestination } = require('@sap-cloud-sdk/connectivity');
const { response } = require("express");
const sapCfAxios = require("sap-cf-axios").default;
const axios = require("axios");
const FormData = require("form-data");
const { Readable } = require('stream');
const fetch = require("node-fetch");
const { isOriginOptions } = require("@sap-cloud-sdk/http-client/dist/http-client-types");

module.exports = cds.service.impl(async function () {
  const { Content, MetaData, DataDictionary, PromptTemplate, AppSelection, ActionVisibility, FileType, ConfigStore } = this.entities;
  const LOG = cds.log('CI');

  this.after("READ", "Content", (each, req) => {
    console.log("each", each)
    // const userRoles = { Treasury_ContentChecker: 1, Treasury_ContentMaker: 1 };
    const userRoles = req.user?.roles;
    console.log(" 📥 userRoles ", userRoles)
    console.log(" 📥 user ", req.user)
    const usecase_temp = each.UseCase;
    let usecase;
    if (usecase_temp) {
      if (usecase_temp?.includes("Treasury"))
        usecase = "Treasury";
      else if (usecase_temp?.includes("Peer-Analysis"))
        usecase = "Peer-Analysis";
      const checkerRole = `${usecase}_ContentChecker`;
      const makerRole = `${usecase}_ContentMaker`;
      each.isChecker = userRoles[checkerRole] === 1;
      each.canApprove = userRoles[checkerRole] === 1;
      each.canDelete = userRoles[makerRole] === 1;
    }

    // each.canApprove = true;
    // each.canDelete = true;
  });


  // this.before('READ', 'AppSelection', (req) => {
  //   //const userRoles = { Workzone_EFDNA_Type_Employee: 1, };
  //  const userRoles = req.user?.roles;
  //   const viewerRole = "Workzone_EFDNA_Type_Employee";
  //   console.log("app-selection1:", userRoles)
  //   if (userRoles[viewerRole] === 1) {
  //     console.log("app-selection2:", userRoles)
  //     return;
  //   }

  // });
  this.before('READ', 'ConfigStore', (req) => {
    //  const userRoles = { Workzone_EFDNA_Type_Employee: 1, Workzone_EFDNA_GenAI_Treasury_Practitioners: 1,Workzone_EFDNA_GenAI_Earnings_Practitioners:1 };

    const userRoles = req.user?.roles;
    const conditions = Object.keys(userRoles)
      .map(r => `roles like '%${r}%'`)
      .join(' or ');

    req.query.where(cds.parse.expr(conditions));

  });

  // this.after("READ", "ConfigStore", (rows) => {
  //     if (!Array.isArray(rows)) return rows;

  //     // Create a blank row
  //     const blankRow = {
  //         ID: "",               
  //         fileType: "Select what your file will be used for", 
  //         usecase:"",        
  //     };

  //     // Insert at the start of the array
  //     rows.unshift(blankRow);

  //     return rows;
  // });

  /*this.before("READ", "ConfigStore", (rows) => {
      if (!Array.isArray(rows)) return rows;
    
      const blankRow = {
          ID: "",              
          fileType: "" ,
          team: "" ,
          usecase:"",
          roles:""         
      };
      rows.unshift(blankRow);
      return rows;
  });*/
  this.on('READ', 'Banks', async (req) => {
    const result = await cds.run(SELECT.from('Banks'));
    return result;
  });

  this.on("approveContent", async (req) => {
    console.log("📥 Action called with:", req.params[0]);
    const ID = req.params[0].ID;
    const tx = cds.tx(req);

    const destination = await getDestination({ destinationName: 'GenAIContentIngestionBackend' });

    const oneFile = await SELECT.one
      .from(Content)
      .columns('ID', 'fileName', 'mediaType', 'content', 'createdBy', 'fileType', 'UseCase')
      .where({ ID });
    const use_case = oneFile.UseCase?.toLowerCase();
    const ownFile = oneFile.createdBy === req.user.id;


    if (ownFile) {
      req.reject(400, 'You cannot Approve files that are created by you');
    }
    //check if file content exists
    if (!oneFile?.content) {
      return req.reject(404, 'File content not found.');
    }

    cds.tx(async () => {
      await UPDATE(Content, ID).with({
        status: "PROCESSING"
      });
    })
    let use_case_;
    if (use_case.includes("peer-analysis"))
      use_case_ = "peer-analysis";
    else if (use_case.includes("treasury"))
      use_case_ = "treasury";


    // check if file is meta data(mapper), if yes replace all bank metrics in MetaData table
    console.log('file type is: ', oneFile.fileType);
    console.log('file content is: ', oneFile.content);
    console.log("typeof oneFile.content", typeof oneFile.content); // e.g., 'string', 'object', etc.
    console.log("constructor.name", oneFile.content && oneFile.content.constructor && oneFile.content.constructor.name);
    console.log(String(oneFile.content).slice(0, 100)); // Print a snippet
    console.log('file content is Buffer:', Buffer.isBuffer(oneFile.content));
    if (oneFile.fileType === "Standard Account Line Mapping") {
      //parse the xlsx file and update the metadatatable, first row is header
      const xlsx = require("xlsx");
      const buffer = await streamToBuffer(oneFile.content);
      console.log('buffer is Buffer:', Buffer.isBuffer(oneFile.content));
      const workbook = xlsx.read(buffer, { type: "buffer" });
      console.log('workbook is: ', workbook);
      const sheetName = workbook.SheetNames[0];
      console.log('sheetNames is: ', workbook.SheetNames);
      const worksheet = workbook.Sheets[sheetName];
      console.log('worksheet is: ', worksheet);
      const jsonData = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
      console.log("Excel Data:", jsonData);
      const dataRows = jsonData.slice(1);
      const headers = jsonData[0];

      // remove the rows in MetaData table where bankID === bankID in the excel file
      const bankIDIndex = headers.indexOf("bankID");
      const bankIDs = [...new Set(dataRows.map((row) => row[bankIDIndex]))];
      console.log("Deleting rows with bankIDs:", bankIDs);
      await DELETE.from(MetaData).where({ bankID: bankIDs });
      //insert the rows in MetaData table
      for (const row of dataRows) {
        const rowData = {};
        headers.forEach((header, index) => {
          rowData[header] = row[index];
        });
        rowData["userID"] = oneFile.createdBy;
        console.log('Inserting row:', rowData);
        try {
          await INSERT.into(MetaData).entries(rowData);
        } catch (err) {
          console.error('Error inserting row:', err);
        }
      }
      await tx.update(Content, ID).with({ status: "COMPLETED" });
      return await tx.read(Content).where({ ID });
    } else if (oneFile.fileType === "Data Dictionary") {
      //parse the xlsx file and update the DataDictionary table, first row is header
      const xlsx = require("xlsx");
      const buffer = await streamToBuffer(oneFile.content);
      console.log('buffer is Buffer:', Buffer.isBuffer(oneFile.content));
      const workbook = xlsx.read(buffer, { type: "buffer" });
      console.log('workbook is: ', workbook);
      const sheetName = workbook.SheetNames[0];
      console.log('sheetNames is: ', workbook.SheetNames);
      const worksheet = workbook.Sheets[sheetName];
      console.log('worksheet is: ', worksheet);
      const jsonData = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
      console.log("Excel Data:", jsonData);
      const dataRows = jsonData.slice(1);
      const headers = jsonData[0];

      try {
        // remove all rows in DataDictionary
        console.log("Deleting all rows in DataDictionary");
        await tx.run(DELETE.from(DataDictionary));

        const isEmpty = (val) => val === null || val === undefined || (typeof val === 'string' && val.trim() === '');
        //insert the rows in DataDictionary table

        for (let rowIndex = 0; rowIndex < dataRows.length; rowIndex++) {
          const row = dataRows[rowIndex];

          // skip completely empty rows
          if (row.every(cell => isEmpty(cell))) {
            continue;
          }

          const rowData = {};

          for (let colIndex = 0; colIndex < headers.length; colIndex++) {
            const header = headers[colIndex];
            const value = row[colIndex];

            // partially empty row - null values validation
            if (isEmpty(value)) {
              req.reject(400, "Missing value for column, update the data for missing fields");
            }
            rowData[header] = value;
          }

          rowData.userID = oneFile.createdBy;
          await tx.run(INSERT.into(DataDictionary).entries(rowData));
        }

        await tx.update(Content, ID).with({ status: "COMPLETED" });
        const result = await tx.run(SELECT.one.from(Content).where({ ID }));
        await tx.commit();
        return result;
      } catch (err) {
        await tx.rollback();
        console.error('Error inserting row in DataDictionary:', err);
        throw err;
      }
    } else if (oneFile.fileType === "Prompt Template") {
      //parse the xlsx file and update the Prompt Template table, first row is header
      const xlsx = require("xlsx");
      const buffer = await streamToBuffer(oneFile.content);
      console.log('buffer is Buffer:', Buffer.isBuffer(oneFile.content));
      const workbook = xlsx.read(buffer, { type: "buffer" });
      console.log('workbook is: ', workbook);
      const sheetName = workbook.SheetNames[0];
      console.log('sheetNames is: ', workbook.SheetNames);
      const worksheet = workbook.Sheets[sheetName];
      console.log('worksheet is: ', worksheet);
      const jsonData = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
      // console.log("Excel Data:", jsonData);
      const dataRows = jsonData.slice(1);
      const headers = jsonData[0];

        // remove all rows in PromptTemplate
        console.log("Deleting all rows in PromptTemplate");
      await DELETE.from(PromptTemplate);

        const isEmpty = (val) => val === null || val === undefined || (typeof val === 'string' && val.trim() === '');
        //insert the rows in DataDictionary table

        for (let rowIndex = 0; rowIndex < dataRows.length; rowIndex++) {
          const row = dataRows[rowIndex];

          // skip completely empty rows
          if (row.every(cell => isEmpty(cell))) {
            continue;
          }

          const rowData = {};

          for (let colIndex = 0; colIndex < headers.length; colIndex++) {
            const header = headers[colIndex];
            const value = row[colIndex];

            // partially empty row - null values validation
            if (isEmpty(value)) {
              continue;
            }
            rowData[header] = value;
            console.log("Row Data", rowData);
          }
        await INSERT.into(PromptTemplate).entries(rowData);
        }
        await tx.update(Content, ID).with({ status: "COMPLETED" });
        return await SELECT.one.from(Content).where({ ID });
    }
    else {
      //Call API to create Embeddings
      try {

        const responseEmbeddings = await axios.post(
          `${destination.url}/api/generate-embeddings?use_case=${use_case_}`,
          { document_id: oneFile.ID },
          {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${destination.authTokens?.[0]?.value}`
            }
          }
        );

        console.log("Embeddings Response:", responseEmbeddings)
        if (responseEmbeddings.message) {

          console.log("Embeddings generated successfully")

          return await SELECT.one.from(Content).where({ ID });

        }
        else
          throw new Error(`Embedding API failed with status ${responseEmbeddings.status}`)

      }
      catch (error) {
        console.log("Failed in getting embeddings due to: " + error.response.data?.description);
        return req.reject(400, `Embedding API failed: ${error.response.data?.description}`);
        await UPDATE(Content, ID).with({
          status: "SUBMITTED"
        });

      }
      finally {
        return await SELECT.one.from(Content).where({ ID });
      }
    }

  });



  function streamToBuffer(stream) {
    return new Promise((resolve, reject) => {
      const chunks = [];
      stream.on('data', chunk => chunks.push(chunk));
      stream.on('end', () => resolve(Buffer.concat(chunks)));
      stream.on('error', reject);
    });
  }




  this.on("rejectContent", async (req) => {
    const ID = req.params[0].ID;
    const oneFile = await SELECT.one
      .from(Content)
      .columns('fileName', 'mediaType', 'content', 'createdBy')
      .where({ ID });
    //check user role - checker can approve any file
    // if user is maker - he can't approve his own file
    const ownFile = oneFile.createdBy === req.user.id;

    if (ownFile) {
      req.reject(400, 'You cannot Reject files that are created by you');
    }
    await UPDATE(Content, ID).with({
      status: "REJECTED",
    });
    return await SELECT.one.from(Content).where({ ID });
  });



  this.on("deleteContent", "Content", async (req) => {
    const { ID } = req.params[0];


    const file = await cds.run(
      SELECT.one.from(Content).where({ ID: ID })
    );
    console.log("delete content .... " + file.fileName);
    //check the role - if maker -> createdby and logged in user should be Same
    //if checker can delete any file
    const ownFiles = file.createdBy === req.user.id; // only owner can delete its own file
    const fileName = file.fileName;
    const use_case = file.UseCase?.toLowerCase();


    if (!ownFiles) {
      req.reject(400, 'You cannot delete files that are not created by you');
    }
    let use_case_;
    if (use_case.includes("peer-analysis"))
      use_case_ = "peer-analysis";
    else if (use_case.includes("treasury"))
      use_case_ = "treasury";

    if (file.status != "COMPLETED") {
      await DELETE.from(Content).where({ ID: ID });
      return { ID };
    }
    else {
      try {
        const response = await executeHttpRequest(
          { destinationName: 'GenAIContentIngestionBackend' },
          {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json'
            },
            url: '/api/delete',
            params: { use_case: use_case_ },
            data: { document_id: ID }

          },
          { fetchCsrfToken: false }
        );

        await DELETE.from(Content).where({ ID: ID });

        req.info(response);
        return { ID };
      } catch (error) {

        console.log("Error in delete files API: " + error);

      }
    }
  });

  //   this.on("checkBanks", async (req) => {
  //     console.log("checkBanks", req);
  //     const bankIDsString = req.data.bankIDs;
  //     console.log("bank IDs: ", bankIDsString);
  //     const response = await executeHttpRequest(
  //       { destinationName: "PeerAnalysisV2Srv" },
  //       {
  //         method: "GET",
  //         headers: {
  //           "Content-Type": "application/json",
  //         },
  //         url: "/v2/odata/v4/earning-upload-srv/Banks",
  //         params: {
  //           $filter: `code in ('${bankIDsString.split(',').map(id => id.trim()).join("','")}')`,
  //           $select: "code",
  //         },
  //       }
  //     );
  //     console.log('Banks fetched:', response.data);
  //     const existingBankIDs = response.data.value.map(bank => bank.code);
  //     const allExist = bankIDs.every(id => existingBankIDs.includes(id));
  //     return allExist;

  // });

  this.on("downloadMetadata", async (req) => {
    // Define the headers you want in the Excel file
    const headers = ["bankID", "stdMetric", "bankMetric", "userID"];

    // Fetch all metadata records
    const allMetaData = await cds.run(
      SELECT.from(MetaData).columns(headers).orderBy("bankID ASC")
    );

    // If no data, add an empty object to preserve headers
    const sheetData = allMetaData.length > 0 ? allMetaData : [{}];

    // Convert to Excel with explicit header order
    const xlsx = require("xlsx");
    const worksheet = xlsx.utils.json_to_sheet(sheetData, { header: headers });
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, "MetaData");
    const buffer = xlsx.write(workbook, { type: "buffer", bookType: "xlsx" });
    const fileName = "MetaData.xlsx";

    if (req._.res) {
      req._.res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      req._.res.setHeader(
        "Content-Disposition",
        `attachment; filename=${fileName}`
      );
      req._.res.send(buffer);
      return;
    }
    // Fallback for CAP v5
    return buffer;
  });
  this.on("downloadDataDictionary", async (req) => {
    // Define the headers you want in the Excel file
    const headers = ["column", "description", "longDescription", "userID"];

    // Fetch all DataDictionary records
    const allDataDictionary = await cds.run(
      SELECT.from(DataDictionary).columns(headers).orderBy("column ASC")
    );

    // If no data, add an empty object to preserve headers
    const sheetData = allDataDictionary.length > 0 ? allDataDictionary : [{}];

    // Convert to Excel with explicit header order
    const xlsx = require("xlsx");
    const worksheet = xlsx.utils.json_to_sheet(sheetData, { header: headers });
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, "DataDictionary");
    const buffer = xlsx.write(workbook, { type: "buffer", bookType: "xlsx" });
    const fileName = "DataDictionary.xlsx";

    if (req._.res) {
      req._.res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      req._.res.setHeader(
        "Content-Disposition",
        `attachment; filename=${fileName}`
      );
      req._.res.send(buffer);
      return;
    }
    // Fallback for CAP v5
    return buffer;
  });
  this.on("downloadPromptTemplate", async (req) => {
    // Define the headers you want in the Excel file
    const headers = ["OLD_ID", "CATEGORY", "PRODUCT", "TEMPLATE", "ORIGINAL_PROMPT", "DESCRIPTION", "SELECT_PRODUCT", "INPUT_COUNTRY", "SELECT_MODEL", "SELECT_COUPON_TYPE", "SELECT_METRIC", "SELECT_COB_DATE", 'SELECT_ATTRIBUTE', "INPUT_ISIN", "INPUT_MONTH_YEAR", "INPUT_PORTFOLIO", "KEYWORD_PRODUCT", "KEYWORD_COUNTRY", "KEYWORD_MODEL", "KEYWORD_COUPON_TYPE", "KEYWORD_METRIC", "KEYWORD_COB_DATE", "KEYWORD_ATTRIBUTE", "KEYWORD_ISIN", "KEYWORD_MONTH_YEAR", "KEYWORD_PORTFOLIO"];

    // Fetch all DataDictionary records
    const allDataDictionary = await cds.run(
      SELECT.from(PromptTemplate).columns("OLD_ID", "CATEGORY", "PRODUCT", "TEMPLATE", "ORIGINAL_PROMPT", "DESCRIPTION", "SELECT_PRODUCT", "INPUT_COUNTRY", "SELECT_MODEL", "SELECT_COUPON_TYPE", "SELECT_METRIC", "SELECT_COB_DATE", 'SELECT_ATTRIBUTE', "INPUT_ISIN", "INPUT_MONTH_YEAR", "INPUT_PORTFOLIO", "KEYWORD_PRODUCT", "KEYWORD_COUNTRY", "KEYWORD_MODEL", "KEYWORD_COUPON_TYPE", "KEYWORD_METRIC", "KEYWORD_COB_DATE", "KEYWORD_ATTRIBUTE", "KEYWORD_ISIN", "KEYWORD_MONTH_YEAR", "KEYWORD_PORTFOLIO")
    );
    console.log("All Prompts Data", allDataDictionary);

    // If no data, add an empty object to preserve headers
    const sheetData = allDataDictionary.length > 0 ? allDataDictionary : [{}];
    console.log("All Sheet Data", sheetData);

    // Convert to Excel with explicit header order
    const xlsx = require("xlsx");
    const worksheet = xlsx.utils.json_to_sheet(sheetData, { header: headers });
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, "PromptTemplate");
    const buffer = xlsx.write(workbook, { type: "buffer", bookType: "xlsx" });
    const fileName = "PromptTemplate.xlsx";

    if (req._.res) {
      req._.res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      req._.res.setHeader(
        "Content-Disposition",
        `attachment; filename=${fileName}`
      );
      req._.res.send(buffer);
      return;
    }
    // Fallback for CAP v5
    return buffer;
  });

});
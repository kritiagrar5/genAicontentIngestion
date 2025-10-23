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
  const { Content, MetaData,DataDictionary, AppSelection, ActionVisibility,FileType,ConfigStore } = this.entities;
  const LOG = cds.log('CI');

  this.after("READ", "Content", (each, req) => {
    const userRoles = { Treasury_ContentChecker: 1, Treasury_ContentMaker: 1};
    const usecase = each.UseCase;
    const checkerRole = `${usecase}_ContentChecker`;
    const makerRole = `${usecase}_ContentMaker`;

  //  each.canApprove = userRoles[checkerRole] === 1;
  //  each.canDelete = userRoles[makerRole] === 1;
  //  each.isChecker = userRoles[checkerRole] === 1;
    each.canApprove = true;
    each.canDelete = true;
    each.isChecker = true;


  });


  this.before('READ', 'AppSelection', (req) => {
    const userRoles = { Workzone_EFDNA_Type_Employee: 1,  };
    const viewerRole = "Workzone_EFDNA_Type_Employee";
  
  if ( userRoles[viewerRole] === 1) {
   
    return; 
  }
    
  });
  



this.before('READ', 'ConfigStore', (req) => {
  const userRoles = [
    'Workzone_EFDNA_Type_Employee',
    'Workzone_EFDNA_GenAI_Treasury_Practitioners',
    'Workzone_EFDNA_GenAI_Earnings_Practitioners'
  ];

 
  const conditions = userRoles
    .map(r => `roles like '%${r}%'`)
    .join(' or ');


  req.query.where(cds.parse.expr(conditions));

});
 
this.after("READ", "FileType", (rows) => {
    if (!Array.isArray(rows)) return rows;

    // Create a blank row
    const blankRow = {
        ID: "",               
        fileType: "Select what your file will be used for"        
    };

    // Insert at the start of the array
    rows.unshift(blankRow);

    return rows;
});

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
      .columns('ID','fileName', 'mediaType', 'content', 'createdBy','fileType','UseCase')
      .where({ ID });
    const use_case = oneFile.UseCase?.toLowerCase();
    const ownFile = oneFile.createdBy === req.user.id;
  

    // if (ownFile) {
    //   req.reject(400, 'You cannot Approve files that are created by you');
    // }
    //check if file content exists
    if (!oneFile?.content) {
      return req.reject(404, 'File content not found.');
    }

    cds.tx (async ()=>{
      await UPDATE(Content, ID).with({
        status: "PROCESSING"
      });
    })
  
  
   // check if file is meta data(mapper), if yes replace all bank metrics in MetaData table
   console.log('file type is: ',oneFile.fileType);
   console.log('file content is: ',oneFile.content);
  console.log("typeof oneFile.content",typeof oneFile.content); // e.g., 'string', 'object', etc.
  console.log("constructor.name", oneFile.content && oneFile.content.constructor && oneFile.content.constructor.name);
  console.log(String(oneFile.content).slice(0, 100)); // Print a snippet
  console.log('file content is Buffer:',Buffer.isBuffer(oneFile.content));
    if (oneFile.fileType === "Standard Account Line Mapping") {
      //parse the xlsx file and update the metadatatable, first row is header
      const xlsx = require("xlsx");
      const buffer = await streamToBuffer(oneFile.content);
      console.log('buffer is Buffer:',Buffer.isBuffer(oneFile.content));
      const workbook = xlsx.read(buffer, { type: "buffer" });
      console.log('workbook is: ',workbook);
      const sheetName = workbook.SheetNames[0];
      console.log('sheetNames is: ',workbook.SheetNames);
      const worksheet = workbook.Sheets[sheetName];
      console.log('worksheet is: ',worksheet);
      const jsonData = xlsx.utils.sheet_to_json(worksheet, {header:1});
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
    }else if(oneFile.fileType === "Data Dictionary"){
      //parse the xlsx file and update the DataDictionary table, first row is header
      const xlsx = require("xlsx");
      const buffer = await streamToBuffer(oneFile.content);
      console.log('buffer is Buffer:',Buffer.isBuffer(oneFile.content));
      const workbook = xlsx.read(buffer, { type: "buffer" });
      console.log('workbook is: ',workbook);
      const sheetName = workbook.SheetNames[0];
      console.log('sheetNames is: ',workbook.SheetNames);
      const worksheet = workbook.Sheets[sheetName];
      console.log('worksheet is: ',worksheet);
      const jsonData = xlsx.utils.sheet_to_json(worksheet, {header:1});
      console.log("Excel Data:", jsonData);
      const dataRows = jsonData.slice(1);
      const headers = jsonData[0];
      
      // remove all rows in DataDictionary
      console.log("Deleting all rows in DataDictionary");
      await DELETE.from(DataDictionary);
      //insert the rows in DataDictionary table
      for (const row of dataRows) {
        const rowData = {};
        headers.forEach((header, index) => {
          rowData[header] = row[index];
        });
        rowData["userID"] = oneFile.createdBy;
        console.log('Inserting row:', rowData);
        try {
          await INSERT.into(DataDictionary).entries(rowData);
        } catch (err) {
          console.error('Error inserting row:', err);
        }
      }
      cds.tx (async ()=>{
        await UPDATE(Content, ID).with({
          status: "COMPLETED"
        });
      });
      return await SELECT.one.from(Content).where({ ID });
    }else{
      //Call API to create Embeddings
      try {
        
            const responseEmbeddings = await axios.post(
              `${destination.url}/api/generate-embeddings?use_case=${use_case}`,
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
      catch (error) 
      {
        console.log("Failed in getting embeddings due to: " +  error.response.data?.description);
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



 this.on("deleteContent", "Content",async (req) => {
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
   if(file.status != "COMPLETED")
{
 await DELETE.from(Content).where({ ID: ID });
  return { ID };
}
else{
   try {
      const response = await executeHttpRequest(
        { destinationName: 'GenAIContentIngestionBackend' },
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json'
          },
          url: '/api/delete',
          params: { use_case : use_case  },
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
  // Fetch all metadata records sorted by bankID
  const allMetaData = await SELECT.from(MetaData).orderBy('bankID');
  const xlsx = require("xlsx");
  const worksheet = xlsx.utils.json_to_sheet(allMetaData);
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
      `attachment; filename="${fileName}"`
    );
    req._.res.send(buffer);
    return;
  }
  // Fallback for CAP v5
  return buffer;
});

});
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
  const { Content, AppSelection, ActionVisibility,FileType,ConfigStore } = this.entities;

  this.after("READ", "Content", (each, req) => {
    const userRoles = { Treasury_ContentChecker: 1, Treasury_ContentMaker: 1};
    const usecase = each.UseCase;
    const checkerRole = `${usecase}_ContentChecker`;
    const makerRole = `${usecase}_ContentMaker`;

    each.canApprove = userRoles[checkerRole] === 1;
    each.canDelete = userRoles[makerRole] === 1;
    each.isChecker = userRoles[checkerRole] === 1;


  });


  this.before('READ', 'AppSelection', (req) => {
    const userRoles = { Workzone_EFDNA_Type_Employee: 1,  };
    const viewerRole = "Workzone_EFDNA_Type_Employee";
  
  if ( userRoles[viewerRole] === 1) {
   
    return; 
  }
    
  });
  

  //-------------------------------------------------------------
  //    Authorization check based on user logged in
  //-------------------------------------------------------------
  this.on("READ", "ActionVisibility", async (req) => {
    return {
      // isChkr: req.user?.roles?.ContentChecker === 1,
      //  isMaker: req.user?.roles?.ContentMaker === 1
      isChkr: false,
      isMaker: false
    };
  });

this.before('READ', 'ConfigStore', (req) => {
  const userRoles = [
    'Workzone_EFDNA_Type_Treasury_Capital',
    'Workzone_EFDNA_Type_Treasury_Liquidity',
    'Workzone_EFDNA_Type_Employee',
    'Workzone_EFDNA_Type_Treasury_Practitioners',
    'Workzone_EFDNA_Type_Earnings_Practitioners'
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
        fileType: "-- Please Select The File Type --"        
    };

    // Insert at the start of the array
    rows.unshift(blankRow);

    return rows;
});
this.after("READ", "ConfigStore", (rows) => {
    if (!Array.isArray(rows)) return rows;
  
    const blankRow = {
        ID: "",              
        fileType: "" ,
        team: "-- Please Select The Team --"          
    };
    rows.unshift(blankRow);
    return rows;
});
this.on('READ', 'Banks', async (req) => {
  const result = await cds.run(SELECT.from('Banks'));
  return result;
});

  this.on("approveContent", async (req) => {
    console.log("📥 Action called with:", req.params[0]);
    const ID = req.params[0].ID;
    try {
  const destination = await getDestination({ destinationName: 'GenAIContentIngestionBackend' });
  console.log('Destination fetched:', destination);
} catch (err) {
  console.error('Failed to get destination:', err.message);
}
    const destination = await getDestination({ destinationName: 'GenAIContentIngestionBackend' });
    const oneFile = await SELECT.one
      .from(Content)
      .columns('ID','fileName', 'mediaType', 'content', 'createdBy','fileType','UseCase')
      .where({ ID });
    const use_case = oneFile.UseCase?.toLowerCase();
    const ownFile = oneFile.createdBy === req.user.id;
  

  /*  if (ownFile) {
      req.reject(400, 'You cannot Approve files that are created by you');
    }*/
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
    if (oneFile.fileType === "Meta Data") {
      //parse the xlsx file and update the metadatatable, first row is header
      const xlsx = require("xlsx");
      const workbook = xlsx.read(buffer, { type: "buffer" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = xlsx.utils.sheet_to_json(worksheet, { defval: "" });
      console.log("Excel Data:", jsonData);

      // remove the rows in MetaData table where bankID === bankID in the excel file
      const bankIDs = jsonData.map((row) => row.bankID);
      await DELETE.from("MetaData").where({ BankID: bankIDs });
      
      //insert the rows in MetaData table
      for (const row of jsonData) {
        await INSERT.into("MetaData").columns(Object.keys(row)).values(Object.values(row));
      }
    }
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
          if (responseEmbeddings.data.success) {
          
            console.log("Embeddings generated successfully")

            return await SELECT.one.from(Content).where({ ID });
            
          }
          else
            throw new Error(`Embedding API failed with status ${responseFileUpload.status}`)
        
      
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
    try {
      const file = await cds.run(
        SELECT.one.from(Content).where({ ID: ID })
      );
      console.log("delete content .... " + file);
      //check the role - if maker -> createdby and logged in user should be Same
      //if checker can delete any file
      const ownFiles = file.createdBy === req.user.id; // only owner can delete its own file
      const fileName = file.fileName;

    //  if (!ownFiles) {
    //    req.reject(400, 'You cannot delete files that are not created by you');
   //   }

      const response = await executeHttpRequest(
        { destinationName: 'GenAIContentIngestionBackend' },
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          url: '/api/delete-files',
          data: { "filename": fileName }
        }
      );
      if (!response.data.success) {
        req.reject(response.data.message);
      }
      await DELETE.from(Content).where({ ID: ID });
      // const table = await SELECT.from(Content);
      req.info(response.data.message);
      return { ID };
    } catch (error) {
      console.log("Error in delete files API: " + error);
    }
  });







});

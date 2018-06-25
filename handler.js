"use strict";

// TODO: getProducers response should contain BPinfo that wasn't able to be fetched
// Include backup API endpoints to EOS network
// Having trouble calling eos.getProducer's in the second lambda.  Function does not show up. eosjs-api works tho!
const BLOCK_PRODUCER_TABLE = process.env.BLOCK_PRODUCER_TABLE;
const EOS_API_ENDPOINT = process.env.EOS_API_ENDPOINT;
const CHAIN_ID = process.env.CHAIN_ID;

const AWS = require("aws-sdk");
const request = require("request-promise-native");
const dynamoDb = new AWS.DynamoDB.DocumentClient();
const EosApi = require("eosjs-api");
const eos = EosApi({ httpEndpoint: EOS_API_ENDPOINT });

const ERROR_PARSING_BP_JSON =
  "Error parsing bp.json - Either error with retrieval or formatting of bp.json";

module.exports.cacheBlockProducerInfo = async (event, context, callback) => {
  try {
    const bpList = await eos.getProducers({ json: true });
    console.log("eos after executing", eos);
    const bpJsonFiles = await _reqBpJsonFiles(bpList.rows);
    let response = {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*"
      },
      data: bpJsonFiles
    };
    callback(null, response);
  } catch (e) {
    console.log(e);
  }
};

module.exports.getAllProducers = async (event, context, callback) => {
  try {
    const bpList = await eos.getProducers({ json: true });
    const cachedBpJsonFiles = await _dynamoGetAll(BLOCK_PRODUCER_TABLE);
    console.log("CachedBpJsonFiles", cachedBpJsonFiles);
    console.log("BPList", bpList);
  } catch (e) {
    console.log(e);
  }
  console.log('BPTABLE', BLOCK_PRODUCER_TABLE)

  dynamoDb
    .scan({ TableName: BLOCK_PRODUCER_TABLE })
    .promise()
    .then(data => {
      let response = {
        isBase64Encoded: false,
        statusCode: 200,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify(data)
      };
      callback(null, response);
    })
    .catch(err => {
      console.log("Error retrieving records from DynamoDB: ", err);
    });
};

async function _reqBpJsonFiles(bpList) {
  const reqList = bpList.map(bp => {
    const reqUrl = _joinHostResource(bp.url, "bp.json");
    const producerAccountName = bp.owner;

    return request(reqUrl)
      .then(data => {
        if (_isJsonString(data)) {
          const parsedData = JSON.parse(data);
          _dynamoPut(BLOCK_PRODUCER_TABLE, producerAccountName, parsedData);
          return parsedData;
        } else {
          const errorObject = {
            error: ERROR_PARSING_BP_JSON,
            bpData: bp,
            resData: data
          };
          return errorObject;
        }
      })
      .catch(err => {
        console.log("Error: ", err);
      });
  });
  return Promise.all(reqList);
}

function _dynamoPut(tableName, bpAccountName, data) {
  return dynamoDb
    .put({
      TableName: tableName,
      Item: {
        producer_account_name: bpAccountName,
        data: JSON.stringify(data)
      }
    })
    .promise()
    .then(data => {
      console.log("Dynamo Put success!", data);
    })
    .catch(err => {
      console.log("Dynampdb.put Error: ", err);
    });
}

async function _dynamoGetAll(tableName) {
  return dynamoDb
    .scan({ TableName: tableName })
    .promise()
    .then(data => {
      let response = {
        isBase64Encoded: false,
        statusCode: 200,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify(data)
      };
    })
    .catch(err => {
      console.log("Error retrieving records from DynamoDB: ", err);
    });
}

function _isJsonString(str) {
  try {
    JSON.parse(str);
  } catch (err) {
    return false;
  }
  return true;
}

function _joinHostResource(host, resource) {
  let endpoint;
  if (host[host.length - 1] === "/") {
    endpoint = host + resource;
  } else {
    endpoint = host + "/" + resource;
  }
  return endpoint;
}

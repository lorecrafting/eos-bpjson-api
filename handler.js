"use strict";

// TODO: Include multiple redundant API endpoints to EOS networks

const BLOCK_PRODUCER_TABLE = process.env.BLOCK_PRODUCER_TABLE;
const EOS_API_ENDPOINT = process.env.EOS_API_ENDPOINT;
const CHAIN_ID = process.env.CHAIN_ID;

const AWS = require("aws-sdk");
const request = require("request-promise-native");
const dynamoDb = new AWS.DynamoDB.DocumentClient();
const EosApi = require("eosjs-api");
const eos = EosApi({ httpEndpoint: EOS_API_ENDPOINT });

module.exports.cacheBpJson = async (event, context, callback) => {
  try {
    const bpList = await eos.getProducers({ json: true });
    const cachedResponse = await _cacheBpJsonFiles(bpList.rows);
    let response = {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*"
      },
      data: { success: `${cachedResponse.length} items cached.` }
    };
    callback(null, response);
  } catch (err) {
    console.log("Error in cacheBpJson handler function: ", err);
  }
};

module.exports.getAllProducers = async (event, context, callback) => {
  try {
    const bpList = await eos.getProducers({ json: true }).then(res => res.rows);
    const cachedBpJsonFiles = await _dynamoGetAll(BLOCK_PRODUCER_TABLE);
    const responseData = bpList.map(bp => {
      cachedBpJsonFiles.forEach(bpJson => {
        if (bp.owner === bpJson.producer_account_name) {
          bp.bpJson = bpJson;
        }
      });
      return bp;
    });
    let response = {
      isBase64Encoded: false,
      statusCode: 200,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify(responseData)
    };

    callback(null, response);
  } catch (err) {
    console.log("Error in getAllProducers handler function: ", err);
  }
};

async function _cacheBpJsonFiles(bpList) {
  const reqList = bpList.map(bp => {
    const reqUrl = _joinHostResource(bp.url, "bp.json");
    const producerAccountName = bp.owner;

    return request(reqUrl)
      .then(resData => {
        return _dynamoPut(BLOCK_PRODUCER_TABLE, producerAccountName, resData);
      })
      .catch(err => {
        console.log("Error in _cacheBpJsonFiles helper function: ", err);
        const note = `Couldn't retrieve bp.json from ${reqUrl}. Please contact this Block Producer and ask them nicely to make their bp.json file available!`;
        console.log('IN _cacheBEPSJONFILE ERROR', BLOCK_PRODUCER_TABLE);
        return _dynamoPut(BLOCK_PRODUCER_TABLE, producerAccountName, note);
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
        data: data,
        timestamp: Date.now()
      }
    })
    .promise()
    .then(data => {
      console.log("Dynamo Put Success!", data);
    })
    .catch(err => {
      console.log("Dynamo Put Error: ", err);
    });
}

async function _dynamoGetAll(tableName) {
  return dynamoDb
    .scan({ TableName: tableName })
    .promise()
    .then(data => {
      return data.Items;
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

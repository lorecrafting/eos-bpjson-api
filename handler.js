"use strict";

// TODO: getProducers response should contain BPinfo that wasn't able to be fetched


const AWS = require("aws-sdk");
const request = require("request-promise-native");
const dynamoDb = new AWS.DynamoDB.DocumentClient();
const eosjs = require("eosjs");

const BLOCK_PRODUCER_TABLE = process.env.BLOCK_PRODUCER_TABLE;
const EOS_API_ENDPOINT = process.env.EOS_API_ENDPOINT;
const CHAIN_ID = process.env.CHAIN_ID;

console.log("BLOCK_PRODUCER_TABLE", BLOCK_PRODUCER_TABLE);

const ERROR_PARSING_BP_JSON =
  "Error parsing bp.json - Either error with retrieval or formatting of bp.json";

module.exports.cacheBlockProducerInfo = async (event, context, callback) => {
  const eos = eosjs({
    httpEndpoint: EOS_API_ENDPOINT,
    chainId: CHAIN_ID
  });

  const getProducersResponse = await eos.getProducers({ json: true });
  console.log("getProducersREsponse", getProducersResponse.rows);
  const reqList = getProducersResponse.rows.map(bp => {
    const totalVotes = Number(bp.total_votes);
    const endpoint = _appendToBaseUrl(bp.url, "bp.json");
    const producerAccountName = bp.owner;

    return request(endpoint)
      .then(data => {
        if (_isJsonString(data)) {
          const parsedData = JSON.parse(data);
          parsedData.total_votes = totalVotes;
          console.log("producerAccountName", producerAccountName);
          console.log('query', BLOCK_PRODUCER_TABLE, producerAccountName, parsedData)
          dynamoDb.put(
            {
              TableName: BLOCK_PRODUCER_TABLE,
              Item: {
                producer_account_name: producerAccountName,
                data: JSON.stringify(parsedData)
              }
            },
            err => {
              if (err) {
                console.log("error with dynamoDb.put", err);
              } else {
                console.log("dynamoDB put success!");
              }
            }
          );

          return parsedData;
        } else {
          const errorObject = {
            error: ERROR_PARSING_BP_JSON,
            data
          };

          return errorObject;
        }
      })
      .catch(err => {
        console.log("Error: ", err);
      });
  });

  const responseList = await Promise.all(reqList);

  let response = {
    statusCode: 200,
    headers: {
      "Access-Control-Allow-Origin": "*"
    },
    data: responseList
  };

  callback(null, response);

};

module.exports.getProducers = (event, context, callback) => {
  dynamoDb.scan({
    TableName: BLOCK_PRODUCER_TABLE
  }, (err, data) => {
    if (err) {
      console.log('Error retrieving records from DynamoDB: ', err)
    } else {
      let response = {
        "isBase64Encoded": false,
        "statusCode": 200,
        "headers": { "Access-Control-Allow-Origin": "*" },
        "body": JSON.stringify(data)
      }
      callback(null, response)
    }
  }) 
}

function _isJsonString(str) {
  try {
    JSON.parse(str);
  } catch (e) {
    return false;
  }
  return true;
}

function _appendToBaseUrl(baseUrl, fragment) {
  let endpoint;
  if (baseUrl[baseUrl.length - 1] === "/") {
    endpoint = baseUrl + fragment;
  } else {
    endpoint = baseUrl + "/" + fragment;
  }
  return endpoint;
}

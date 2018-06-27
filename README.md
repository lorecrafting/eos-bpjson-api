# eos-bpjson-api
A service using the Serverless Framework that caches EOS Block Prodcuer's bp.json files in DynamoDB every 24 hours and exposes an endpoint to retrieve the data.

## Summary
This service contains the following resources:
1. `cacheBPjson` Lambda function that executes once every 24 hours to scrape the BP.json of top 50 Block Producer's by vote count and caches into a dynamoDb table.
2. `getAllProducers` Lambda function that retrieves cached bp.json files with updated vote counts appended to the response.
3. A public endpoint using AWS API Gateway.
4. DynamoDB table that holds the cached bp.json files

## Requirements
- Node 8.10 or above
- [Serverless Framework](https://serverless.com/framework/docs/providers/aws/guide/installation/)
- [Setup AWS Credentials for Serverless Framework](https://serverless.com/framework/docs/providers/aws/guide/credentials/)

## Deployment
1. Install package dependencies with `npm install`.
2. Deploy Serverless service with `sls deploy`.
3. Make sure to manually execute the `cacheBpJson` Lambda function once after deployment for initial load into DynamoDB table.


## Notes
- `sls remove` to remove service.  This command destroys DynamoDB tables also.

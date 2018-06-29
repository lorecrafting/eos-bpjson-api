# eos-bpjson-api
## A service that caches EOS Block Prodcuer's bp.json files in DynamoDB every 24 hours and exposes an endpoint to retrieve the data using the Serverless Framework.

## Summary
This service uses the following AWS resources:
1. Lambda Function: `cacheBpJson` - Caches the bp.json file of top 50 block producer's by vote count.
2. Lambda Function: `getAllProducers` - Retrieves cached bp.json files with updated vote counts appended to response.
3.  `AWS API Gateway` to expose `getAllProducers` as a public endpoint. Requires no credentials.
4. `DynamoDB` table to hold the cached bp.json files.

## Requirements
- Node 8.10 or above
- [Serverless Framework](https://serverless.com/framework/docs/providers/aws/guide/installation/)
- [Setup AWS Credentials for Serverless Framework](https://serverless.com/framework/docs/providers/aws/guide/credentials/)

## Deployment
1. Install package dependencies with `npm install`.
2. Deploy Serverless service with `sls deploy`.
3. Make sure to manually execute the `cacheBpJson` Lambda function once after deployment for initial cache into DynamoDB.
4. After the deployment succeeds, the API Gateway endpoint will be reported in the terminal.


## Notes
- `sls remove` to remove service.  This command destroys DynamoDB tables also.

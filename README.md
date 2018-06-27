# eos-bpjson-api
A service that caches EOS Block Prodcuer's bp.json files in DynamoDB every 24 hours and exposes an endpoint to retrieve the data using the Serverless Framework.

## Summary
This service uses the following AWS resources:
1. `cacheBpJson` Lambda function that caches the bp.json file of top 50 block producer's by vote count.
2. `getAllProducers` Lambda function that retrieves cached bp.json files with updated vote counts appended to response.
3. A public endpoint using `AWS API Gateway`.
4. `DynamoDB` table that holds the cached bp.json files

## Requirements
- Node 8.10 or above
- [Serverless Framework](https://serverless.com/framework/docs/providers/aws/guide/installation/)
- [Setup AWS Credentials for Serverless Framework](https://serverless.com/framework/docs/providers/aws/guide/credentials/)

## Deployment
1. Install package dependencies with `npm install`.
2. Deploy Serverless service with `sls deploy`.
3. Make sure to manually execute the `cacheBpJson` Lambda function once after deployment for initial load into DynamoDB tab
4. After the deployment succeeds, the API Gateway endpoint will be reported in the terminal.


## Notes
- `sls remove` to remove service.  This command destroys DynamoDB tables also.

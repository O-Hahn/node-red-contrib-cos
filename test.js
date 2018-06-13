// {
//    "apikey": "CHdBkuCV3ANCygdWFVgwL5N9gPjJl_a62GKK2HEFzERr",
//    "cos_hmac_keys": {
//      "access_key_id": "39eee12e53534ae5927484a0288e9605",
//      "secret_access_key": "adfc0ac958f67eb697fb4e6f6ac41066834d5dd06878532d"
//    },
//    "endpoints": "https://cos-service.bluemix.net/endpoints",
//    "iam_apikey_description": "Auto generated apikey during resource-key operation for Instance - crn:v1:bluemix:public:cloud-object-storage:global:a/19f662d586832d82b96df0d107630ba9:efbc088b-bd2f-4e39-aa0f-cf865a44ffbf::",
//    "iam_apikey_name": "auto-generated-apikey-39eee12e-5353-4ae5-9274-84a0288e9605",
//    "iam_role_crn": "crn:v1:bluemix:public:iam::::serviceRole:Manager",
//    "iam_serviceid_crn": "crn:v1:bluemix:public:iam-identity::a/19f662d586832d82b96df0d107630ba9::serviceid:ServiceId-d1857c2b-1fbf-4412-af20-18a15427cf68",
//    "resource_instance_id": "crn:v1:bluemix:public:cloud-object-storage:global:a/19f662d586832d82b96df0d107630ba9:efbc088b-bd2f-4e39-aa0f-cf865a44ffbf::"
//  }



var IBMCOS = require('ibm-cos-sdk');
var util = require('util');

var config = {
    endpoint: 's3-api.us-geo.objectstorage.softlayer.net',
    apiKeyId: 'CHdBkuCV3ANCygdWFVgwL5N9gPjJl_a62GKK2HEFzERr',
    ibmAuthEndpoint: 'https://iam.ng.bluemix.net/oidc/token',
    serviceInstanceId: 'crn:v1:bluemix:public:cloud-object-storage:global:a/19f662d586832d82b96df0d107630ba9:efbc088b-bd2f-4e39-aa0f-cf865a44ffbf::',
};

var cos = new IBMCOS.S3(config);

function doCreateBucket(bucket) {
    console.log('Creating bucket with the bucketname: ' + bucket);
    return cos.createBucket({
        Bucket: bucket,
        CreateBucketConfiguration: {
          LocationConstraint: 'us-standard'
        },
    }).promise();
}

function doCreateObject(bucket, key, body) {
    console.log('Creating object with the key: ' + key);
    return cos.putObject({
        Bucket: bucket,
        Key: key,
        Body: body
    }).promise();
}

function doListObjects(bucket) {
    console.log('Listing Objects for Bucket: ' + bucket);
    return cos.listObjects( {
        Bucket: bucket, 
        MaxKeys: 2
       }).promise();
}


function doDeleteObject(bucket, key) {
    console.log('Deleting object with the key: ' + key);
    return cos.deleteObject({
        Bucket: bucket,
        Key: key
    }).promise();
}

function doDeleteBucket(bucket) {
    console.log('Deleting bucket with the bucketname: ' + bucket);
    return cos.deleteBucket({
        Bucket: bucket
    }).promise();
}

function doListBuckets() {
    console.log('List Buckets');
    return cos.listBuckets().promise();
}
 
function doListData(data) {
    console.log (data);
}

var theBucket = 'oh-cos-bucket';
var theObject = 'This is the first Object test';
var theKey = 'MyFirstKey-123';

doListBuckets()
    .then(function (result) {
        console.log(result);
        console.log('');
        
        doCreateObject(theBucket,theKey,theObject)
            .then(doListObjects(theBucket)).then(function () {
                console.log("Finished!")
            })
            .catch(function(err) {
                console.error('An error occurred:');
                console.error(util.inspect(err));                
            })
    })
    .catch(function(err) {
        console.error('An error occurred:');
        console.error(util.inspect(err));
    });
    
// doCreateObject
//    .then(doCreateBucket(theBucket))
//    .then(doListBuckets())
//    .then(doListObjects(theBucket))
//    .then(doCreateObject(theBucket,theKey,theObject))
//    .then(doListObjects(theBucket))
//    .then(doDeleteObject(theBucket,theKey))
//    .then(doListObjects(theBucket))
//    .then(doDeleteBucket)
//    .then(function() {
//        console.log('Finished!');
//    })
//    .catch(function(err) {
//        console.error('An error occurred:');
//        console.error(util.inspect(err));
//    });
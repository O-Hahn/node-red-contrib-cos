# node-red-contrib-cos

A set of <a href="http://nodered.org" target="_new">Node-RED</a> nodes to store, delete, restore and query objects from the
<a href="https://cloud.ibm.com/docs/services/cloud-object-storage/about-cos.html#about-ibm-cloud-object-storage" target="_new">IBM Cloud Object Storage</a> service. 
This is a S3-like object storage service hosted on <a href="https://cloud.ibm.com" target="_new">IBM Cloud</a>. 

## Install
-----

Run the following command in the root directory of your Node-RED install or home directory (usually ~/.node-red) and will also install necessary libraries automatically.
```sh
        npm install @node-red-contrib-ibm-cloud/node-red-contrib-cos
```
This node was tested under Nodejs V16.x LTS and NPM 8.x on Node-RED 2.0.

## Usage
-----

Provides a set of nodes to easily manage objects within buckets of an instance of the IBM Object Storage service. 
The package uses the S3-API to communicate with the IBM Cloud Object Storage service instance - this requires that you specify the credentials from the IBM Cloud Object Storage service instance. 

Any bucket referenced by the nodes in the IBM Cloud Object Storage service instance must already exist. 

When an URL to the object is requested, use HMAC credentials within the config to provide a 15 minute accessible signed URL to the object. 
See <a href="https://cloud.ibm.com/docs/cloud-object-storage?topic=cloud-object-storage-uhc-hmac-credentials-main" target="_new">IBM Cloud Object Storage - Using HMAC credentials</a> for more details.

### COS Object Put

Saves the given object (from a file or from the provided buffer) to the IBM Cloud Object Storage service into the given bucket.

### COS Object Get

Restores the object from the IBM Cloud Object Storage service as a payload or a local file.
Can also be used to generate a [presigned URL](https://cloud.ibm.com/docs/services/cloud-object-storage/hmac?topic=cloud-object-storage-iam-public-access#public-access-object) to enable short-term public access, with or without downloading the object.

### COS Object Del

Deletes the object from the given bucket of the IBM Cloud Object Storage service.

### COS Object Qry

List all of the objects of a given bucket from the IBM Cloud Object Storage service as an array of objects.

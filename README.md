# node-red-contrib-cos

A <a href="http://nodered.org" target="_new">Node-RED</a> node to store, delete, restore and query objects from the
<a href="https://console.bluemix.net/docs/services/cloud-object-storage/about-cos.html#about-ibm-cloud-object-storage" target="_new">IBM Cloud Object Storage</a> service. This service is a S3 like object storage hosted on the <a href="https://console.bluemix.net" target="_new">IBM Cloud</a>. 

## Install
-----

Run the following command in the root directory of your Node-RED install or home directory (usually ~/.node-red) and will also install necessary libraries automatically.
```sh
        npm install node-red-contrib-cos
```
This node was tested under Nodejs V8.x LTS and NPM 5.x on NodeRed 0.18.

## Usage
-----

Provides a few nodes to easily manage objects within buckets of an instantce of the IBM Object Storage Service. This node uses the S3-API to communicate with the instance. 
In order to use this nodes, you must specify the credentials from the IBM Cloud Object Storage service. 

The bucket in the IBM Cloud Object Storage service must exist. When an URL to the object is needed, use HMAC credentials within the config to provide a 15 minute accessable signed URL to the object. See <a href="https://console.bluemix.net/docs/services/cloud-object-storage/hmac/credentials.html#using-hmac-credentials" target="_new">IBM Cloud Object Storage - Using HMAC credentials</a> for more details.

### COS Object Put

Saves the given object (from a file or from the provided buffer) to the IBM Cloud Object Storage service into the given bucket.

### COS Object Get

Restores the object from the IBM Cloud Object Storage service as a payload or a local file.

### COS Object Del

Deletes the object from the given bucket of the IBM Cloud Object Storage Service.

### COS Object Qry

List all of the objects of a given bucket from the IBM Cloud Object Storage Service as an array of objects.

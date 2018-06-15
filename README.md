# node-red-contrib-cos

A <a href="http://nodered.org" target="_new">Node-RED</a> node to store, delete and restore objects from the
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

Provides a few nodes to easily manage objects within buckets of an instantce of the IBM Object Storage Dervice. This node uses the S3-API to communication with the instance. To use this nodes you must specify the credentials out of the IBM Cloud Object Storage service. 

The Bucket in the IBM Cloud Object Storage service must exist. When an URL to the object is needed, use HMAC credentials within the config to provide a 15 minute accessable signed URL to the Object. See <a href="https://console.bluemix.net/docs/services/cloud-object-storage/hmac/credentials.html#using-hmac-credentials" target="_new">IBM Cloud Object Storage - Using HMAC credentials</a> .

### COS Object Put

Saves the given object to the IBM Cloud Object Storage service into the given bucket.

### COS Object Get

Restores the object from the IBM Cloud Object Storage service as a payload or a local file.

### COS Object Delete

Deletes the given object of the given container from the IBM Object Storage Service.

/**
 * Copyright 2018 IBM Corp.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * 
 * Author: Olaf Hahn
 **/


module.exports = function(RED) {
	"use strict";

	// require any external libraries ....
    
	// Cloud Object Storage Get Node - Main Function
	function COSGetNode(n) {
		// Create a RED node
		RED.nodes.createNode(this,n);

		// Store local copies of the node configuration (as defined in the .html)
		this.bucket = n.bucket;
		this.objectname = n.objectname;
		this.mode = n.mode;		
		this.filepath = n.filepath;
		this.filename = n.filename;
		this.geturl = n.geturl;
		this.name = n.name;

		// Retrieve the Cloud Object Storage config node
		this.cosconfig = RED.nodes.getNode(n.cosconfig);

		// copy "this" object in case we need it in context of callbacks of other functions.
		var node = this;

		// Check if the Config to the Service is given 
		if (this.cosconfig) {
			// Do something with:
			node.status({fill:"blue",shape:"ring",text:"cos.status.initializing"});
		} else {
			// No config node configured
			node.warn(RED._("cos.warn.missing-credentials"));
			node.status({fill:"red",shape:"ring",text:"cos.status.missing-credentials"});
			// node.warn('Cloud Object Storage Get: No object storage service configuration found!');
			return;
		}

		// respond to inputs....
		this.on("input", function (msg) {
			// Local Modules
			var fs = require("fs");
			var localdir = __dirname;
			var ibmcos = require("ibm-cos-sdk");

			// Local Vars
			var filename;
			var filepath;
			var objectname; 
			var filefqn;
			var bucket;
			var mode;
			var geturl = node.geturl || msg.geturl;
			var expiry = node.geturlExpiry;
			var config;

			// Help Debug
			console.log("Cloud Object Storage Get (log): Init done");

			// Set the status to green
			node.status({fill:"green",shape:"ring",text:"cos.status.connected"});

			// Check ObjectName 
			if ((msg.objectname) && (msg.objectname.trim() !== "")) {
				objectname = msg.objectname;
			} else {
				objectname = node.objectname;
			}

			// Check Filename
			if ((msg.filename) && (msg.filename.trim() !== "")) {
				filename = msg.filename;
			} else {
				if (node.filename) {
					filename = node.filename;
				} else {
					filename = objectname;					
				}
			}

			// Check filepath
			if ((msg.filepath) && (msg.filepath.trim() !== "")) {
				filepath = msg.filepath;
			} else {
				if (node.filepath) {
					filepath = node.filepath;
				} else {
					filepath = localdir;
				}
			}

			// Check mode
			if ((msg.mode) && (msg.mode.trim() !== "")) {
				mode = msg.mode;
			} else {
				mode = node.mode;
			}

			// Set FQN for this file
			filefqn = filepath + filename;

			// Check bucket
			if ((msg.bucket) && (msg.bucket.trim() !== "")) {
				bucket = msg.bucket;
			} else {
				if (node.bucket) {
					bucket = node.bucket;
				} else {
					bucket = "DefaultBucket";
				}
			}

			// Check hmac 
			var hmac = node.cosconfig.hmac;

			if (hmac) {
				// Create HMAC Credentials 
				var accessKeyId = node.cosconfig.accesskeyid;
				var secretAccessKey = node.cosconfig.accesskey;

				var cred = new ibmcos.Credentials(accessKeyId, secretAccessKey);

				// Enable the Cloud Object Storage Service Call without hmac credentials
				config = {
					endpoint: node.cosconfig.endpoint,
					apiKeyId: node.cosconfig.apiKeyId,
					ibmAuthEndpoint: node.cosconfig.ibmAuthEndpoint,
					serviceInstanceId: node.cosconfig.serviceInstanceId,
					signatureVersion: "v4",
					credentials: cred
				};
				geturl = node.geturl || msg.geturl;
				console.log("Cloud Object Storage Get (log): Config with HMAC: "+hmac + " --- GETURL: "+geturl);

			} else {
				// Enable the Cloud Object Storage Service Call with hmac enabled
				config = {
					endpoint: node.cosconfig.endpoint,
					apiKeyId: node.cosconfig.apiKeyId,
					ibmAuthEndpoint: node.cosconfig.ibmAuthEndpoint,
					serviceInstanceId: node.cosconfig.serviceInstanceId,
				};
				// Url could not be created because of missing signature
				geturl = false;
				console.log("Cloud Object Storage Get (log): Config without HMAC: "+hmac+" ---GETURL: "+geturl);
			}
			
			// Create Access Instance 
			var cos = new ibmcos.S3(config);

			if(mode == "2") {
				// Generate URL to the object if needed 
				var gurl = cos.getSignedUrl("getObject", {
					Bucket: bucket,
					Key: objectname,
					Expiry: expiry
				}, function (err, url) {						
					if (err) {
						// Send error back 
						node.status({fill:"yellow",shape:"ring",text:"cos.status.url-gen-failed"});
						node.error(RED._("cos.error.url-gen-failed", {err:err}));
						return;
					} 
					console.log("Cloud Object Storage Get (log): The URL is", url);
					msg.url = url;
					msg.payload = '';
				});	
			}
			else {
			// Get the Object from the Cloud Object Storage 			
			node.status({fill:"green",shape:"dot",text:"cos.status.downloading"});
			cos.getObject({
				Bucket: bucket,
				Key: objectname
			}, function(err, data) {
				if (err) {
					// Send error back 
					node.status({fill:"red",shape:"ring",text:"cos.status.failed"});
					node.error(RED._("cos.error.failed-to-fetch", {err:err}));
					return;
				} 
				
				// mode defines if it is a filebased save or buffermode into payload
				if (mode == "0") {
					// Download into new File 
					var opt = {
						encoding : null
					};
					
					fs.writeFileSync(filefqn, data, opt);
					msg.payload = filefqn;
					msg.filename = filename;
					msg.filepath = filepath;
					msg.objectname = objectname;
			
					console.log("Cloud Object Storage Get (log): write into file - ", filefqn);
				} else {

					// store the obj directly from msg.payload
					//if (format == "utf8") {
					//    msg.payload = data.Body.toString('utf8');
					//} else {
					msg.objectname = objectname;
					msg.payload = data.Body;
					//}

					console.log("Cloud Object Storage Get (log): object loaded",objectname);
				}
			
				// Generate URL to the object if needed 
				if (geturl) {
					// Get the URL to the object 
					var gurl = cos.getSignedUrl("getObject", {
						Bucket: bucket,
						Key: objectname,
						Expiry: expiry
					}, function (err, url) {
						if (err) {
							// Send error back 
							node.status({fill:"yellow",shape:"ring",text:"cos.status.url-gen-failed"});
							node.error(RED._("cos.error.url-gen-failed", {err:err}));
							return;
						} 

						console.log("Cloud Object Storage Get (log): The URL is", url);
						msg.url = url;	
					});

				}
					
				// Set the node-status
				node.status({fill:"green",shape:"ring",text:"cos.status.ready"});

				// Send the output back 
				node.send(msg);	
			});
			};
		});

		// respond to close....
		this.on("close", function(removed, done) {
			if (removed) {
				// This node has been deleted
			} else {
				// This node is being restarted
			}
			node.status({});
			done();
		});
	}
	RED.nodes.registerType("cos-get",COSGetNode);

	// Cloud Object Storage Put Node - Main Function
	function COSPutNode(n) {
		// Create a RED node
		RED.nodes.createNode(this,n);

		// Store local copies of the node configuration (as defined in the .html)
		this.mode = n.mode;
		this.filepath = n.filepath;
		this.filename = n.filename;
		this.objectname = n.objectname;
		this.contentType = n.contentType;
		this.bucket = n.bucket;
		this.create = n.create; 
		this.geturl = n.geturl;
		this.name = n.name;

		// Retrieve the Object Storage config node
		this.cosconfig = RED.nodes.getNode(n.cosconfig);

		// copy "this" object in case we need it in context of callbacks of other functions.
		var node = this;

		// Check if the Config to the Service is given 
		if (this.cosconfig) {
			// Do something with the config
			node.status({fill:"blue",shape:"ring",text:"cos.status.initializing"});
		} else {
			// No config node configured
			node.warn(RED._("cos.warn.missing-credentials"));
			node.status({fill:"red",shape:"ring",text:"cos.status.missing-credentials"});
			return;
		}
		
		// respond to inputs....
		this.on("input", function (msg) {

			// Local Vars and Modules
			var fs = require("fs");
			var localdir = __dirname;
			var ibmcos = require("ibm-cos-sdk");

			var mode;
			var filename;
			var filepath;
			var fileformat;
			var contentType;
			var objectname; 
			var filefqn;
			var bucket;
			var create;
			var geturl = node.geturl || msg.geturl;
			var expiry = node.geturlExpiry;
			var config;

			// Help Debug
			console.log("Cloud Object Storage Put (log): Init done");

			// Set the status to green
			node.status({fill:"green",shape:"ring",text:"cos.status.connected"});

			// Check mode
			if ((msg.mode) && (msg.mode.trim() !== "")) {
				mode = msg.mode;
			} else {
				if (node.mode) {
					mode = node.mode;
				} else {
					mode = "1";
				}
			}

			// Check Filename
			if ((msg.filename) && (msg.filename.trim() !== "")) {
				filename = msg.filename;
			} else {
				if (node.filename) {
					filename = node.filename;
				} else {
					// Error ?!!?
				}
			}

			// Check filepath
			if ((msg.filepath) && (msg.filepath.trim() !== "")) {
				filepath = msg.filepath;
			} else {
				if (node.filepath) {
					filepath = node.filepath;
				} else {
					filepath = localdir;
				}
			}

			// Set the right mime-format
			if ((msg.contentType) && (msg.contentType.trim() !== "")) {
				contentType = msg.contentType;
			} else {
				if (node.contentType) {
					contentType = node.contentType;
				} 
			}

			// Set FQN for this file
			filefqn = filepath  + filename;

			// Check objectname and define against objectmode
			if ((msg.objectname) && (msg.objectname.trim() !== "")) {
				objectname = msg.objectname;
			} else {
				if (node.objectname) {
					objectname = node.objectname;
				} else {
					objectname = filename;
				}
			}

			// Check bucket
			if ((msg.bucket) && (msg.bucket.trim() !== "")) {
				bucket = msg.bucket;
			} else {
				if (node.bucket) {
					bucket = node.bucket;
				} else {
					// Error
				}
			}

			// Check create - if bucket not exists create ?
			if ((msg.create) && (msg.create.trim() !== "")) {
				create = msg.create;
			} else {
				if (node.create) {
					create = node.create;
				} else {
					create = "0";
				}
			}

			// Check hmac credentials if provided
			var hmac = node.cosconfig.hmac;

			if (hmac) {
				// Create HMAC Credentials 
				var accessKeyId = node.cosconfig.accesskeyid;
				var secretAccessKey = node.cosconfig.accesskey;

				var cred = new ibmcos.Credentials(accessKeyId, secretAccessKey);

				// Enable the Cloud Object Storage Service Call without hmac credentials
				config = {
					endpoint: node.cosconfig.endpoint,
					apiKeyId: node.cosconfig.apiKeyId,
					ibmAuthEndpoint: node.cosconfig.ibmAuthEndpoint,
					serviceInstanceId: node.cosconfig.serviceInstanceId,
					signatureVersion: "v4",
					credentials: cred
				};
				geturl = node.geturl || msg.geturl;
			} else {
				// Enable the Cloud Object Storage Service Call with hmac enabled
				config = {
					endpoint: node.cosconfig.endpoint,
					apiKeyId: node.cosconfig.apiKeyId,
					ibmAuthEndpoint: node.cosconfig.ibmAuthEndpoint,
					serviceInstanceId: node.cosconfig.serviceInstanceId,
				};
				// Url could not be created because of missing signature
				geturl = false;
			}

			// Create Access Instance 
			var cos = new ibmcos.S3(config);

			// Fill body with the content 
			var body;

			// mode is buffermode or filebased - get the data into body
			if (mode == "0") {
				// Check if 
				if (fs.existsSync(filefqn) === false) {
					// File does not exists - send error 
					node.status({fill:"red",shape:"ring",text:"cos.status.failed"});
					node.error(RED._("cos.errors.file-not-found", {err:filefqn}));
					return;
				}

				// Upload from File 
				body = fs.createReadStream(filefqn);

				// get Filesize
				var stats = fs.statSync(filefqn);
				var fileSizeInBytes = stats['size'];
			} else {
				// store the obj directly from msg.payload
				body = new Buffer(msg.payload, "binary");	 
			}

			console.log("URL: " + geturl + "HMAC: " + hmac);

			// Start the upload
			node.status({fill:"green",shape:"dot",text:"cos.status.uploading"});

			// Check if Bucket exists and create (if seleced)
			if (create == "0") {
				// Put the Object to the IBM Cloud Object Storage 			
				cos.putObject({
					Bucket: bucket,
					Body: body,
					Key: objectname
				}, function(err, data) {
					if (err) {
						// Send error back 
						node.status({fill:"red",shape:"ring",text:"cos.status.failed"});
						node.error(RED._("cos.error.upload-failed", {err:err}));
						return;
					}	
					
					// Provide the needed Feedback
					msg.objectname = objectname;
					msg.filefqn = filefqn;

					console.log("Cloud Object Storage Put (log): object stored",objectname);
				
					// Generate URL to the object if needed 
					if (geturl) {
						// Get the URL to the object 
						var gurl = cos.getSignedUrl("getObject", {
							Bucket: bucket,
							Key: objectname,
							Expiry: expiry
						}, function (err, url) {
							if (err) {
								// Send error back 
								node.status({fill:"yellow",shape:"ring",text:"cos.status.url-gen-failed"});
								node.error(RED._("cos.error.url-gen-failed", {err:err}));
								return;
							} 

							console.log("Cloud Object Storage Put (log): The URL is", url);
							msg.url = url;	
						});

					}

					// Set the node-status
					node.status({fill:"green",shape:"ring",text:"cos.status.ready"});

					// Send the output back 
					node.send(msg);
				});
			} else {
				cos.headBucket({
					Bucket: bucket
				}, function (err, data) {
					if (err) {
						// Bucket not exists 
						if (err.statusCode === 404) {
							// Define the right Storage Location on Standard Storage Class
							var location;

							switch(node.cosconfig.location) {
							case "us-geo":
								location = "us-standard";
								break;
							case "eu-geo":
								location = "eu-standard";
								break;
							case "ap-geo":
								location = "ap-standard";
								break;
							case "us-south":
								location = "us-south-standard";
								break;
							case "us-east":
								location = "us-east-standard";
								break;
							case "eu-gb":
								location = "eu-gb-standard";
								break;
							case "eu-de":
								location = "eu-de-standard";
								break;
							case "che01":
								location = "che01-standard";
								break;
							case "tor01":
								location = "tor01-standard";
								break;
							case "mel01":
								location = "mel01-standard";
								break;
							}
							
							// Create the bucket
							cos.createBucket({
								Bucket: bucket,
								CreateBucketConfiguration: {
									LocationConstraint: location
								}								 
							}, function(err, data) {
								if (err) {
									// Send error back 
									console.log(err);
									node.status({fill:"red",shape:"ring",text:"cos.status.failed"});
									node.error(RED._("cos.error.bucket-not-created", {err:message}));
									return;
								}
								// Put the Object to the IBM Cloud Object Storage 			
								cos.putObject({
									Bucket: bucket,
									Body: body,
									Key: objectname
								}, function(err, data) {
									if (err) {
										// Send error back 
										node.status({fill:"red",shape:"ring",text:"cos.status.failed"});
										node.error(RED._("cos.error.upload-failed", {err:err}));
										return;
									}	
									
									// Provide the needed Feedback
									msg.objectname = objectname;
									msg.filefqn = filefqn;

									console.log("Cloud Object Storage Put (log): object stored",objectname);
								
									// Generate URL to the object if needed 
									if (geturl) {
										// Get the URL to the object 
										var gurl = cos.getSignedUrl("getObject", {
											Bucket: bucket,
											Key: objectname
										}, function (err, url) {
											if (err) {
												// Send error back 
												node.status({fill:"yellow",shape:"ring",text:"cos.status.url-gen-failed"});
												node.error(RED._("cos.error.url-gen-failed", {err:err}));
												return;
											} 

											console.log("Cloud Object Storage Put (log): The URL is", url);
											msg.url = url;	
										});

									}

									// Set the node-status
									node.status({fill:"green",shape:"ring",text:"cos.status.ready"});

									// Send the output back 
									node.send(msg);
								});

							});	
						} else {
							// Send error back 
							console.log(err);
							node.status({fill:"red",shape:"ring",text:"cos.status.failed"});
							node.error(RED._("cos.error.bucket-not-created", {err:err}));
							return;
						}
					}

					// Put the Object to the IBM Cloud Object Storage 			
					cos.putObject({
						Bucket: bucket,
						Body: body,
						Key: objectname
					}, function(err, data) {
						if (err) {
							// Send error back 
							node.status({fill:"red",shape:"ring",text:"cos.status.failed"});
							node.error(RED._("cos.error.upload-failed", {err:err}));
							return;
						}	
						
						// Provide the needed Feedback
						msg.objectname = objectname;
						msg.filefqn = filefqn;

						console.log("Cloud Object Storage Put (log): object stored",objectname);
					
						// Generate URL to the object if needed 
						if (geturl) {
							// Get the URL to the object 
							var gurl = cos.getSignedUrl("getObject", {
								Bucket: bucket,
								Key: objectname
							}, function (err, url) {
								if (err) {
									// Send error back 
									node.status({fill:"yellow",shape:"ring",text:"cos.status.url-gen-failed"});
									node.error(RED._("cos.error.url-gen-failed", {err:err}));
									return;
								} 

								console.log("Cloud Object Storage Put (log): The URL is", url);
								msg.url = url;	
							});

						}

						// Set the node-status
						node.status({fill:"green",shape:"ring",text:"cos.status.ready"});

						// Send the output back 
						node.send(msg);
					});
					
				});	
			}			
		});

		// respond to close....
		this.on("close", function(removed, done) {
			if (removed) {
				// This node has been deleted
			} else {
				// This node is being restarted
			}
			node.status({});
			done();
		});
	}
	RED.nodes.registerType("cos-put",COSPutNode);

	// Object Storage Del Node
	function COSDelNode(n) {
		// Create a RED node
		RED.nodes.createNode(this,n);

		// Store local copies of the node configuration (as defined in the .html)
		this.bucket = n.bucket;
		this.objectname = n.objectname;
		this.name = n.name;

		// Retrieve the Object Storage config node
		this.cosconfig = RED.nodes.getNode(n.cosconfig);

		// copy "this" object in case we need it in context of callbacks of other functions.
		var node = this;

		// Check if the Config to the Service is given 
		if (this.cosconfig) {
			// Do something with the config
			node.status({fill:"blue",shape:"ring",text:"cos.status.initializing"});
		} else {
			// No config node configured
			node.warn(RED._("cos.warn.missing-credentials"));
			node.status({fill:"red",shape:"ring",text:"cos.status.missing-credentials"});
			return;
		}

		// respond to inputs....
		this.on("input", function (msg) {
			// Local Vars and Modules
			var ibmcos = require("ibm-cos-sdk");

			var objectname; 
			var bucket;
			var config;

			// Help Debug
			console.log("Cloud Object Storage Del (log): Init done");

			// Set the status to green
			node.status({fill:"green",shape:"ring",text:"cos.status.connected"});

			// Check ObjectName
			if ((msg.objectname) && (msg.objectname.trim() !== "")) {
				objectname = msg.objectname;
			} else {
				objectname = node.objectname;
			}

			// Check bucket
			if ((msg.bucket) && (msg.bucket.trim() !== "")) {
				bucket = msg.bucket;
			} else {
				if (node.bucket) {
					bucket = node.bucket;
				} else {
					bucket = "DefaultBucket";
				}
			}

			// Check hmac 
			var hmac = node.cosconfig.hmac;

			if (hmac) {
				// Create HMAC Credentials 
				var accessKeyId = node.cosconfig.accesskeyid;
				var secretAccessKey = node.cosconfig.accesskey;

				var cred = new ibmcos.Credentials(accessKeyId, secretAccessKey);

				// Enable the Cloud Object Storage Service Call without hmac credentials
				config = {
					endpoint: node.cosconfig.endpoint,
					apiKeyId: node.cosconfig.apiKeyId,
					ibmAuthEndpoint: node.cosconfig.ibmAuthEndpoint,
					serviceInstanceId: node.cosconfig.serviceInstanceId,
					signatureVersion: "v4",
					credentials: cred
				};
			} else {
				// Enable the Cloud Object Storage Service Call with hmac enabled
				config = {
					endpoint: node.cosconfig.endpoint,
					apiKeyId: node.cosconfig.apiKeyId,
					ibmAuthEndpoint: node.cosconfig.ibmAuthEndpoint,
					serviceInstanceId: node.cosconfig.serviceInstanceId,
				};
			}

			// Create Access Instance 
			var cos = new ibmcos.S3(config);

			// Delete the Object from the Cloud Object Storage 			
			node.status({fill:"green",shape:"dot",text:"cos.status.deleting"});

			// Check if object exists in the bucket
			cos.headObject({
				Bucket: bucket, 
				Key: objectname
			}, function(err, data) {
				if (err) {
					// Send error back 
					node.status({fill:"red",shape:"ring",text:"cos.status.failed"});
					node.error(RED._("cos.errors.object-not-found", {err:err}));
					msg.error = err;
					msg.status = "notfound";
					node.send(msg);
					return;
				} else {
					// delete the object out of the bucket
					cos.deleteObject({
						Bucket: bucket,
						Key: objectname
					}, function(err, data) {
						if (err) {
							// Send error back 
							node.status({fill:"red",shape:"ring",text:"cos.status.failed"});
							node.error(RED._("cos.error.delete-failed", {err:err}));
							msg.error = err;
							msg.status = "delete error";
							node.send(msg);
							return;
						} 

						// store feedback values
						msg.objectname = objectname;
						msg.error = "";
						msg.status = "deleted";
			
						console.log("Cloud Object Storage Del (log): object deleted",objectname);
													
						// Set the node-status
						node.status({fill:"green",shape:"ring",text:"cos.status.ready"});

						// Send the output back 
						node.send(msg);
					});
				}
			});
		});

		// respond to close....
		this.on("close", function(removed, done) {
			if (removed) {
				// This node has been deleted
			} else {
				// This node is being restarted
			}
			node.status({});
			done();
		});
	}
	RED.nodes.registerType("cos-del",COSDelNode);


	// Object Storage Qry Node
	function COSQryNode(n) {
		// Create a RED node
		RED.nodes.createNode(this,n);

		// Store local copies of the node configuration (as defined in the .html)
		this.list = n.list;
		this.bucket = n.bucket;
		this.objectname = n.objectname;
		this.maxkeys = n.maxkeys;
		this.name = n.name;

		// Retrieve the Object Storage config node
		this.cosconfig = RED.nodes.getNode(n.cosconfig);

		// copy "this" object in case we need it in context of callbacks of other functions.
		var node = this;

		// Check if the Config to the Service is given 
		if (this.cosconfig) {
			// Do something with the config
			node.status({fill:"blue",shape:"ring",text:"cos.status.initializing"});
		} else {
			// No config node configured
			node.warn(RED._("cos.warn.missing-credentials"));
			node.status({fill:"red",shape:"ring",text:"cos.status.missing-credentials"});
			return;
		}

		// respond to inputs....
		this.on("input", function (msg) {
			// Local Vars and Modules
			var ibmcos = require('ibm-cos-sdk');

			var objectname; 
			var list;
			var bucket;
			var maxkeys = node.maxkeys || msg.maxkeys;
			var config;

			// Help Debug
			console.log("Cloud Object Storage Qry (log): Init done");

			// Set the status to green
			node.status({fill:"green",shape:"ring",text:"cos.status.connected"});

			// Check List
			if ((msg.list) && (msg.list.trim() !== "")) {
				list = msg.list;
			} else {
				list = node.list;
			}

			// Check ObjectName
			if ((msg.objectname) && (msg.objectname.trim() !== "")) {
				objectname = msg.objectname;
			} else {
				objectname = node.objectname;
			}

			// Check bucket
			if ((msg.bucket) && (msg.bucket.trim() !== "")) {
				bucket = msg.bucket;
			} else {
				if (node.bucket) {
					bucket = node.bucket;
				} else {
					bucket = "DefaultBucket";
				}
			}

			// Check hmac 
			var hmac = node.cosconfig.hmac;

			if (hmac) {
				// Create HMAC Credentials 
				var accessKeyId = node.cosconfig.accesskeyid;
				var secretAccessKey = node.cosconfig.accesskey;

				var cred = new ibmcos.Credentials(accessKeyId, secretAccessKey);

				// Enable the Cloud Object Storage Service Call without hmac credentials
				config = {
					endpoint: node.cosconfig.endpoint,
					apiKeyId: node.cosconfig.apiKeyId,
					ibmAuthEndpoint: node.cosconfig.ibmAuthEndpoint,
					serviceInstanceId: node.cosconfig.serviceInstanceId,
					signatureVersion: "v4",
					credentials: cred
				};
			} else {
				// Enable the Cloud Object Storage Service Call with hmac enabled
				config = {
					endpoint: node.cosconfig.endpoint,
					apiKeyId: node.cosconfig.apiKeyId,
					ibmAuthEndpoint: node.cosconfig.ibmAuthEndpoint,
					serviceInstanceId: node.cosconfig.serviceInstanceId,
				};
			}

			// Create Access Instance 
			var cos = new ibmcos.S3(config);

			// Get the Object from the Cloud Object Storage 			
			node.status({fill:"green",shape:"dot",text:"cos.status.query"});

			// List buckets or list objects
			if (list == "1") {
				// List of all objects
				cos.listObjects({
					Bucket: bucket,
					MaxKeys: maxkeys
					//				Key: objectname
				}, function(err, data) {
					if (err) {
						// Send error back 
						node.status({fill:"red",shape:"ring",text:"cos.status.failed"});
						node.error(RED._("cos.errors.object-not-found", {err:err}));
						return;
					} 
	
					// store feedback values
					var num = data.Contents.length;
					var retarr = new Array();
					var x;
	
					for (x in data.Contents) {
						var elem = {
							Key: data.Contents[x].Key,
							Size: data.Contents[x].Size,
							LastModified: data.Contents[x].LastModified,
							ETag: data.Contents[x].ETag,
							StorageClass: data.Contents[x].StorageClass
						};
						// var elem = data.Contents[x];
						retarr.push(elem);
					}
	
					// store feedback values
					msg.found = num;
					msg.payload = retarr;
		
					console.log("Cloud Object Storage Qry (log): objects listed");
																
					// Set the node-status
					node.status({fill:"green",shape:"ring",text:"cos.status.ready"});
	
					// Send the output back 
					node.send(msg);
				});
			} else {
				// List all buckets
				cos.listBuckets({}, function(err, data) {
					if (err) {
						// Send error back 
						node.status({fill:"red",shape:"ring",text:"cos.status.failed"});
						node.error(RED._("cos.errors.buckets-not-found", {err:err}));
						return;
					} 

					// store feedback values
					var num = data.Buckets.length;
					var retarr = new Array();
					var x;

					for (x in data.Buckets) {
						var elem = {
							Name: data.Buckets[x].Name
							// CreationDate: data.Bucktes[x].CreationDate
						};
						retarr.push(elem);
					}

					// store feedback values
					msg.found = num;
					msg.payload = retarr;
		
					console.log("Cloud Object Storage Qry (log): buckets listed");
																
					// Set the node-status
					node.status({fill:"green",shape:"ring",text:"cos.status.ready"});

					// Send the output back 
					node.send(msg);
				});
			}
		});
 
		// respond to close....
		this.on("close", function(removed, done) {
			if (removed) {
				// This node has been deleted
			} else {
				// This node is being restarted
			}
			node.status({});
			done();
		});
	}
	RED.nodes.registerType("cos-qry",COSQryNode);


	// Cloud Object Storage Config Node
	function COSConfigNode(n) {
		// Create a RED node
		RED.nodes.createNode(this,n);
		
		// Store local copies of the node configuration (as defined in the .html)
		this.apiKeyId = n.apiKeyId;
		this.resiliency = n.resiliency;
		this.location = n.location;
		this.ibmAuthEndpoint = n.ibmAuthEndpoint;
		this.endpoint = n.endpoint;		
		this.serviceInstanceId = n.serviceInstanceId;
		this.name = n.name;
		this.hmac = n.hmac;
		this.accesskey = n.accesskey;
		this.accesskeyid = n.accesskeyid;

		// Credentials as password fields --- missing 
	}
	RED.nodes.registerType("cos-config",COSConfigNode);
};

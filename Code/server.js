var express = require("express");
var path = require("path");
var bodyParser = require("body-parser");
var http = require("http");
var socket = require("socket.io");
var mongoose = require("mongoose");
var extend = require("extend");

mongoose.Promise = global.Promise;
mongoose.connect("mongodb://localhost/donors");
var Donor = mongoose.model("Donor",{firstName:String,lastName:String,contactNumber:String,email:String,address:String,bloodGroup:String,ip:String,latitude:Number,longitude:Number,dt:Number,password:String});
var app = express();
app.use(bodyParser.json());

var server = http.Server(app);
var io = socket(server);

app.use(express.static(__dirname));

io.on("connection",function(socket) {
	var publicFields = {address:1,bloodGroup:1,firstName:1,lastName:1,latitude:1,longitude:1,dt:1,_id:1};
	var ip = socket.handshake.headers["x-real-ip"]; // This header has to be configured in nginx;
	console.log("Client connected",ip,socket.id);

	socket.on("test",function(data) {
		console.log("Test message received",data);
		socket.emit("testResult",{resultType:"success",data:data});
	});

	socket.on("bounds",function(b) {
		console.log("Bounds data received",b);
		socket.mapBounds = b;
		Donor.find({
			latitude:{$gt:Math.min(b.lat1,b.lat2),$lt:Math.max(b.lat1,b.lat2)},
			longitude:{$gt:Math.min(b.lng1,b.lng2),$lt:Math.max(b.lng1,b.lng2)}
		},publicFields,function(e,results) {
			if (e) socket.emit("boundsResult",{resultType:"error",message:e});
			else {
				console.log("Found "+results.length+" results in specified area");
				socket.emit("boundsResult",{resultType:"success",data:results,message:"Broadcasting active, bounds updated, data received"});
			}
		});
	});

	socket.on("boundsStop",function(b) {
		delete socket.mapBounds;
		socket.emit("boundsStopResult",{resultType:"success",message:"Broadcasting has stopped"});
	});

	// Get phone or email
	socket.on("getDonorField",function(request) {
		var donor = Donor.findById(request.token,function(e,result) {
			if (e || !result || !result.id) socket.emit("getDonorFieldResult",{resultType:"error",message:e||"Not found"});
			else socket.emit("getDonorFieldResult",{resultType:"success",data:result[request.type]});
		});
	});

	socket.on("signin",function(token,password) {
		console.log("Signin token received",token);
		var donor = Donor.findById(token,function(e,result) {
			if (e || !result || !result.id) socket.emit("signinResult",{resultType:"error",message:"Entered token is invalid."});
			else {
				if (donor.password==password) {
					socket.emit("signinResult",{resultType:"success",message:"You've signed in",token:result.id,data:result});
				}
				else {

				}
			}
		});
	});

	var broadcastUpdate = function(donor,previous) {
		var between = function(t,t1,t2) {
			return t>Math.min(t1,t2) && t<Math.max(t1,t2);
		}
		var cleanup = function(obj) {
			if (!obj || typeof obj!=="object") return;
			var out = {};
			for (var field in publicFields) {
				if (publicFields.hasOwnProperty(field) && obj.hasOwnProperty(field)) {
					out[field] = obj[field];
				}
			}
			return out;
		}

		var donor = cleanup(donor);
		var previous = cleanup(previous);
		console.log("Preparing broadcastUpdate",donor,previous);

		for (var clientId in io.sockets.sockets) {
			var client = io.sockets.sockets[clientId];
			if (client.mapBounds) {
				/*
					Here is the most interesting part of the code.
					We've found the client that sent us his viewport. He's waiting for updates.
					Also we have donor (current data) and previous (the same donor before update).
					If donor is null, then donor destroy appeared (we have to remove marker from the map).
					If previous is null, then new donor was created (we have to put new marker on the map).
					If donor and previous both exist, then there was donor update (we have to move marker to new position and replace data).
					We check if donor or previous belong to the viewport.
					Checking only donor position is not enough: client will not receive update in case when donor has moved from the viewport outside.
					So we send the package if either donor or previous belong to the client's viewport.
				*/
				var b = client.mapBounds;
				var sendPackage = (donor && between(donor.latitude,b.lat1,b.lat2) && between(donor.longitude,b.lng1,b.lng2)) || (previous && between(previous.latitude,b.lat1,b.lat2) && between(previous.longitude,b.lng1,b.lng2));
				console.log("sendPackage to",clientId,sendPackage);
				if (sendPackage) {
					client.emit("donorUpdate",{
						type: (donor&&previous?"update":(donor?"create":(previous?"destroy":"undefined"))),
						donor: donor,
						previous: previous
					});
				}
			}
		}
	}

	socket.on("update",function(data) {
		console.log("Update package received",data);
		try {
			if (!data.firstName || data.firstName.length==0) throw new Error("Please enter first name");
			if (!data.lastName || data.lastName.length==0) throw new Error("Please enter last name");
			if (!data.contactNumber || data.contactNumber.length==0) throw new Error("Please enter contact number");
			if (!/^\+\d\d\s\d\d\d\s\d\d\d\d\s\d\d\d$/.test(data.contactNumber) && !/^00\d\d\s\d\d\d\s\d\d\d\d\s\d\d\d/.test(data.contactNumber)) throw new Error("Contact number has to match the pattern +xx xxx xxxx xxx or 00xx xxx xxxx xxx");
			if (!data.email || data.email.length==0) throw new Error("Please enter email address");
			if (!/^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/.test(data.email)) throw new Error("Entered email is invalid");
			if (!data.address || data.address.length==0) throw new Error("Please enter address");
			if (!data.bloodGroup || data.bloodGroup.length==0) throw new Error("Please specity blood group");
			if (!data.latitude || !data.longitude) throw new Error("Location is not set");
			data.ip = ip;
			data.dt = (new Date).getTime();
			console.log("Update data is valid");
			if (data.token) {
				var donor = Donor.findById(data.token,function(e,result) {
					if (e) socket.emit("updateResult",{resultType:"error",message:e});
					else {
						var previous = extend({},result);
						Object.keys(data).forEach(function(key) {
							result[key] = data[key];
						});
						var current = extend({},result);
						result.save(function(e) {
							if (e) socket.emit("updateResult",{resultType:"error",message:e});
							else {
								socket.emit("updateResult",{resultType:"success",message:"Donor data has been updated",token:result.id,data:result});
								broadcastUpdate(current,previous);
							}
						});
					}
				});
			}
			else {
				var donor = new Donor(data);
				donor.save(function(e,result) {
					if (e) socket.emit("updateResult",{resultType:"error",message:e});
					else {
						socket.emit("updateResult",{resultType:"success",message:"Donor has been added, token: "+result.id,token:result.id,data:result});
						data._id = result.id;
						broadcastUpdate(data,null);
					}
				});
			}
		}
		catch (e) {
			console.log("Update data is invalid",e.message);
			socket.emit("updateResult",{resultType:"error",message:e.message});
		}
	});

	socket.on("destroy",function(token) {
		console.log("Destroy package received",token);
		var donor = Donor.findById(token,function(e,result) {
			if (e) socket.emit("destroyResult",{resultType:"error",message:e.message});
			else {
				var previous = extend({},donor);
				donor.remove(function(e,result) {
					if (e) socket.emit("destroyResult",{resultType:"error",message:e.message});
					else {
						socket.emit("destroyResult",{resultType:"success",message:"Donor has been removed from db"});
						broadcastUpdate(null,previous);
					}
				});
			}
		});
	});

	socket.on("disconnect",function() {
		console.log("Client disconnected");
	});
});

server.listen(3000,function() {
	console.log("Running at port 3000");
});
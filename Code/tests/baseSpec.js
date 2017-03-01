var expect = require("chai").expect;
var assert = require("chai").assert;
var io = require("socket.io-client");
var extend = require("extend");

var socketUrl = "http://127.0.0.1:3000";

var validUser = {
	firstName: "Samuel",
	lastName: "White",
	contactNumber: "+43 464 5750 350",
	email: "SamuelWhite@gmail.com",
	address: "Uľanská cesta 5492/49, 974 01, Uľanka, Banská Bystrica",
	bloodGroup:"B+",
	latitude:"48.785375402553754", 
	longitude:"19.11021675109835"
}

describe("SocketConnect",function() {
	it("should be able to connect, send test package through the socket and receive testResult",function(done) {
		var socket = io.connect(socketUrl);
		socket.on("connect",function(data) {
			socket.on("testResult",function(result) {
				expect(result.resultType).to.equal("success");
				expect(result.data).to.equal("testData");
				socket.disconnect();
				done();
			});
			socket.emit("test","testData");
		});
	});
});

describe("FormValidation",function() {
	var socket;
	beforeEach(function(done) {
		socket = io.connect(socketUrl);
		socket.on("connect",function() {
			done();
		})
	});
	afterEach(function(done) {
		socket.disconnect();
		done();
	});
	it("should validate donor's firstName existance in form",function(done) {
		socket.on("updateResult",function(result) {
			expect(result.resultType).to.equal("error");
			expect(result.message).to.match(/first name/);
			done();
		});
		socket.emit("update",{firstName:""});
	});
	it("should validate donor's lastName existance in form",function(done) {
		socket.on("updateResult",function(result) {
			expect(result.resultType).to.equal("error");
			expect(result.message).to.match(/last name/);
			done();
		});
		socket.emit("update",{firstName:"a",lastName:""});
	});
	it("should validate donor's contactNumber existance in form",function(done) {
		socket.on("updateResult",function(result) {
			expect(result.resultType).to.equal("error");
			expect(result.message).to.match(/Please enter contact number/);
			done();
		});
		socket.emit("update",{firstName:"a",lastName:"b",contactNumber:""});
	});
	it("should validate donor's contactNumber format in form",function(done) {
		socket.on("updateResult",function(result) {
			expect(result.resultType).to.equal("error");
			expect(result.message).to.match(/Contact number has to match/);
			done();
		});
		socket.emit("update",{firstName:"a",lastName:"b",contactNumber:"0011 111 1111 11"});
	});
	it("should validate donor's email existance in form",function(done) {
		socket.on("updateResult",function(result) {
			expect(result.resultType).to.equal("error");
			expect(result.message).to.match(/email/);
			done();
		});
		socket.emit("update",{firstName:"a",lastName:"b",contactNumber:"0011 111 1111 111",email:""});
	});
	it("should validate donor's email format in form",function(done) {
		socket.on("updateResult",function(result) {
			expect(result.resultType).to.equal("error");
			expect(result.message).to.match(/email is invalid/);
			done();
		});
		socket.emit("update",{firstName:"a",lastName:"b",contactNumber:"0011 111 1111 111",email:"asdsdm@asdf"});
	});
	it("should validate donor's address existance in form",function(done) {
		socket.on("updateResult",function(result) {
			expect(result.resultType).to.equal("error");
			expect(result.message).to.match(/address/);
			done();
		});
		socket.emit("update",{firstName:"a",lastName:"b",contactNumber:"0011 111 1111 111",email:"asdsdm@asdf.com",address:""});
	});
	it("should validate donor's blood group existance in form",function(done) {
		socket.on("updateResult",function(result) {
			expect(result.resultType).to.equal("error");
			expect(result.message).to.match(/blood/);
			done();
		});
		socket.emit("update",{firstName:"a",lastName:"b",contactNumber:"0011 111 1111 111",email:"asdsdm@asdf.com",address:"c",bloodGroup:""});
	});
	it("should validate donor's coords existance in form",function(done) {
		socket.on("updateResult",function(result) {
			expect(result.resultType).to.equal("error");
			expect(result.message).to.match(/Location is not set/);
			done();
		});
		socket.emit("update",{firstName:"a",lastName:"b",contactNumber:"0011 111 1111 111",email:"asdsdm@asdf.com",address:"c",bloodGroup:"O-",latitude:"1",longitude:""});
	});
	it("should create new user with valid data and then destroy him",function(done) {
		socket.on("destroyResult",function(result) {
			expect(result.resultType).to.equal("success");
			expect(result.message).to.match(/Donor has been removed/);
			done();
		});
		socket.on("updateResult",function(result) {
			expect(result.resultType).to.equal("success");
			expect(result.message).to.match(/Donor has been added/);
			expect(result.token).to.exists;
			socket.emit("destroy",result.token);
		});
		socket.emit("update",validUser);
	});
});

describe("ListeningRectangles",function() {
	var socket1,socket2,token;
	beforeEach(function(done) {
		socket1 = io.connect(socketUrl);
		socket1.on("connect",function() {
			socket2 = io.connect(socketUrl);
			socket2.on("connect",function() {
				socket2.once("updateResult",function(result) {
					token = result.token;
					done();
				});
				socket2.emit("update",validUser);
			});
		});
	});
	afterEach(function(done) {
		socket2.on("destroyResult",function(result) {
			socket1.disconnect();
			socket2.disconnect();
			done();
		});
		socket2.emit("destroy",token);
	});
	it("should create socket's listening rectangle and catch donor's update inside it, triggered by another socket",function(done) {
		socket1.once("donorUpdate",function(result) {
			expect(result.type).to.equal("update");
			expect(result.donor._id).to.equal(token);
			expect(result.previous._id).to.equal(token);
			expect(result.donor.firstName).to.equal("John");
			expect(result.previous.firstName).to.equal(validUser.firstName);
			done();
		});
		socket1.once("boundsResult",function(result) {
			expect(result.resultType).to.equal("success");
			expect(result.data).to.have.length.above(0);
			socket2.emit("update",extend({},validUser,{token:token,firstName:"John"}));
		});
		socket1.emit("bounds",{lat1:40,lat2:50,lng1:10,lng2:20});
	});
	it("should create socket's listening rectangle and miss donor's update if it's outside",function(done) {
		socket1.once("donorUpdate",function(result) {
			assert(false,"Outside token cought an update");
		});
		socket1.once("boundsResult",function(result) {
			expect(result.resultType).to.equal("success");
			socket2.emit("update",extend({},validUser,{token:token,firstName:"John"}));
			setTimeout(function() {
				done();
			},500);
		});
		socket1.emit("bounds",{lat1:50,lat2:60,lng1:10,lng2:20});

	});
});

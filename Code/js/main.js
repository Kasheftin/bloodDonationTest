/*global require requirejs*/

requirejs.config({
	paths: {
		"react": "../vendor/react/react",
		"reactDOM": "../vendor/react/react-dom",
		"babel": "../vendor/babel/browser",
		"text": "../vendor/requirejs-text/text",
		"jsx": "../vendor/requirejs-react-jsx/jsx",
		"underscore": "../vendor/underscore/underscore",
		"jquery": "../vendor/jquery/dist/jquery",
		"eventEmitter": "../vendor/eventEmitter/EventEmitter",
		"esri": "../vendor/arcgis-js-api",
		"dojo": "../vendor/dojo",
		"dijit": "../vendor/dijit",
		"dojox": "../vendor/dojox",
		"moment": "../vendor/moment",
		"socket.io": "../node_modules/socket.io-client/socket.io"
	},
	packages: [
		"esri",
		"dojo",
		"dijit",
		"dojox",
		{name: "moment", location: "../vendor/moment", main: "moment"}
	]
});

require(["jsx!app"],function(App) {
	var app = new App();
	app.init(document.getElementById("root"));
});

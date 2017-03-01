/*global define console*/

define(["react","reactDOM","eventEmitter","socket.io","jsx!loader","jsx!map","dojo/domReady!"],function(React,ReactDOM,EventEmitter,io,Loader,Map) {

	var App = function() {
		var self = this;
		this.eventEmitter = new EventEmitter();
		this.io = io();
		this.eventEmitter.on("ajax",function(options) {
			self.io.once(options.event+"Result",options.callback);
			self.io.emit(options.event,options.data);
		});
	};

	App.prototype.init = function(domNode) {
		ReactDOM.render(
			<div className="reactWrapper">
				<Map eventEmitter={this.eventEmitter} io={this.io} />
				<Loader eventEmitter={this.eventEmitter} />
			</div>
		,domNode);
	};

	return App;

});
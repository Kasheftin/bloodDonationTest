define(["react","jquery","underscore","config","jsx!signin"],function(React,$,_,config,Signin) {

	var Loader = React.createClass({
		getInitialState: function() {
			return {
				mode: "check",
				showSignin: false
			};
		},
		emit: function() {
			this.props.eventEmitter && this.props.eventEmitter.emit.apply(this.props.eventEmitter,arguments);
		},
		componentDidMount: function() {
			var self = this;
			this.props.eventEmitter.on("reset",function() {
				self.setState({mode:"check",showSignin:false});
			});
			this.props.eventEmitter.on("signin",function(token,data) {
				self.setState({mode:"donor"});
				self.props.eventEmitter.emit("initDonorMode",token,data);
			});
		},
		switchSignin: function() {
			this.setState({showSignin:!this.state.showSignin});
		},
		setPatientMode: function() {
			this.setState({mode:"patient"});
			this.props.eventEmitter.emit("initPatientMode");
		},
		setDonorMode: function() {
			this.setState({mode:"donor"});
			this.props.eventEmitter.emit("initDonorMode");
		},
		render: function() {
			return (
				<div className="modal-wrapper" style={{display:this.state.mode=="check"?"flex":"none"}}>
					<div className="start-modal">
						<h1>Blood donation test</h1>
						<p>Use system as:</p>
						<div className="btn-group">
							<button className="btn btn-default" onClick={this.setPatientMode}>Patient</button>
							<button className="btn btn-default" onClick={this.setDonorMode}>New donor</button>
							<button className="btn btn-default" onClick={this.switchSignin}>Registered donor</button>
						</div>
						<Signin eventEmitter={this.props.eventEmitter} show={this.state.showSignin} />
					</div>
				</div>
			);
		}
	});

	return Loader;
});
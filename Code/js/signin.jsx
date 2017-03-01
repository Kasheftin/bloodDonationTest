define(["react","jquery","underscore","config"],function(React,$,_,config) {

	var Signin = React.createClass({
		getInitialState: function() {
			return {
				token: "",
				errorMessage: null
			};
		},
		updateToken: function(e) {
			this.setState({token:e.target.value});
		},
		signin: function() {
			var self = this;
			this.setState({errorMessage:null});
			this.props.eventEmitter.emit("ajax",{
				event: "signin",
				data: this.state.token,
				callback: function(result) {
					console.log("signin result",result);
					if (result.resultType=="error") {
						self.setState({errorMessage:result.message});
					}
					else {
						self.props.eventEmitter.emit("signin",result.token,result.data);
					}
				}
			});
		},
		componentWillReceiveProps: function(nextProps) {
			this.setState({errorMessage:null});
		},
		render: function() {
			if (!this.props.show) return null;
			var alert = "";
			if (this.state.errorMessage && this.state.errorMessage.length>0) {
				alert = (
					<div className="alert alert-danger">{this.state.errorMessage}</div>
				);
			}
			return (
				<div className="top-offset">
					{alert}
					<div className="form-inline">
						<input className="form-control" value={this.state.token} onChange={this.updateToken} placeholder="Donor's token..." />
						{" "}
						<button className="btn btn-default" onClick={this.signin}>Sign in</button>
					</div>
				</div>
			);
		}
	});

	return Signin;
});
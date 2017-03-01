define(["react","jquery","underscore","config"],function(React,$,_,config) {

	var DonorForm = React.createClass({
		bloodGroups: "O− O+ A− A+ B− B+ AB− AB+".split(/ /),
		getInitialState: function() {
			return {
				resultType: "",
				message: "",
				token: this.props.token||"",
				data: {
					firstName: this.props.data.firstName||"",
					lastName: this.props.data.lastName||"",
					contactNumber: this.props.data.contactNumber||"",
					email: this.props.data.email||"",
					address: this.props.data.address||"",
					bloodGroup: this.props.data.bloodGroup||"",
					latitude: this.props.data.latitude||"",
					longitude: this.props.data.longitude||""
				}
			}
		},
		extendState: function(data) {
			this.setState($.extend(true,{},this.state,data));
		},
		componentDidMount: function() {
			var self = this;
			this.props.eventEmitter.on("substituteAddress",function(address) {
				// Don't auto update address when editing existing donor. 
				if (!self.state.token) {
					self.extendState({data:{address:address}});
				}
			});
			this.props.eventEmitter.on("substituteLocation",function(location) {
				self.extendState({data:{latitude:location.latitude,longitude:location.longitude}});
			});
		},
		componentWillUnmount: function() {
			this.props.eventEmitter.removeEvent("substituteAddress");
			this.props.eventEmitter.removeEvent("substituteLocation");
		},
		submit: function(e) {
			var self = this;
			e.preventDefault();
			this.extendState({resultType:"",message:""});
			this.props.eventEmitter.emit("ajax",{
				event: "update",
				data: $.extend(true,{},self.state.data,{token:this.state.token}),
				callback: function(result) {
					if (result.resultType=="success") {
						self.props.eventEmitter.emit("updateMapDonor",result.token,result.data);
					}
					self.extendState(result);
				}
			});
		},
		removeDonor: function() {
			var self = this;
			this.extendState({resultType:"",message:""});
			this.props.eventEmitter.emit("ajax",{
				event: "destroy",
				data: this.state.token,
				callback: function(result) {
					if (result.resultType=="success") {
						self.props.eventEmitter.emit("closePopup");
						self.props.eventEmitter.emit("updateMapDonor","");
						result.token = "";
					}
					self.extendState(result);
				}
			});
		},
		substituteRandomData: function() {
			var data = {
				firstName: _.sample("Noah Liam Mason Jacob William Ethan James Alexander Michael Benjamin Elijah Daniel Aiden Logan Matthew Lucas Jackson David Oliver Jayden Joseph Gabriel Samuel Carter Anthony John Dylan Luke Henry Andrew".split(/ /)),
				lastName: _.sample("Smith Johnson Williams Brown Jones Miller Davis Garcia Rodriguez Wilson Martinez Anderson Taylor Thomas Hernandez Moore Martin Jackson Thompson White Lopez Lee Gonzalez Harris Clark Lewis Robinson Walker Perez Hall".split(/ /)),
				contactNumber: "+xx xxx xxxx xxx".split("").map(function(c){return c=="x"?_.random(9):c;}).join(""),
				bloodGroup: _.sample(this.bloodGroups)
			};
			data.email = data.firstName+data.lastName+"@gmail.com";
			this.extendState({data:data});
		},
		change: function(e) {
			var ar = {};
			ar[e.target.name] = e.target.value;
			this.extendState({data:ar});
		},
		render: function() {
			var self = this;
			if (this.state.message && (this.state.resultType=="error"||this.state.resultType=="success")) {
				var alert = (
					<div className={this.state.resultType=="error"?"alert alert-danger":"alert alert-success"}>{this.state.message}</div>
				);
			}
			return (
				<div className="donor-form">
					{alert}
					<form ref="form" className="form-horizontal" onSubmit={this.submit}>
						<div className="form-group">
							<label htmlFor="token" className="col-sm-3 control-label">Token</label>
							<div className="col-sm-9">
								<input className="form-control" type="text" value={this.state.token} name="token" id="token" readOnly />
							</div>
						</div>
						<div className="form-group">
							<label htmlFor="latitude" className="col-sm-3 control-label">Coords</label>
							<div className="col-sm-4">
								<input className="form-control" type="text" value={this.state.data.latitude} id="latitude" readOnly />
							</div>
							<div className="col-sm-5">
								<input className="form-control" type="text" value={this.state.data.longitude} id="longitude" readOnly />
							</div>
						</div>
						<div className="form-group">
							<label htmlFor="firstName" className="col-sm-3 control-label">Name</label>
							<div className="col-sm-4">
								<input className="form-control" type="text" value={this.state.data.firstName} onChange={this.change} name="firstName" id="firstName" placeholder="First name" />
							</div>
							<div className="col-sm-5">
								<input className="form-control" type="text" value={this.state.data.lastName} onChange={this.change} name="lastName" id="lastName" placeholder="Last name" />
							</div>
						</div>
						<div className="form-group">
							<label htmlFor="contactNumber" className="col-sm-3 control-label">Phone</label>
							<div className="col-sm-9">
								<input className="form-control" type="text" value={this.state.data.contactNumber} onChange={this.change} name="contactNumber" id="contactNumber" placeholder="+xx xxx xxxx xxx" />
							</div>
						</div>
						<div className="form-group">
							<label htmlFor="email" className="col-sm-3 control-label">Email</label>
							<div className="col-sm-9">
								<input className="form-control" type="email" value={this.state.data.email} onChange={this.change} name="email" id="email" />
							</div>
						</div>
						<div className="form-group">
							<label htmlFor="address" className="col-sm-3 control-label">Address</label>
							<div className="col-sm-9">
								<input className="form-control" type="text" value={this.state.data.address} onChange={this.change} name="address" id="address" />
							</div>
						</div>
						<div className="form-group">
							<label htmlFor="bloodGroup" className="col-sm-3 control-label">Blood group</label>
							<div className="col-sm-9" ref="bloodGroup">
								{this.bloodGroups.map(function(group) {
									return (
										<div className="radio-inline" key={group}><label><input type="radio" name="bloodGroup" value={group} checked={self.state.data.bloodGroup==group} onChange={self.change} /> {group}</label></div>
									);
								})}
							</div>
						</div>
						<div className="form-group">
							<div className="col-sm-9 col-sm-offset-3">
								<button className="btn btn-default" type="submit">{this.state.token?"Save changes":"Add new donor"}</button>
								{" "}
								<button className="btn btn-default" type="button" onClick={this.substituteRandomData} style={{display:this.state.token?"none":"inline-block"}}>Set random data</button>
								<button className="btn btn-default" type="button" onClick={this.removeDonor} style={{display:this.state.token?"inline-block":"none"}}>Remove donor</button>
							</div>
						</div>
					</form>
				</div>
			);
		}
	});

	return DonorForm;

});
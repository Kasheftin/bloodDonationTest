define(["react","jquery","underscore","config"],function(React,$,_,config) {

	var DonorView = React.createClass({
		getInitialState: function() {
			return {
				contactNumber: false,
				email: false
			}
		},
		requestField: function(type) {
			var self = this;
			this.props.eventEmitter.emit("ajax",{
				event: "getDonorField",
				data: {
					token: this.props.data._id,
					type: type
				},
				callback: function(result) {
					console.log("requestField",type,result);
					if (result.resultType=="success") {
						var ar = {};
						ar[type] = result.data;
						self.setState(ar);
					}
				}
			});
		},
		render: function() {
			return (
				<div>
					<table className="table table-bordered">
						<tbody>
							<tr><td><strong>Address</strong></td><td>{this.props.data.address}</td></tr>
							<tr><td><strong>Blood group</strong></td><td>{this.props.data.bloodGroup}</td></tr>
							<tr><td><strong>Contact number</strong></td><td>
								{this.state.contactNumber ? this.state.contactNumber : <a href="javascript:void(0)" onClick={this.requestField.bind(this,"contactNumber")}>Click to reveal</a>}
							</td></tr>
							<tr><td><strong>Email</strong></td><td>
								{this.state.email ? this.state.email : <a href="javascript:void(0)" onClick={this.requestField.bind(this,"email")}>Click to reveal</a>}
							</td></tr>
						</tbody>
					</table>
				</div>
			);
		}
	});

	return DonorView;
});
define([
	"react","reactDOM","jquery","underscore","config",
	"jsx!donorForm","jsx!donorView",
	"esri/Map","esri/Graphic","esri/views/MapView","esri/widgets/Locate","esri/widgets/Home","esri/widgets/Search","esri/widgets/BasemapToggle","esri/tasks/Locator",
	"esri/geometry/Point","esri/symbols/SimpleMarkerSymbol",
	"esri/core/watchUtils","esri/geometry/support/webMercatorUtils",
	"esri/PopupTemplate","esri/layers/GraphicsLayer"
],function(
	React,ReactDOM,$,_,config,
	DonorForm,DonorView,
	EsriMap,EsriGraphic,EsriMapView,EsriLocateButton,EsriHomeButton,EsriSearchWidget,EsriBasemapToggleWidget,EsriLocatorTask,
	EsriPoint,EsriSimpleMarkerSymbol,EsriWatchUtils,EsriWebMercatorUtils,
	EsriPopupTemplate,EsriGraphicsLayers
) {

	var MapWrapper = React.createClass({
		emit: function() {
			this.props.eventEmitter && this.props.eventEmitter.emit.apply(this.props.eventEmitter,arguments);
		},
		componentDidMount: function() {
			var self = this;
			this.map = new EsriMap(config.map);
			this.view = new EsriMapView({container:this.refs.map,map:this.map,...config.map});

			this.searchWidget = new EsriSearchWidget({view:this.view});
			this.searchWidget.startup();
			this.view.ui.add(this.searchWidget,{position:"top-left",index:0});

			this.locateButton = new EsriLocateButton({view:this.view});
			this.locateButton.startup();
			this.view.ui.add(this.locateButton,"top-left");

			this.homeButton = new EsriHomeButton({view:this.view});
			this.homeButton.startup();
			this.homeButton.on("click",this.emit.bind(this,"reset"));
			this.view.ui.add(this.homeButton,"top-left");

			this.toggleWidget = new EsriBasemapToggleWidget({view:this.view,nextBasemap:"hybrid"});
			this.toggleWidget.startup();
			this.view.ui.add(this.toggleWidget,"bottom-right");

			this.locatorTask = new EsriLocatorTask(config.locator);

			this.props.eventEmitter.on("reset",function() {
				self._donorClickHandler && self._donorClickHandler.remove();
				self.props.eventEmitter.emit("updateMapDonor","");
				self.props.eventEmitter.removeEvent("updateMapDonor");
				self.props.eventEmitter.emit("closePopup");
				self._patientBoundsWatch && self._patientBoundsWatch.remove();
				if (self._donors) {
					self._donors.forEach(function(donor) {
						donor.marker && self.view.graphics.remove(donor.marker);
					});
					delete self._donors;
				}
				self.props.eventEmitter.emit("ajax",{
					event: "boundsStop",
					callback: function(result) {
						console.log("Broadcast stop result",result);
					}
				});
				self.props.io.removeAllListeners("donorUpdate");
			});

			this.props.eventEmitter.on("closePopup",function() {
				self.view.popup.close();
			});

			this.props.eventEmitter.on("initPatientMode",function() {
				self._donors = [];

				var updateDonorMarker = function(donor) {
					if (!donor.marker) {
						console.log("draw marker");
						donor.marker = new EsriGraphic({
							attributes: {
								id: donor._id
							},
							geometry: new EsriPoint({latitude:donor.latitude,longitude:donor.longitude}),
							symbol: new EsriSimpleMarkerSymbol(config.marker),
						});
						self.view.graphics.add(donor.marker);
					}
				}

				var updateDonors = function(data) {
					console.log("updateDonors",data);
					var keep = {}, index = {};
					self._donors.forEach(function(donor,i){index[donor._id]=i});
					data.forEach(function(donor) {
						keep[donor._id] = true;
						if (index.hasOwnProperty(donor._id)) {
							var existantDonor = self._donors[index[donor._id]];
							if (existantDonor.dt!=donor.dt) {
								if (existantDonor.marker) self.view.graphics.remove(existantDonor.marker);
								self._donors.splice(index[donor._id],1,donor);
							}
						}
						else self._donors.push(donor);
					});
					for (var i=0;i<self._donors.length;i++) {
						var donor = self._donors[i];
						if (keep[donor._id]) updateDonorMarker(donor);
						else {
							if (donor.marker) self.view.graphics.remove(donor.marker);
							self._donors.splice(i,1);
							i--;
						}
					}
				}

				var lastOpenedModalDonorId = null;
				var openPopup = function(donor) {
					lastOpenedModalDonorId = donor._id;
					self.view.popup.open({
						title: donor.firstName+" "+donor.lastName,
						location: EsriWebMercatorUtils.geographicToWebMercator(new EsriPoint({latitude:donor.latitude,longitude:donor.longitude})),
						content: {}
					});
					ReactDOM.render(<DonorView eventEmitter={self.props.eventEmitter} data={donor} />,self.view.popup._bodyContentNode);
				}

				self._donorClickHandler = self.view.on("click",function(e) {
					self.view.hitTest(e.screenPoint).then(function(response) {
						if (!response.results[0].graphic) return;
						var graphic = response.results[0].graphic;
						if (!graphic.attributes.id) return;
						var donor = _.find(self._donors,{_id:graphic.attributes.id});
						if (!donor) return;
						console.log("donor found",donor,graphic);
						openPopup(donor);
					});
				})

				self._patientBoundsWatch = EsriWatchUtils.whenTrue(self.view,"stationary",function() {
					console.log("stationary");
					if (self.view.extent) {
						var bottomLeft = EsriWebMercatorUtils.xyToLngLat(self.view.extent.xmin,self.view.extent.ymin);
						var topRight = EsriWebMercatorUtils.xyToLngLat(self.view.extent.xmax,self.view.extent.ymax);
						self.props.eventEmitter.emit("ajax",{
							event: "bounds",
							data: {
								lng1: bottomLeft[0],
								lat1: bottomLeft[1],
								lng2: topRight[0],
								lat2: topRight[1]
							},
							callback: function(result) {
								if (result.resultType=="success") {
									updateDonors(result.data);
								}
							}
						});
					}
				});

				self.props.io.on("donorUpdate",function(result) {
					console.log("Broadcast message received",result);
					var donorFound = false;
					for (var i=0;i<self._donors.length;i++) {
						var rw = self._donors[i];
						if (result.donor && rw._id==result.donor._id && rw.dt!=result.donor.dt) {
							if (rw.marker) self.view.graphics.remove(rw.marker);
							self._donors.splice(i,1,result.donor);
							updateDonorMarker(result.donor);
							donorFound = true;
							if (self.view.popup.visible && lastOpenedModalDonorId==result.donor._id) openPopup(result.donor);
							console.log("Broadcast donor update");
							break;
						}
						else if(result.previous && rw._id==result.previous._id) {
							if (rw.marker) self.view.graphics.remove(rw.marker);
							self._donors.splice(i,1);
							if (self.view.popup.visible && lastOpenedModalDonorId==result.previous._id) self.props.eventEmitter.emit("closePopup");
							console.log("Broadcast donor destroy");
							break;
						}
					}
					if (!donorFound && result.donor) {
						self._donors.push(result.donor);
						updateDonorMarker(result.donor);
						console.log("Broadcast donor create");
					}
				});
			});

			this.props.eventEmitter.on("initDonorMode",function(token,data) {
				self._donorData = data||{};
				self._donorToken = token||"";
				var openPopup = function(mapPoint) {
					self.view.popup.open({
						title: self._donorToken?"Save changes":"Add new donor",
						location: mapPoint
					});
					ReactDOM.render(<DonorForm eventEmitter={self.props.eventEmitter} data={self._donorData} token={self._donorToken} />,self.view.popup._bodyContentNode,function() {
						self.props.eventEmitter.emit("substituteLocation",mapPoint);
						self.props.eventEmitter.emit("updateMapDonor",self._donorToken,{latitude:mapPoint.latitude,longitude:mapPoint.longitude});
						self.locatorTask.locationToAddress(mapPoint).then(function(response) {
							self.props.eventEmitter.emit("substituteAddress",response.address.Match_addr);
						});
					});
				}
				self._donorClickHandler = self.view.on("click",function(e) {
					openPopup(e.mapPoint);
				});
				self.props.eventEmitter.on("updateMapDonor",function(newToken,newData) {
					console.log("updateMapDonor with data",newToken,newData);
					self._donorToken = newToken;
					$.extend(true,self._donorData,newData);
					self.view.popup.title = self._donorToken?"Save changes":"Add new donor";
					if (self._donorMarker) {
						self.view.graphics.remove(self._donorMarker);
						delete self._donorMarker;
					}
					if (self._donorToken) {
						self._donorMarker = new EsriGraphic({
							geometry: new EsriPoint({latitude:self._donorData.latitude,longitude:self._donorData.longitude}),
							symbol: new EsriSimpleMarkerSymbol(config.marker),
							content: {}
						});
						self.view.graphics.add(self._donorMarker);
					}
				});
				if (token) {
					openPopup(EsriWebMercatorUtils.geographicToWebMercator(new EsriPoint({latitude:self._donorData.latitude,longitude:self._donorData.longitude})));
				}
			});
		},
		render: function() {
			return (
				<div ref="map" className="map" />
			);
		}
	});

	return MapWrapper;
});
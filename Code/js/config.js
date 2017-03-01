/*global define*/

define({
	map: {
		center: [19.140,48.740],
		zoom: 13,
		basemap: "topo"
	},
	locator: {
		url: "https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer"
	},
	marker: {
		color: [200,40,40],
		outline: {
			color: [255,255,255],
			width: 2
		}
	}
});
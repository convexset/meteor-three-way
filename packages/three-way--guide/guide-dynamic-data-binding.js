/* global ThreeWay: true */

ThreeWay.prepare(Template.ThreeWayGuide_DynamicDataBinding, {
	viewModelToViewOnly: {
		'colR': Math.floor(64 + 192 * Math.random()),
		'colG': Math.floor(64 + 192 * Math.random()),
		'colB': Math.floor(64 + 192 * Math.random()),
	},
	preProcessors: {
		toRGB: function(r, g, b) {
			return '#' + [r, g, b].map(x => Number(x).toString(16)).join('');
		},
	},
});
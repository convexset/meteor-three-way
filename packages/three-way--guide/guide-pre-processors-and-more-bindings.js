/* global ThreeWay: true */

var optionMap = {
	o1: 'Option 1',
	o2: 'Option 2',
	o3: 'Option 3',
};

ThreeWay.prepare(Template.ThreeWayGuide_PreProcessorsMoreBindings, {
	viewModelToViewOnly: {
		'option': 'o1',
		'selection': [],
		'sliderR': Math.floor(64 + 192 * Math.random()),
		'sliderG': Math.floor(64 + 192 * Math.random()),
		'sliderB': Math.floor(64 + 192 * Math.random()),
		'tags': 'tag5',
	},
	preProcessors: {
		isAtLeastLengthTwo: arr => arr.length >= 2,
		toRGB: function(r, g, b) {
			return '#' + [r, g, b].map(x => Number(x).toString(16)).join('');
		},
		toInvRGB: function(r, g, b) {
			return '#' + [r, g, b].map(x => (255 - Number(x)).toString(16)).join('');
		},
		toOption: k => optionMap[k],
		toOptionMap: arr => arr.map(k => optionMap[k]),
		join: arr => arr.join(', '),
		showAllArgs: function(v, elem, vmData, paramInfo) {
			console.info('---');
			console.info('[showAllArgs] v:', v);
			console.info('[showAllArgs] elem:', elem);
			console.info('[showAllArgs] vmData:', vmData);
			console.info('[showAllArgs] paramInfo:', paramInfo);
			return v;
		},
		populateList: function(arr, elem) {
			$(elem).empty();
			arr.forEach(v => $(elem).append('<li>' + v + '</li>'));
		}
	},
});
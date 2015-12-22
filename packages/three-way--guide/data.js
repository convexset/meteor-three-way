/* global GuideData: true */
/* global DataRecord: true */

// See data-with-collection-tools.js for information about the prototype
// alternatively... look in
// Commit: f2fcdd0d53fc800deeb88e6343095eb183c720c2 [f2fcdd0]

GuideData = {
	collection: DataRecord.collection,
	fields: [
		'name',
		'emailPrefs',
		'age',
		'notes',
		'tags',
		'someArray.*',
		'points.*.*',
		'rotationAngle',
	],
	allTags: ['tag1', 'tag2', 'tag3', 'tag4', 'tag5'],
	ageRanges: {
		'0_12': '0 to 12',
		'13_20': '13 to 20',
		'21_35': '21 to 35',
		'36_65': '36 to 65',
		'66_plus': '66 and over',
	},
	emailPrefsAll: {
		'opt1': 'Spam Away',
		'opt2': 'Only My Orders',
		'opt3': 'Just Don\'t',
	},
};

GuideData.helperBundle = {
	ready: () => Template.instance().subscriptionsReady(),
	data: () => GuideData.collection.find(),
	allTags: () => GuideData.allTags,
	ageRanges: () => GuideData.ageRanges,
	emailPrefsAll: () => GuideData.emailPrefsAll,
	emailPrefsToCSL: function(arr) {
		return arr.map(x => GuideData.emailPrefsAll[x]).join(", ");
	},
};
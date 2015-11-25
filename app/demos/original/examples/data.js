/* global Demo: true */
/* global DataThing: true */

DataThing = function DataThing(doc) {
	_.extend(this, doc);
};

DataThing.prototype = {
	someMethod: () => "lalalala"
};

var myDemo = {
	collection: new Mongo.Collection('data', {
		transform: (doc) => new DataThing(doc)
	}),
	fields: [
		'name',
		'emailPrefs',
		'personal.particulars.age',
		'notes',
		'tags',
		'personal.someArr.*',
		'personal.otherArr.*.*'
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
		'opt3': 'XYZ',
	},
};

Demo = Demo || {};
Demo = _.extend(Demo,myDemo);

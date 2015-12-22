/* global CollectionTools: true */
/* global DataRecord: true */

var dataRecordSettings = {
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

DataRecord = CollectionTools.build({
	collectionName: 'data-guide',
	constructorName: 'DataRecord',
	schema: {
		_id: {
			type: String,
			regEx: /^[0-9a-zA-Z]{17,24}$/,
			optional: true,
		},
		name: {
			type: String,
			defaultValue: "New Person",
		},
		emailPrefs: {
			type: [String],
			defaultValue: [],
		},
		age: {
			type: String,
			allowedValues: Object.keys(dataRecordSettings.ageRanges),
			defaultValue: Object.keys(dataRecordSettings.ageRanges)[0],
		},
		notes: {
			type: String,
			defaultValue: "Enter Notes Here.",
		},
		tags: {
			type: [String],
			defaultValue: [],
		},
		"someArray": {
			type: [String],
			defaultValue: () => _.range(3).map(() => (Math.round(10 * Math.random()).toString())),
		},
		"points": {
			type: Array,
			defaultValue: () => _.range(Math.round(2 + 4 * Math.random())).map(() => ({
				x: Math.round(20 * Math.random() - 10) / 10,
				y: Math.round(20 * Math.random() - 10) / 10
			})),
		},
		"points.$": {
			type: Object,
		},
		"points.$.x": {
			type: Number,
			defaultValue: () => (Math.round(20 * Math.random() - 10) / 10),
		},
		"points.$.y": {
			type: Number,
			defaultValue: () => (Math.round(20 * Math.random() - 10) / 10),
		},
		rotationAngle: {
			type: Number,
			defaultValue: 0,
		},
	},
	prototypeExtension: {
		cleanPoints: function() {
			var clean = v => ((typeof v === "undefined") || (Number.isNaN(Number(v)))) ? (Math.random() * 2 - 1) : Number(v);
			return this.points.map(function(p) {
				return {
					x: clean(p.x),
					y: clean(p.y)
				};
			});
		},
		rotatedPoints: function(angle) {
			var _angle = Number(angle) * Math.PI;
			if (Number.isNaN(_angle)) {
				_angle = 0;
			}
			var points = this.cleanPoints();
			return points.map(function(pt) {
				var xx = pt.x * Math.cos(_angle) + pt.y * Math.sin(_angle);
				var yy = -pt.x * Math.sin(_angle) + pt.y * Math.cos(_angle);
				return {
					x: xx,
					y: yy
				};
			});
		},
		bounds: function() {
			return this.rotatedBounds(0);
		},
		boundsRotatedPoints: function(angle) {
			var points = this.rotatedPoints(angle);
			return _.object(['x', 'y']
				.map(c => [c, points.map(x => x[c])])
				.map(z => [z[0],
					[Math.min.apply({}, z[1].concat(-1)), Math.max.apply({}, z[1].concat(1))]
				])
			);
		},
	},
	constructorExtension: (constructorFunction, collection) => _.extend(dataRecordSettings, {
		helperBundle: {
			ready: () => Template.instance().subscriptionsReady(),
			data: () => collection.find(),
			allTags: () => dataRecordSettings.allTags,
			ageRanges: () => dataRecordSettings.ageRanges,
			emailPrefsAll: () => dataRecordSettings.emailPrefsAll,
			emailPrefsToCSL: function(arr) {
				return arr.map(x => dataRecordSettings.emailPrefsAll[x]).join(", ");
			},
		}
	}),
	globalAuthFunction: () => true,
	methodPrefix: 'guide--collection-tools/',
});

DataRecord.makePublication('guide-data-collection-tools');
// DataRecord.makeMethod_add();
// DataRecord.makeMethod_add({
// 	field: 'points',
// 	entryName: 'add-points',
// });
// DataRecord.makeMethod_remove();
// DataRecord.makeMethod_remove({
// 	field: 'points',
// 	entryName: 'remove-points',
// });
DataRecord.makeGenericMethod_updaters();
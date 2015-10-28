/* global Fake: true */
/* global DataCollection: true */
/* global ThreeWay: true */

var allDebugMessages = ['bindings', 'data-mirror', 'observer', 'tracker', 'new-id', 'db', 'methods', 'value', 'checked', 'html', 'visible-and-disabled', 'vm-only', 're-bind'];
var selectedDebugMessages = [
	// 'bindings',
	// 'data-mirror',
	// 'observer',
	// 'tracker',
	// 'new-id',
	// 'db',
	'methods',
	// 'value',
	// 'checked',
	// 'html',
	// 'visible-and-disabled',
	// 'vm-only',
	// 're-bind',
];

//selectedDebugMessages = allDebugMessages.map(x => x);  // copy
if (Meteor.isClient) {
	ThreeWay.setDebugModeOn();
	ThreeWay.debugModeSelectNone();
	selectedDebugMessages.forEach(x => ThreeWay.debugModeSelect(x));
}


function setUpDebugMessages(template) {
	var selectedDebugMessages = template._3w_Get_NR('debugMessages');
	console.info('Selected Debug Messages:', selectedDebugMessages);
	ThreeWay.setDebugModeOn();
	ThreeWay.debugModeSelectNone();
	selectedDebugMessages.forEach(x => ThreeWay.debugModeSelect(x));
}

var fields = [
	'name',
	'emailPrefs',
	'personal.particulars.age',
	'notes',
	'tags',
	'personal.someArr.*',
	'personal.otherArr.*.*'
];


DataCollection = new Mongo.Collection('data');
var allTags = ['tag1', 'tag2', 'tag3', 'tag4', 'tag5'];
var ageRangeValues = ['0_12', '13_20', '21_35', '36_65', '66_plus'];
var ageRanges = _.object(ageRangeValues, ['0 to 12', '13 to 20', '21 to 35', '36 to 65', '66 and over']);
var emailPrefsValues = ['opt1', 'opt2', 'opt3'];
var emailPrefsAll = _.object(emailPrefsValues, ['Spam Away', 'Only My Orders', 'XYZ']);

if (Meteor.isServer) {
	// The publication
	Meteor.publish('demo-pub', function() {
		return DataCollection.find({});
	});

	fields.forEach(function(field) {
		if (field.indexOf('*') === -1) {
			var methods = {};
			var fn = function(id, value) {
				var updater = {};
				updater[field] = value;
				console.log('update-' + field, id, value);
				DataCollection.update(id, {
					$set: updater
				});
			};
			methods['update-' + field] = fn;
			Meteor.methods(methods);
		}
	});
	Meteor.methods({
		'update-personal.someArr.*': function(id, value, k) {
			var updater = {};
			updater['personal.someArr.' + k] = value;
			console.log('update-personal.someArr.' + k, id, value);
			DataCollection.update(id, {
				$set: updater
			});
		},
		'update-personal.otherArr.*.*': function(id, value, k, fld) {
			var updater = {};
			updater['personal.otherArr.' + k + '.' + fld] = value;
			console.log('update-personal.otherArr.' + k + '.' + fld, id, value);
			DataCollection.update(id, {
				$set: updater
			});
		}
	});

	// Init. data
	DataCollection.remove({});
	_.range(3).forEach(function() {
		var user = Fake.user();
		var tags = [];
		allTags.forEach(function(tag) {
			if (Math.random() < 0.4) {
				tags.push(tag);
			}
		});
		var _emPrefs = [];
		emailPrefsValues.forEach(function(x) {
			if (Math.random() < 0.6) {
				_emPrefs.push(x);
			}
		});
		DataCollection.insert({
			name: user.fullname,
			emailPrefs: _emPrefs,
			personal: {
				particulars: {
					age: Fake.fromArray(ageRangeValues),
				},
				someArr: ["" + Math.floor(Math.random() * 10), '!!!', "" + Math.floor(Math.random() * 10)],
				otherArr: [{
					a: "" + Math.floor(10 + Math.random() * 10),
					b: "" + Math.floor(20 + Math.random() * 10)
				}, {
					a: "" + Math.floor(30 + Math.random() * 10),
					b: "" + Math.floor(40 + Math.random() * 10)
				}, ]
			},
			notes: Fake.sentence(5),
			tags: tags,
		});
	});
}


if (Meteor.isClient) {
	Meteor.subscribe('demo-pub');

	ThreeWay.prepare(Template.DemoThreeWay, {
		// The relevant fields/field selectors in the database
		fields: fields,
		// The relevant Mongo.Collection
		collection: DataCollection,
		// Meteor methods for updating the database
		updatersForServer: _.object(fields, fields.map(x => "update-" + x)),
		// Transformations from the server to the view model
		// In this example, "tags" are stored in the view model as a comma
		// separated list in a string, while it is stored in the server as
		// an array
		dataTransformToServer: {
			// tags: x => x.split(',').map(y => y.trim())
			tags: function(x, vmData) {
				var outcome = x.split(',').map(y => y.trim());
				console.log('dataTransformToServer[\'tags\']:', x, vmData, '-->', outcome);
				return outcome;
			}
		},
		// Transformations from the view model to the server
		// (Transform and call the updater Meteor method)
		// In this example, "tags" are stored in the view model as a comma
		// separated list in a string, while it is stored in the server as
		// an array
		dataTransformFromServer: {
			// tags: arr => arr.join && arr.join(',') || ""
			tags: function(arr, doc) {
				var outcome = arr.join && arr.join(',') || "";
				console.log('dataTransformFromServer[\'tags\']:', arr, doc, '-->', outcome);
				return outcome;
			}
		},
		// Pre-processors for data pre-render (view model to view)
		preProcessors: {
			// this takes a string of comma separated tags, splits, trims then
			// joins them to make the result "more presentable"
			tagsTextDisplay: x => (!x) ? "" : x.split(',').map(x => x.trim()).join(', '),
			// this maps a key to the corresponding long form description
			mapToAgeDisplay: x => ageRanges[x],
			// this maps an array of keys to the corresponding long form
			// descriptions and then joins them
			mapToEmailPrefs: function(prefs, elem, vmData) {
				var outcome = prefs.map(x => emailPrefsAll[x]).join(", ");
				console.log('preProcessors[\'mapToEmailPrefs\']\nValue: ', prefs, "\nDOM Element:", elem, "\nView Model Data:", vmData, '-->', outcome);
				return outcome;
			},
			boldIfMoreThanOne: function(prefString) {
				return (prefString.split(',').length <= 1) ? prefString : '<strong>' + prefString + '</strong>';
			},
			sayHideToHide: function(v) {
				return v.trim().toUpperCase() !== "HIDE";
			},
			not: x => !x,
			// This is something special to make the Semantic UI Dropdown work
			// More helpers will be written soon...
			updateSemanticUIDropdown: ThreeWay.helpers.updateSemanticUIDropdown
		},
		// (Global) initial values for fields that feature only in the local view model
		// Will be overridden by value tags in the rendered template of the form:
		// <data field="additional" initial-value="view model to view only"></data>
		viewModelToViewOnly: {
			"hide": "VM to V Only",
			"debugMessages": selectedDebugMessages
		},
		debounceInterval: 300,
		throttleInterval: 500,
		throttledUpdaters: ['emailPrefs', 'personal.particulars.age'],
		rebindPollInterval: 300,
		methodInterval: 50
	});

	Template.DemoThreeWay.onCreated(function() {
		this.id = new ReactiveVar(null);
		this.num = new ReactiveVar(1);
	});

	Template.DemoThreeWay.onRendered(function() {
		(function createDropdown() {
			if (!selectCreated) {
				var selector = $('.ui.dropdown');
				if (selector.length > 0) {
					selectCreated = true;
					selector.dropdown({
						allowAdditions: true
					});
				} else {
					setTimeout(createDropdown, 10);
				}
			}
		})();

		setUpDebugMessages(Template.instance());
	});

	Template.DemoThreeWay.helpers({
		data: () => DataCollection.find(),
		allTags: () => allTags.map(x => x),
		ageRanges: () => _.extend({}, ageRanges),
		emailPrefsAll: () => _.extend({}, emailPrefsAll),
		emailPrefsToCSL: function(arr) {
			return arr.map(x => emailPrefsAll[x]).join(", ");
		},
		selectId: () => Template.instance().id.get(),
		entry: () => DataCollection.findOne(Template.instance().id.get(), {
			reactive: true
		}),
		num: () => Template.instance().num.get(),
		allDebugMessages: () => allDebugMessages
	});

	var selectCreated = false;
	Template.DemoThreeWay.events({
		"click button.select-data": function(event, template) {
			template.num.set(1);
			var id = event.target.getAttribute('id').split('-')[1];
			console.info('Setting ID to: ' + id);
			console.info('Note the personal.someArr array is initially only bound to one input element (item 0).');
			setTimeout(function() {
				template._3w_SetId(id);
				setTimeout(function() {
					template.num.set(3);
					console.info('Now (~3 sec later) personal.someArr array bound to three input elements (item 0, 1 & 2).');
				}, 3000);
			}, 50);
		},
		"click button.talk": function() {
			/* global alert: true */
			alert('Not disabled!');
		},
		"change input[name=debug-messages]": function(event, template) {
			setTimeout(() => setUpDebugMessages(template), 50);
		}
	});
}
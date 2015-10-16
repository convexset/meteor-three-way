/* global Fake: true */
/* global DataCollection: true */
/* global ThreeWay: true */

DataCollection = new Mongo.Collection('data');
var allTags = ['tag1', 'tag2', 'tag3', 'tag4', 'tag5'];
var ageRangeValues = ['0_12', '13_20', '21_35', '36_65', '66_plus'];
var ageRanges = _.object(ageRangeValues, ['0 to 12', '13 to 20', '21 to 35', '36 to 65', '66 and over']);
var emailPrefsValues = ['opt1', 'opt2', 'opt3'];
var emailPrefsAll = _.object(emailPrefsValues, ['Spam Away', 'Only My Orders', 'XYZ']);

if (Meteor.isServer) {
	// The publication
	Meteor.publish('demo-pub', function() {
		return DataCollection.find();
	});
	DataCollection.allow({}); // Allow nothing

	['name', 'emailPrefs', 'age', 'tags'].forEach(function(field) {
		var methods = {};
		var fn = function(id, value) {
			var updater = {};
			updater[field] = value;
			DataCollection.update(id, {
				$set: updater
			});
		};
		methods['update-' + field] = fn;
		Meteor.methods(methods);
	});

	// Init. data
	DataCollection.remove({});
	_.range(7).forEach(function() {
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
			'name': user.fullname,
			'emailPrefs': _emPrefs,
			'age': Fake.fromArray(ageRangeValues),
			'tags': tags,
		});
	});
}

if (Meteor.isClient) {
	ThreeWay.setDebugModeOn();
	ThreeWay.debugModeSelectAll();
	//ThreeWay.debugModeSelect('html');
	//ThreeWay.debugModeSelect('checked');

	Meteor.subscribe('demo-pub');

	var fields = ['name', 'emailPrefs', 'age', 'tags'];
	ThreeWay.prepare(Template.DemoThreeWay, {
		// The relevant top-level fields in the database
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
			tags: x => x.split(',').map(y => y.trim())
		},
		// Transformations from the view model to the server
		// (Transform and call the updater Meteor method)
		// In this example, "tags" are stored in the view model as a comma
		// separated list in a string, while it is stored in the server as
		// an array
		dataTransformFromServer: {
			tags: arr => arr.join && arr.join(',') || ""
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
			mapToEmailPrefs: function(prefs) {
				return prefs.map(x => emailPrefsAll[x]).join(", ");
			},
			// This is something special to make the Semantic UI Dropdown work
			// More helpers will be written soon...
			updateSemanticUIDropdown: ThreeWay.helpers.updateSemanticUIDropdown
		},
		// (Global) initial values for fields that feature only in the local view model
		// Will be overridden by value tags in the rendered template of the form:
		// <data field="additional" initial-value="view model to view only"></data>
		viewModelToViewOnly: {
			"additional": "VM to V Only"
		},

	});

	Template.DemoThreeWay.onCreated(function() {
		this.id = new ReactiveVar(null);
	});

	Template.DemoThreeWay.onRendered(function() {
		function createDropdown() {
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
		}
		createDropdown();
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
	});

	var selectCreated = false;
	Template.DemoThreeWay.events({
		"click button": function(event, template) {
			template._3w_SetId(event.target.getAttribute('id').split('-')[1]);
		}
	});
}
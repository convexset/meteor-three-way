/* global Fake: true */
/* global Demo: true */

if (Meteor.isServer) {
	// num generated items
	var num_items = 10;

	// The publication
	Meteor.publish('demo-pub', function() {
		return Demo.collection.find({});
	});

	Demo.fields.forEach(function(field) {
		if (field.indexOf('*') === -1) {
			var methods = {};
			var fn = function(id, value) {
				var updater = {};
				updater[field] = value;
				var myFieldName = 'update-' + field;
				while (myFieldName.length < 40) {
					myFieldName += " ";
				}
				console.log(myFieldName, id, '\t', value);
				return Demo.collection.update(id, {
					$set: updater
				});
			};
			methods['update-' + field] = fn;
			Meteor.methods(methods);
		}
	});
	Meteor.methods({
		'update-personal.someArr.1': function(id, value) {
			// different, more specific updater
			// for no reason at all
			// but validation for this is done "via update-personal.someArr.*"
			var updater = {};
			updater['personal.someArr.1'] = value;
			var myFieldName = '[specific] update-personal.someArr.1';
			while (myFieldName.length < 40) {
				myFieldName += " ";
			}
			console.log(myFieldName, id, '\t', value);
			return Demo.collection.update(id, {
				$set: updater
			});
		},
		'update-personal.someArr.*': function(id, value, k) {
			var updater = {};
			updater['personal.someArr.' + k] = value;
			var myFieldName = 'update-personal.someArr.' + k;
			while (myFieldName.length < 40) {
				myFieldName += " ";
			}
			console.log(myFieldName, id, '\t', value);
			return Demo.collection.update(id, {
				$set: updater
			});
		},
		'update-personal.otherArr.*.*': function(id, value, k, fld) {
			var updater = {};
			updater['personal.otherArr.' + k + '.' + fld] = value;
			var myFieldName = 'update-personal.otherArr.' + k + '.' + fld;
			while (myFieldName.length < 40) {
				myFieldName += " ";
			}
			console.log(myFieldName, id, '\t', value);
			return Demo.collection.update(id, {
				$set: updater
			});
		}
	});

	// Init. data
	var lastRegenTimestamp = 0;
	var emailPrefsValues = _.map(Demo.emailPrefsAll, (v,k) => k);
	var ageRangeValues = _.map(Demo.ageRanges, (v,k) => k);
	Meteor.methods({
		'regenerate-data': function() {
			var currTimestamp = (new Date()).getTime();
			if (currTimestamp - lastRegenTimestamp < 2 * 60 * 1000) {
				throw new Meteor.Error("Last data regeneration too recent.");
			} else {
				lastRegenTimestamp = currTimestamp;
				Demo.collection.remove({});
				_.range(num_items).forEach(function(idx) {
					var user = Fake.user();
					var tags = [];
					Demo.allTags.forEach(function(tag) {
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
					var doc = {
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
					};
					if (idx === num_items - 1) {
						doc._id = "__last_id__";
					}
					return Demo.collection.insert(doc);
				});
			}
		}
	});

	Meteor.call('regenerate-data');
}
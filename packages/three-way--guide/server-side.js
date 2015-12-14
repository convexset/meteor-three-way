/* global Fake: true */
/* global GuideData: true */

// num generated items
var num_items = 10;

// The publication
Meteor.publish('guide-pub', function() {
	return GuideData.collection.find({});
});

GuideData.fields.forEach(function(field) {
	if (field.indexOf('*') === -1) {
		var methods = {};
		var fn = function(id, value) {
			var updater = {};
			updater[field] = value;
			return GuideData.collection.update(id, {
				$set: updater
			});
		};
		methods['three-way-guide/update/' + field] = fn;
		Meteor.methods(methods);
	}
});
Meteor.methods({
	'three-way-guide/update/someArray.*': function(id, value, k) {
		var updater = {};
		updater['someArray.' + k] = value;
		return GuideData.collection.update(id, {
			$set: updater
		});
	},
	'three-way-guide/update/points.*.*': function(id, value, k, fld) {
		var updater = {};
		updater['points.' + k + '.' + fld] = value;
		return GuideData.collection.update(id, {
			$set: updater
		});
	},
	'three-way-guide/update/someArray': function() {
		throw new Meteor.Error('unexpected-operation', 'points should not be updated directly');
	},
	'three-way-guide/update/points': function() {
		throw new Meteor.Error('unexpected-operation', 'points should not be updated directly');
	},
});

// Init. data
var lastRegenTimestamp = 0;
var emailPrefsValues = _.map(GuideData.emailPrefsAll, (v, k) => k);
var ageRangeValues = _.map(GuideData.ageRanges, (v, k) => k);
Meteor.methods({
	'regenerate-data--guide': function() {
		var currTimestamp = (new Date()).getTime();
		if (currTimestamp - lastRegenTimestamp < 2 * 60 * 1000) {
			throw new Meteor.Error("Last data regeneration too recent.");
		} else {
			lastRegenTimestamp = currTimestamp;
			GuideData.collection.remove({});
			_.range(num_items).forEach(function(idx) {
				var user = Fake.user();
				var tags = [];
				GuideData.allTags.forEach(function(tag) {
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
					age: Fake.fromArray(ageRangeValues),
					someArray: [
						Math.floor(Math.random() * 10), ((Math.random() < 0.33) ? '!!!' : Math.floor(Math.random() * 10)),
						Math.floor(Math.random() * 10)
					],
					points: _.range(2 + Math.round(Math.random() * 5)).map(function() {
						return {
							x: Math.round(Math.random() * 20 - 10) / 10,
							y: Math.round(Math.random() * 20 - 10) / 10,
						};
					}),
					rotationAngle: Math.round(Math.random() * 200 - 100) / 100,
					notes: Fake.sentence(5),
					tags: tags,
				};
				if (idx === num_items - 1) {
					doc._id = "__last_id__";
				}
				return GuideData.collection.insert(doc);
			});
		}
	}
});

Meteor.call('regenerate-data--guide');
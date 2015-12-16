/* global ThreeWay: true */
/* global GuideData: true */
/* global getRandomId: true */

ThreeWay.prepare(Template.ThreeWayGuide_CustomizingVMUpdates, {
	collection: GuideData.collection,
	updatersForServer: {
		'name': 'three-way-guide/update/name',
		'notes': 'three-way-guide/update/notes',
	},
});

ThreeWay.prepare(Template.ThreeWayGuide_CustomizingDBUpdates, {
	collection: GuideData.collection,
	updatersForServer: {
		'name': 'three-way-guide/update/name',
		'emailPrefs': 'three-way-guide/update/emailPrefs',
		'age': 'three-way-guide/update/age',
		'notes': 'three-way-guide/update/notes',
	},
	// Database Update Parameters
	// "Debounce Interval" for Meteor calls; See: http://underscorejs.org/#debounce
	debounceInterval: 5000, // default: 500
	// "Throttle Interval" for Meteor calls; See: http://underscorejs.org/#throttle ; fields used for below...
	throttleInterval: 5000, // default: 500
	// Fields for which updaters are throttle'd instead of debounce'd
	throttledUpdaters: ['age', 'notes'],
});

[
	Template.ThreeWayGuide_CustomizingVMUpdates,
	Template.ThreeWayGuide_CustomizingDBUpdates
].forEach(function(tmpl) {
	tmpl.onCreated(function() {
		var instance = this;
		instance.subscribe('guide-pub');
	});

	tmpl.onRendered(function() {
		var instance = this;

		instance.autorun(function() {
			var id = getRandomId(instance);
			if (!!id) {
				instance._3w_.setId(id);
			}
		});
	});

	tmpl.helpers(GuideData.helperBundle);

	tmpl.events({
		'click button.select-document': function(event, instance) {
			var id = event.target.getAttribute('data-id');
			if (!!id) {
				instance._3w_.setId(id);

				setTimeout(function() {
					$('html, body').animate({
						scrollTop: Math.max(0, instance.$("table.edit-table").offset().top - 120)
					}, 500);
				}, 50);
			}
		}
	});
});
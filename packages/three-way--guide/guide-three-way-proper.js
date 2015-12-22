/* global ThreeWay: true */
/* global GuideData: true */
/* global getRandomId: true */


ThreeWay.prepare(Template.ThreeWayGuide_ThreeWay_Simple, {
	collection: GuideData.collection,
	updatersForServer: {
		'name': 'three-way-guide/update/name',
		'emailPrefs': 'three-way-guide/update/emailPrefs',
		'age': 'three-way-guide/update/age',
		'notes': 'three-way-guide/update/notes',
	},
});

ThreeWay.prepare(Template.ThreeWayGuide_ThreeWay_Wildcards, {
	collection: GuideData.collection,
	updatersForServer: {
		'name': 'three-way-guide/update/name',
		'emailPrefs': 'three-way-guide/update/emailPrefs',
		'age': 'three-way-guide/update/age',
		'notes': 'three-way-guide/update/notes',
		'someArray': 'three-way-guide/update/someArray',
		'someArray.*': 'three-way-guide/update/someArray.*',
		'points': 'three-way-guide/update/points',
		'points.*.*': 'three-way-guide/update/points.*.*',
	},
});

[
	Template.ThreeWayGuide_ThreeWay_Simple,
	Template.ThreeWayGuide_ThreeWay_Wildcards,
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
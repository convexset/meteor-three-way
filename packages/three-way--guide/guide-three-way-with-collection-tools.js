/* global ThreeWay: true */
/* global DataRecord: true */
/* global getRandomId: true */

ThreeWay.prepare(Template.ThreeWayGuide_ThreeWayCT, {
	collection: DataRecord.collection,
	updatersForServer: DataRecord.updateMethods,
});

Template.ThreeWayGuide_ThreeWayCT.onCreated(function() {
	var instance = this;
	instance.subscribe(DataRecord.defaultPublication);
});

Template.ThreeWayGuide_ThreeWayCT.onRendered(function() {
	var instance = this;

	instance.autorun(function() {
		var id = getRandomId(instance);
		if (!!id) {
			instance._3w_.setId(id);
		}
	});

	instance.$('.ui.dropdown')
		.dropdown({
			allowAdditions: true
		});
});

Template.ThreeWayGuide_ThreeWayCT.helpers(DataRecord.helperBundle);

Template.ThreeWayGuide_ThreeWayCT.events({
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
	},
});
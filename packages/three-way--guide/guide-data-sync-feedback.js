/* global ThreeWay: true */
/* global GuideData: true */
/* global getRandomId: true */

ThreeWay.prepare(Template.ThreeWayGuide_DataSyncFeedback, {
	collection: GuideData.collection,
	updatersForServer: {
		'name': 'three-way-guide/update/name',
		'emailPrefs': 'three-way-guide/update/emailPrefs',
		'age': 'three-way-guide/update/age',
		'tags': 'three-way-guide/update/tags',
		'notes': 'three-way-guide/update/notes',
	},
	dataTransformToServer: {
		tags: ThreeWay.transformations.arrayFromCommaDelimitedString,
	},
	dataTransformFromServer: {
		tags: ThreeWay.transformations.arrayToCommaDelimitedString,
	},
	validatorsServer: {
		tags: {
			validator: function(value, matchInformation, vmData) {
				// tags must begin with "tag"
				return value.filter(x => x.substr(0, 3).toLowerCase() !== 'tag').length === 0;
			},
			success: function(value, matchInformation, vmData) {
				Template.instance()._3w_.set('tagsValidationErrorText', '');
			},
			failure: function(value, matchInformation, vmData) {
				Template.instance()._3w_.set('tagsValidationErrorText', 'Each tag should begin with \"tag\".');
			},
		},
	},
	preProcessors: {
		grayIfTrue: x => (!!x) ? "#ccc" : "",
		redIfTrue: x => (!!x) ? "red" : "",
	},
	// Reports updates of focused fields
	updateOfFocusedFieldCallback: function(fieldMatchParams, newValue, currentValue) {
		var instance = Template.instance();
		var updatedFieldData = instance._3w_.get('updatedFieldData');

		updatedFieldData.push({
			fieldMatchParams: fieldMatchParams,
			newValue: newValue,
			prevValue: currentValue,
			time: new Date(),
		});
		instance._3w_.set('updatedFieldData', updatedFieldData);
		console.info("Update of focused field to", newValue, "from", currentValue, "| Field Info:", fieldMatchParams);
		alert("Update of focused field. (Look in the JS console.)");
		instance._3w_.set(fieldMatchParams.fieldPath, newValue);
	},
	viewModelToViewOnly: {
		updatedFieldData: [],
	}
});

Template.ThreeWayGuide_DataSyncFeedback.onCreated(function() {
	var instance = this;
	instance.subscribe('guide-pub');
});

Template.ThreeWayGuide_DataSyncFeedback.onRendered(function() {
	var instance = this;

	instance.autorun(function() {
		var id = getRandomId(instance);
		if (!!id) {
			instance._3w_.setId(id);
			instance._3w_.set('updatedFieldData', []);
		}
	});

	instance.$('.ui.dropdown')
		.dropdown({
			allowAdditions: true
		});
});

Template.ThreeWayGuide_DataSyncFeedback.helpers(GuideData.helperBundle);

Template.ThreeWayGuide_DataSyncFeedback.events({
	'click button.select-document': function(event, instance) {
		var id = event.target.getAttribute('data-id');
		if (!!id) {
			instance._3w_.setId(id);
			instance._3w_.set('updatedFieldData', []);

			setTimeout(function() {
				$('html, body').animate({
					scrollTop: Math.max(0, instance.$("table.edit-table").offset().top - 120)
				}, 500);
			}, 50);
		}
	},
	'click button.regenerate-document': function(event, instance) {
		var id = instance._3w_.getId();
		console.info('Will make request to regenerate document with id ' + id + ' in 3 seconds.');
		if (!!id) {
			setTimeout(function() {
				console.info('Call to regenerate document with id ' + id + ' dispatched.');
				Meteor.call('regenerate-one--guide', id);
			}, 3000);
		}
	},
	"click a#focus-name": function(event) {
		event.preventDefault();
		Template.instance()._3w_.set('nameHasFocus', true);
	},
});
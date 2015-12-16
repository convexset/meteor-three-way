/* global ThreeWay: true */
/* global GuideData: true */
/* global getRandomId: true */

ThreeWay.prepare(Template.ThreeWayGuide_DataSyncFeedback_Wrapper, {
	collection: GuideData.collection,
	updatersForServer: {
		'name': 'three-way-guide/update/name',
		'emailPrefs': 'three-way-guide/update/emailPrefs',
		'age': 'three-way-guide/update/age',
		'tags': 'three-way-guide/update/tags',
		'notes': 'three-way-guide/update/notes',
		'points': 'three-way-guide/update/points',
		'points.*.*': 'three-way-guide/update/points.*.*',
		'someArray': 'three-way-guide/update/someArray',
		'someArray.*': 'three-way-guide/update/someArray.*',
	},
	dataTransformToServer: {
		tags: ThreeWay.transformations.arrayFromCommaDelimitedString,
		'points.*.*': x => Number(x),
	},
	dataTransformFromServer: {
		tags: ThreeWay.transformations.arrayToCommaDelimitedString,
		'points.*.*': x => x.toString(),
	},
	validatorsVM: {
		'someArray.*': {
			validator: function(value, matchInformation, vmData) {
				return !Number.isNaN(Number(value));
			},
			success: function(value, matchInformation, vmData) {
				Template.instance()._3w_.set('someArrValidationErrorText.' + matchInformation.params[0], '');
			},
			failure: function(value, matchInformation, vmData) {
				Template.instance()._3w_.set('someArrValidationErrorText.' + matchInformation.params[0], 'Invalid Value: ' + value + ' (Numbers only please.)');
			},
		}
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
});

Template.ThreeWayGuide_DataSyncFeedback_Wrapper.onCreated(function() {
	var instance = this;
	instance.subscribe('guide-pub');
});

Template.ThreeWayGuide_DataSyncFeedback_Wrapper.onRendered(function() {
	var instance = this;

	instance.autorun(function() {
		var id = getRandomId(instance);
		if (!!id) {
			instance._3w_.setId(id);
		}
	});
});

Template.ThreeWayGuide_DataSyncFeedback_Wrapper.helpers(GuideData.helperBundle);

Template.ThreeWayGuide_DataSyncFeedback_Wrapper.events({
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
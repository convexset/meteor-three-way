/* global ThreeWay: true */

ThreeWay.prepare(Template.ThreeWayGuide_StylesClassesAttributes, {
	viewModelToViewOnly: {
		// necessary initializations
		styles: {},
		classes: {},
		attributes: {}
	}
});

Template.ThreeWayGuide_StylesClassesAttributes.onRendered(function() {
	var instance = this;
	// initialize
	setTimeout(function() {
		instance._3w_.set('styles.font-family', 'Courier New');
		instance._3w_.set('styles.font-size', '200%');
		instance._3w_.set('classes.red', false);
		instance._3w_.set('classes.loading', false);
		instance._3w_.set('attributes.disabled', false);
	}, 100);
});

Template.ThreeWayGuide_StylesClassesAttributes.events({
	'click button.control': function(event, template) {
		var item = event.target.getAttribute('data-id');
		var field = item.split("|")[0];
		var value = item.split("|")[1] === "true" ? true : false;
		template._3w_.set(field, value);
	}
});

Template.ThreeWayGuide_StylesClassesAttributes.helpers({
	truthy: x => !!x ? "True" : "False",
	trueDisabled: x => !!x ? "disabled" : "",
	falseDisabled: x => !!x ? "" : "disabled",
	setTrueButtonColor: x => !!x ? "grey" : "blue",
	setFalseButtonColor: x => !!x ? "orange" : "grey",
});
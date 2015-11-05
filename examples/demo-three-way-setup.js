/* global ThreeWay: true */
/* global Demo: true */


////////////////////////////////////////////////////////////
// Preamble
////////////////////////////////////////////////////////////
var updatersForServer = _.object(Demo.fields, Demo.fields.map(x => "update-" + x));

var selectedDebugMessages = [
	// 'parse',
	// 'bindings',
	// 'data-mirror',
	// 'observer',
	// 'tracker',
	// 'new-id',
	// 'db',
	// 'methods',
	// 'value',
	// 'checked',
	// 'html',
	// 'visible-and-disabled',
	// 'style',
	// 'attr',
	// 'class',
	// 'event',
	// 'vm-only',
	// 'validation',
	// 'bind',
];
//selectedDebugMessages = ThreeWay.DEBUG_MESSAGES; // copy


////////////////////////////////////////////////////////////
// Parent Template
////////////////////////////////////////////////////////////
if (Meteor.isClient) {
	ThreeWay.prepare(Template.DemoThreeWay, {
		// The relevant Mongo.Collection
		collection: Demo.collection,

		// Meteor methods for updating the database
		// The keys being the respective fields/field selectors for the database
		// The method signature for these methods being
		// function(_id, value, ...wildCardParams)
		updatersForServer: updatersForServer,

		// Transformations from the server to the view model
		// In this example, "tags" are stored in the view model as a comma
		// separated list in a string, while it is stored in the server as
		// an array
		dataTransformToServer: {
			tags: ThreeWay.transformations.arrayFromCommaDelimitedString,
			// tags: function(x, vmData) {
			// 	var outcome = ThreeWay.transformations.arrayFromCommaDelimitedString(x);
			// 	console.log('dataTransformToServer[\'tags\']:', x, vmData, '-->', outcome);
			// 	return outcome;
			// }
		},

		// Transformations from the view model to the server
		// (Transform and call the updater Meteor method)
		// In this example, "tags" are stored in the view model as a comma
		// separated list in a string, while it is stored in the server as
		// an array
		dataTransformFromServer: {
			tags: ThreeWay.transformations.arrayToCommaDelimitedString,
			// tags: function(arr, doc) {
			// 	var outcome = ThreeWay.transformations.arrayToCommaDelimitedString(arr);
			// 	console.log('dataTransformFromServer[\'tags\']:', arr, doc, '-->', outcome);
			// 	return outcome;
			// }
		},

		// Validators under validatorsVM consider view-model data
		// Useful for making sure that transformations to server values do not fail
		// Arguments: (value, vmData, wildCardParams)
		validatorsVM: {
			'personal.someArr.*': function(value, vmData, wildCardParams) {
				var result;
				if (Number(wildCardParams[0]) === 2) {
					// No exclamation marks
					result = value.indexOf('!') === -1;
					if (!result) {
						console.warn('[validatorsVM] personal.someArr.2 should have no \"!\"s', value, wildCardParams);
					}
				} else {
					result = !Number.isNaN(Number(value));
					if (!result) {
						console.warn('[validatorsVM] personal.someArr.* (less 2) should be a number', value, wildCardParams);
					}
				}
				return result;
			},
		},

		// Validators under validatorsServer consider transformed values
		// (no additional view-model data, work with that somewhere else)
		// Arguments: (value, wildCardParams)
		validatorsServer: {
			tags: function(value) {
				return value.filter(x => x.substr(0, 3).toLowerCase() !== 'tag').length === 0;
			},
			'personal.someArr.*': function(value, wildCardParams) {
				var result;
				if (Number(wildCardParams[0]) === 2) {
					// no '@'s
					result = value.indexOf('@') === -1;
					if (!result) {
						console.warn('[validatorsServer] personal.someArr.2 should have no \"@\"s', value, wildCardParams);
					}
				} else {
					result = !Number.isNaN(Number(value));
					if (!result) {
						console.warn('[validatorsServer] personal.someArr.* (less 2) should be a number', value, wildCardParams);
					}
				}
				return result;
			},
		},

		// Success callbacks for validators
		validateSuccessCallback: {
			'tags': function(template) { // function(template, value, vmData, field, params) {
				//console.info('[Validated!] tags:', value, field, params);
				template._3w_set('tagsValidationErrorText', '');
			},
			'personal.someArr.*': function(template, value, vmData, field, params) {
				//console.info('[Validated!] personal.someArr.*', value, field, params);
				template._3w_set('someArrValidationErrorText.' + params[0], '');
			},
		},

		// Failure callbacks for validators
		validateFailureCallback: {
			'tags': function(template, value, vmData, field, params) {
				console.warn('[Validation Failed] tags:', value, field, params);
				template._3w_set('tagsValidationErrorText', 'Each tag should begin with \"tag\".');
			},
			'personal.someArr.*': function(template, value, vmData, field, params) {
				console.warn('[Validation Failed] personal.someArr.*', value, field, params);
				template._3w_set('someArrValidationErrorText.' + params[0], 'Invalid Value: ' + value);
			},
		},

		// Helper functions that may be used as input for display-type bindings
		// Order of search: three-way helpers, then template helpers, then data
		// Called with this bound to template instance
		// (be aware that arrow functions are lexically scoped)
		helpers: {
			altGetId: function() {
				// console.info('altGetId called!', Template.instance() && Template.instance().view.name);
				return this._3w_getId();
			},
		},

		// Pre-processors for data pre-render (view model to view)
		preProcessors: {
			// this takes a string of comma separated tags, splits, trims then
			// joins them to make the result "more presentable"
			tagsTextDisplay: x => (!x) ? "" : x.split(',').map(x => x.trim()).join(', '),
			// this maps a key to the corresponding long form description
			mapToAgeDisplay: x => Demo.ageRanges[x],
			// this maps an array of keys to the corresponding long form
			// descriptions and then joins them
			mapToEmailPrefs: function(prefs, elem, vmData) {
				var outcome = prefs.map(x => Demo.emailPrefsAll[x]).join(", ");
				console.log('preProcessors[\'mapToEmailPrefs\']\nValue: ', prefs, "\nDOM Element:", elem, "\nView Model Data:", vmData, '-->', outcome);
				return outcome;
			},
			boldIfMoreThanOne: function(prefString) {
				return (prefString.split(',').length <= 1) ? prefString : '<strong>' + prefString + '</strong>';
			},
			sayHideToHide: function(v) {
				return (v && v.trim().toUpperCase() || "") !== "HIDE";
			},
			toUpperCase: function(v) {
				return v && v.toUpperCase() || "";
			},
			colorCodeAge: function(v) {
				if (v === '0_12') {
					return "#8F8";
				}
				if (v === '13_20') {
					return "#0F0";
				}
				if (v === '21_35') {
					return "#4B0";
				}
				if (v === '36_65') {
					return "#890";
				}
				if (v === '66_plus') {
					return "#884";
				}
				return "";
			},
			appendTimeStamp: function(v) {
				return v + ' (' + (new Date()) + ')';
			},
			stringToColor: function(v) {
				v = (!!v) ? v : 'xxx';
				var col = '#' + (256 + (_.map(v, (c, idx) => (5 + 7 * idx) * c.charCodeAt()).reduce((x, y) => x + y) % (4096 - 256))).toString(16);
				return col;
			},
			makeRGB: function(...rgb) {
				var col = _.range(3)
					.map(idx => !!rgb[idx] && !Number.isNaN(Number(rgb[idx])) ? Number(rgb[idx]) : 128)
					.map(x => Math.min(255, Math.max(0, Math.floor(x))))
					.map(x => x.toString(16))
					.map(x => x.length < 2 ? '0' + x : x);
				return "#" + col.join('');
			},
			not: x => !x,
			noIsFalse: x => (!!x) && (x.trim().toLowerCase() === 'no' ? false : true),
			trueIfNonEmpty: x => (!!x) && x.length > 0,
			grayIfTrue: x => (!!x) ? "#ccc" : "",
			redIfTrue: x => (!!x) ? "red" : "",
			// This is something "special" to make the Semantic UI Dropdown work
			// (There's some DOM manipulation in the method)
			// More helpers will be written soon...
			updateSemanticUIDropdown: ThreeWay.processors.updateSemanticUIDropdown
		},

		// (Global) initial values for fields that feature only in the local view
		// model and are not used to update the database
		// Will be overridden by value tags in the rendered template of the form:
		// <data field="additional" initial-value="view model to view only"></data>
		viewModelToViewOnly: {
			"hide": "Set to \"hide\" to hide",
			"debugMessages": selectedDebugMessages,
			"tagsValidationErrorText": "",
			"someArrValidationErrorText.0": "",
			"someArrValidationErrorText.2": "",
		},

		// Event Handlers for binding
		// Event Handlers bound like
		// <input data-bind="value: sliderValue; event: {mousedown: dragStartHandler, mouseup: dragEndHandler|saySomethingHappy}" type="range">
		eventHandlers: {
			dragStartHandler: function(event, template, vmData) {
				console.info("Drag Start at " + (new Date()), event, template, vmData);
			},
			dragEndHandler: function(event, template, vmData) {
				console.info("Drag End at " + (new Date()), event, template, vmData);
			},
			saySomethingHappy: function() {
				console.info("Let\'s chill. (Second mouseup event to fire.)");
			},
		},

		// Database Update Parameters
		// "Debounce Interval" for Meteor calls; See: http://underscorejs.org/#debounce
		debounceInterval: 500, // default: 500
		// "Throttle Interval" for Meteor calls; See: http://underscorejs.org/#throttle ; fields used for below...
		throttleInterval: 500, // default: 500
		// Fields for which updaters are throttle'd instead of debounce'ed
		throttledUpdaters: ['emailPrefs', 'personal.particulars.age'],
		// Interval between update Meteor methods on fields with the same top level parent (e.g.: `particulars.name` and `particulars.hobbies.4.hobbyId`).
		methodInterval: 100, // default: 100
	});
}


////////////////////////////////////////////////////////////
// Child Template
////////////////////////////////////////////////////////////
if (Meteor.isClient) {
	ThreeWay.prepare(Template.DemoThreeWayChild, {
		collection: Demo.collection,
		updatersForServer: {
			'name': 'update-name'
		},
		viewModelToViewOnly: {
			"childData": "1234"
		},
	});
}


////////////////////////////////////////////////////////////
// Grand Child Template
////////////////////////////////////////////////////////////
if (Meteor.isClient) {
	ThreeWay.prepare(Template.DemoThreeWayGrandChild, {
		collection: Demo.collection,
		updatersForServer: {
			'name': 'update-name'
		},
	});
}

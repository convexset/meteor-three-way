/* global ThreeWay: true */
/* global Demo: true */

// if (Meteor.isClient) {
// 	ThreeWay.setDebugModeOn();
// 	ThreeWay.debugModeSelect('bindings');
// }

////////////////////////////////////////////////////////////
// Preamble
////////////////////////////////////////////////////////////
var updatersForServer = _.object(Demo.fields, Demo.fields.map(x => "update-" + x));
// updatersForServer['personal.someArr.1'] = 'update-personal.someArr.1';
updatersForServer['name'] = function(id, value) {
	console.info('[update-name] Updating name of id ', id, "to", value);
	Meteor.call('update-name', id, value);
};
updatersForServer['personal.someArr.1'] = {
	method: 'update-personal.someArr.1',
	callback: function(err, res, info) {
		console.info('[update-personal.someArr.1] Updated.', err, res, info);
	}
};

// WTH is this? Remove ASAP!!! (Used for testing overlapping bindings)
updatersForServer['personal.otherArr'] = function(id, value) {
	console.info('[personal.otherArr]', id, value);
	Demo.collection.update(id, {
		$set: {
			'personal.otherArr': value
		}
	});
};
updatersForServer['personal.otherArr.0'] = function(id, value) {
	console.info('[personal.otherArr.0]', id, value);
	Demo.collection.update(id, {
		$set: {
			'personal.otherArr.0': value
		}
	});
};


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

		// Inject default values if not in database record
		injectDefaultValues: {
			name: 'Unnamed Person'
		},

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
		// Validators under validatorsServer consider transformed data (for the server)
		//
		// validators have method signature:
		//   function(value, matchInformation, vmData)
		// success/failure call backs have signature:
		//   function(value, matchInformation, vmData)
		// all are called with the template instance as context
		//
		// matchInformation takes the form:
		//   {
		//      "fieldPath": "personal.otherArr.0.a",
		//      "match": "personal.otherArr.*.*",
		//      "params": ["0","a"]
		//   }
		validatorsVM: {
			'personal.someArr.*': {
				validator: function(value, matchInformation) {
					var result;
					if (Number(matchInformation.params[0]) === 2) {
						// No exclamation marks
						if (typeof value === "undefined") {
							value = "";
						}
						result = value.indexOf('!') === -1;
						if (!result) {
							console.warn('[validatorsVM] personal.someArr.2 should have no \"!\"s', value, matchInformation.params);
						}
					} else {
						result = !Number.isNaN(Number(value));
						if (!result) {
							console.warn('[validatorsVM] personal.someArr.* (less 2) should be a number', value, matchInformation.params);
						}
					}
					return result;
				},
				success: function(value, matchInformation) {
					console.info('[Validated!] personal.someArr.*', value);
					Template.instance()._3w_.set('someArrValidationErrorText.' + matchInformation.params[0], '');
				},
				failure: function(value, matchInformation, vmData) {
					var instance = this;
					console.warn('[Validation Failed] personal.someArr.*', value);
					console.warn('[Validation Failed] ... but lookie what else accessible', matchInformation, vmData);
					instance._3w_.set('someArrValidationErrorText.' + matchInformation.params[0], 'Invalid Value: ' + value);
				},
			}
		},
		validatorsServer: {
			tags: {
				validator: function(value) {
					// tags must begin with "tag"
					return value.filter(x => x.substr(0, 3).toLowerCase() !== 'tag').length === 0;
				},
				success: function(value) {
					var instance = this;
					console.info('[Validated!] tags:', value);
					instance._3w_.set('tagsValidationErrorText', '');
				},
				failure: function(value, matchInformation, vmData) {
					var instance = this;
					console.warn('[Validation Failed] tags:', value);
					console.warn('[Validation Failed] ... but lookie what else accessible', matchInformation, vmData);
					instance._3w_.set('tagsValidationErrorText', 'Each tag should begin with \"tag\".');
				},
			},
		},

		// Helper functions that may be used as input for display-type bindings
		// Order of search: three-way helpers, then template helpers, then data
		// Called with this bound to template instance
		// (be aware that arrow functions are lexically scoped)
		helpers: {
			altGetId: function() {
				console.info('altGetId called from', Template.instance() && Template.instance().view.name);
				return this._3w_.getId();
			},
		},

		// Pre-processors for data pre-render (view model to view)
		preProcessors: {
			// this takes a string of comma separated tags, splits, trims then
			// joins them to make the result "more presentable"
			tagsTextDisplay: x => (!x) ? "" : x.split(',').map(x => x.trim()).join(', '),
			// this maps a key to the corresponding long form description
			mapToAgeDisplay: ThreeWay.preProcessorGenerators.makeMap(Demo.ageRanges, ''),
			// this maps an array of keys to the corresponding long form
			// descriptions and then joins them
			mapToEmailPrefs: function(prefs, elem, vmData, matchInformation) {
				var outcome = prefs.map(x => Demo.emailPrefsAll[x]).join(", ");
				console.log("preProcessors[\'mapToEmailPrefs\'] DOM Element:", elem, "\nView Model Data:", vmData, "\nMatch Information:", matchInformation);
				console.log("preProcessors[\'mapToEmailPrefs\'] Value: ", prefs, '-->', outcome);
				return outcome;
			},
			boldIfMoreThanOne: function(prefString) {
				return (typeof prefString === "undefined") ? "" : ((prefString.split(',').length <= 1) ? prefString : '<strong>' + prefString + '</strong>');
			},
			sayHideToHide: function(v) {
				return (v && v.trim().toUpperCase() || "") !== "HIDE";
			},
			colorCodeAge: ThreeWay.preProcessorGenerators.makeMap({
				'0_12': "#8F8",
				'13_20': "#0F0",
				'21_35': "#4B0",
				'36_65': "#890",
				'66_plus': "#884",
			}, ""),
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
			noIsFalse: x => (!!x) && (x.trim().toLowerCase() === 'no' ? false : true),
			trueIfNonEmpty: x => (!!x) && x.length > 0,
			grayIfTrue: x => (!!x) ? "#ccc" : "",
			redIfTrue: x => (!!x) ? "red" : "",
		},

		// (Global) initial values for fields that feature only in the local view
		// model and are not used to update the database
		// Will be overridden by value tags in the rendered template of the form:
		// <data field="additional" initial-value="view model to view only"></data>
		viewModelToViewOnly: {
			"hide": "Set to \"hide\" to hide",
			"debugMessages": [],
			"tagsValidationErrorText": "",
			"someArrValidationErrorText.0": "",
			"someArrValidationErrorText.2": "",
			"nameHasFocus": false,
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
			saySomethingHappy: function(event, template, vmData) {
				console.info("Let\'s chill. (Second mouseup event to fire.)", event, template, vmData);
			},
			ctrlReturnKey: ThreeWay.eventGenerators.returnKeyHandlerGenerator(() => console.info('[CTRL-ENTER handler]'), {
				ctrlKey: true,
				altKey: false,
				shiftKey: false,
			}),
			shiftReturnKey: ThreeWay.eventGenerators.returnKeyHandlerGenerator(() => console.info('[SHIFT-ENTER handler]'), {
				ctrlKey: false,
				altKey: false,
				shiftKey: true,
			}),
			backspaceKey: ThreeWay.eventGenerators.keypressHandlerGenerator(() => console.info('[BACKSPACE handler]'), [8]),
			leftArrowKey: () => console.info('[leftArrowKey handler]'),
			upArrowKey: () => console.info('[upArrowKey handler]'),
			rightArrowKey: () => console.info('[rightArrowKey handler]'),
			downArrowKey: () => console.info('[downArrowKey handler]'),
			otherUpArrowKey: ThreeWay.eventGenerators.keypressHandlerGenerator(() => console.log('[other up arrow key handler]'), [38]),
			f1Key: () => console.info('[f1 handler]'),
		},

		// Database Update Parameters
		// "Debounce Interval" for Meteor calls; See: http://underscorejs.org/#debounce
		debounceInterval: 500, // default: 500
		// "Throttle Interval" for Meteor calls; See: http://underscorejs.org/#throttle ; fields used for below...
		throttleInterval: 500, // default: 500
		// Fields for which updaters are throttle'd instead of debounce'ed
		throttledUpdaters: ['emailPrefs'],
		// Interval between update Meteor methods on fields with the same top level parent (e.g.: `particulars.name` and `particulars.hobbies.4.hobbyId`).
		methodInterval: 100, // default: 100

		// Reports updates of focused fields
		updateOfFocusedFieldCallback: function(fieldMatchParams, newValue, currentValue) {
			console.info("Update of focused field to", newValue, "from", currentValue, "| Field Info:", fieldMatchParams);
		},
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
		helpers: {
			childHelper: "childHelper",
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
		helpers: {
			grandchildHelper: "grandchildHelper",
		},
	});
}


////////////////////////////////////////////////////////////
// Grand Child Template
////////////////////////////////////////////////////////////
if (Meteor.isClient) {
	ThreeWay.prepare(Template.DemoThreeWayPreparationDeficient, {});
}
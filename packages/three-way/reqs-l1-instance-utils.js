/* global ThreeWayDependencies: true */

const PackageUtilities = require('package-utils');
const _ = require('underscore');


if (typeof ThreeWayDependencies === "undefined") {
	ThreeWayDependencies = {};
}
ThreeWayDependencies.instanceUtils = {};

//////////////////////////////////////////////////////////////////////
// Instance Utilities
//////////////////////////////////////////////////////////////////////

/////////////////////////////////////////////////////////////////////
// Generate generate updateRelatedFields Function
/////////////////////////////////////////////////////////////////////
function flattenObject(o, prefix = []) {
	if (!_.isArray(prefix)) {
		prefix = [prefix];
	}
	var ret = [];
	_.forEach(o, function(v, name) {
		var path = prefix.concat(name);
		ret.push({
			fieldName: path.join('.'),
			value: v
		});

		var vType = Object.prototype.toString.call(v);
		if (['[object Object]', '[object Array]'].indexOf(vType) !== -1) {
			ret = ret.concat(flattenObject(v, path))
		}
	});
	return ret;
}

PackageUtilities.addImmutablePropertyFunction(ThreeWayDependencies.instanceUtils, 'generateUpdateRelatedFieldsFunction', function generateUpdateRelatedFieldsFunction(options, instance) {
	var threeWay = instance[THREE_WAY_NAMESPACE];
	var threeWayMethods = instance[THREE_WAY_NAMESPACE_METHODS];

	return function updateRelatedFields(fieldName, value, calledFromObserver = false) {
		var fieldSplit = fieldName.split('.');

		var allFieldPaths = _.map(threeWayMethods.getAll_NR(), (v, k) => k);

		var childFields = _.filter(allFieldPaths, fieldPath => (fieldPath.length > fieldName.length) && (fieldPath.substr(0, fieldName.length + 1) === fieldName + '.'));
		var parentFields = _.filter(allFieldPaths, fieldPath => (fieldPath.length < fieldName.length) && (fieldName.substr(0, fieldPath.length + 1) === fieldPath + '.'));

		// console.log('[updateRelatedFields]', fieldName, {
		// 	allFieldPaths: allFieldPaths,
		// 	fieldMatchParams: threeWay.fieldMatchParams,
		// 	childFields: childFields,
		// 	parentFields: parentFields
		// })

		var presentFields = [];
		var valueType = Object.prototype.toString.call(value);
		if (['[object Object]', '[object Array]'].indexOf(valueType) !== -1) {
			flattenObject(value, [fieldName]).forEach(function(fn_v) {
				var thisFieldName = fn_v.fieldName;
				var thisValue = fn_v.value;
				presentFields.push(thisFieldName);

				// Don't use threeWayMethods.set because it calls this method
				threeWay.data.set(thisFieldName, thisValue);
			})
		}

		childFields.forEach(function(fieldPath) {
			var matchSplit = fieldPath.split('.');
			var curr_v = value;
			if (presentFields.indexOf(fieldPath) === -1) {
				// Reasonably decent garbage collection
				curr_v = undefined;
			}
			threeWay.__updatesToSkipDueToRelatedObjectUpdate[fieldPath] = true;

			if (calledFromObserver) {
				// If called from observer, this is the "correct database value"
				threeWay.__mostRecentDatabaseEntry[fieldPath] = curr_v;
			}
		});

		parentFields.forEach(function(fieldPath) {
			var matchSplit = fieldPath.split('.');
			var parentValue = threeWayMethods.get_NR(fieldPath);
			var thisSubValue = parentValue;
			for (var k = matchSplit.length; k < fieldSplit.length - 1; k++) {
				if (typeof thisSubValue[fieldSplit[k]] === "undefined") {
					thisSubValue[fieldSplit[k]] = {};
				}
				thisSubValue = thisSubValue[fieldSplit[k]];
			}
			thisSubValue[fieldSplit[fieldSplit.length - 1]] = value;

			// Don't use threeWayMethods.set because it calls this method
			threeWay.data.set(fieldPath, parentValue);
			threeWay.__updatesToSkipDueToRelatedObjectUpdate[fieldPath] = true;

			if (calledFromObserver) {
				// If called from observer, this is the "correct database value"
				threeWay.__mostRecentDatabaseEntry[fieldPath] = parentValue;
			}
		});
	};
});


/////////////////////////////////////////////////////////////////////
// Generate updateRelatedFields Function
/////////////////////////////////////////////////////////////////////
PackageUtilities.addImmutablePropertyFunction(ThreeWayDependencies.instanceUtils, 'generateUpdateServerUpdatedStatusFunction', function generateUpdateServerUpdatedStatusFunction(options, instance) {
	var threeWay = instance[THREE_WAY_NAMESPACE];
	var threeWayMethods = instance[THREE_WAY_NAMESPACE_METHODS];

	return function updateServerUpdatedStatus(fieldName) {
		if (!!threeWay.fieldMatchParams[fieldName]) {
			// invalidate only if linked to server
			// ... and different
			var isUpdated;
			Tracker.nonreactive(function() {
				// get current value by digging into document
				var doc = threeWay.collection.findOne({
					_id: threeWay.id.get()
				});
				var miniMongoValue = doc;
				var fieldNameSplit = fieldName.split('.');

				var success = true;
				var f;
				while (fieldNameSplit.length > 0) {
					f = fieldNameSplit.shift();
					if (typeof miniMongoValue[f] === "undefined") {
						success = false;
						break;
					}
					miniMongoValue = miniMongoValue[f];
				}
				if (success) {
					var miniMongoValueTransformed;
					instance.callFunctionWithTemplateContext(() => {
						miniMongoValueTransformed = options.dataTransformFromServer[threeWay.fieldMatchParams[fieldName].match](miniMongoValue, doc);
					});
					isUpdated = _.isEqual(miniMongoValueTransformed, threeWayMethods.get(fieldName));
				} else {
					isUpdated = false;
				}
			});
			threeWay.__serverIsUpdated.set(fieldName, isUpdated);
		}
	};
});

/////////////////////////////////////////////////////////////////////
// Set up binding for field (VM to DB)
/////////////////////////////////////////////////////////////////////

// TODO: ensure this is called at most once per instance
// without leaving something that cannot be garbage collected post destroy

PackageUtilities.addImmutablePropertyFunction(ThreeWayDependencies.instanceUtils, 'generateSetUpVMToDBBindingFunction', function generateSetUpVMToDBBindingFunction(options, instance) {
	var threeWay = instance[THREE_WAY_NAMESPACE];
	var threeWayMethods = instance[THREE_WAY_NAMESPACE_METHODS];

	// Setting Up Debounced/Throttled Updaters
	// Old ones will trigger even if id changes since
	// new functions are created when id changes
	var debouncedOrThrottledUpdaters = {};
	var baseUpdaters = _.object(
		options.fields,
		options.fields.map(function(f) {
			return function updateServer(v, match) {
				var _id;
				Tracker.nonreactive(function() {
					_id = threeWay.id.get();
				});
				var params = [_id, v];
				match.params.forEach(function(p) {
					params.push(p);
				});

				// meteorApply_usePromiseBins(match.fieldPath, options.updatersForServer[f], params);
				if (typeof options.updatersForServer[f] === "string") {
					Meteor.apply(options.updatersForServer[f], params);
				} else if (typeof options.updatersForServer[f] === "function") {
					instance.callFunctionWithTemplateContext(function() {
						options.updatersForServer[f].apply(instance, params);
					}, this);
				} else {
					var updateTime = new Date();
					Meteor.apply(options.updatersForServer[f].method, params, {}, function(err, res) {
						var info = {
							instance: instance,
							id: _id,
							value: v,
							params: match.params,
							methodName: options.updatersForServer[f].method,
							updateTime: updateTime,
							returnTime: new Date()
						};
						options.updatersForServer[f].callback(err, res, info);
					});
				}
			};
		})
	);

	return function setUpVMToDBBinding(curr_f) {
		if (typeof threeWay._dataUpdateComputations[curr_f] === "undefined") {
			threeWay._dataUpdateComputations[curr_f] = Tracker.autorun(function() {
				var value = threeWay.data.get(curr_f);

				var __id;
				Tracker.nonreactive(function() {
					__id = threeWay.id.get();
				});
				if (IN_DEBUG_MODE_FOR('bindings')) {
					console.log('[bindings] [' + Tracker.nonreactive(threeWayMethods.get3wInstanceId) + '] Field: ' + curr_f + "; id: " + __id + "; Value:", value);
				}

				// Skip update if subsidiary update
				var equalToRecentDBEntry = _.isEqual(value, threeWay.__mostRecentDatabaseEntry[curr_f]);
				var skipUpdate = !!threeWay.__updatesToSkipDueToRelatedObjectUpdate[curr_f];
				if (!!skipUpdate) {
					delete threeWay.__updatesToSkipDueToRelatedObjectUpdate[curr_f];
					threeWay.__mostRecentDatabaseEntry[curr_f] = value;
				}

				if ((!!__id) && (!skipUpdate) && (!!threeWay.__idReady) && (!_.isEqual(value, threeWay.__mostRecentDatabaseEntry[curr_f]))) {
					// Create specific updater for field if not already done.
					// Presents updates being lost if "fast" updates are being done
					// for a bunch of fields matching a spec. like "someArray.*"
					var matchFamily = threeWay.fieldMatchParams[curr_f].match;

					// Set up updater if not already set up
					if (typeof debouncedOrThrottledUpdaters[curr_f] === "undefined") {
						var updater = function updater(v) {
							if (IN_DEBUG_MODE_FOR('db')) {
								console.log('[db|update] [' + Tracker.nonreactive(threeWayMethods.get3wInstanceId) + '] Performing update... ' + curr_f + ' -> ', v);
							}
							threeWay.__mostRecentDatabaseEntry[curr_f] = v;
							threeWay._focusedFieldUpdatedOnServer.set(curr_f, false);
							baseUpdaters[matchFamily](v, threeWay.fieldMatchParams[curr_f]);
						};
						if (options.throttledUpdaters.indexOf(matchFamily) !== -1) {
							// Throttled updater
							debouncedOrThrottledUpdaters[curr_f] = _.throttle(updater, options.throttleInterval);
						} else {
							// Debounced updater
							debouncedOrThrottledUpdaters[curr_f] = _.debounce(updater, options.debounceInterval);
						}
					}

					// Validate before send
					if (threeWay.validateInput(curr_f, value)) {
						threeWay.__dataIsNotInvalid.set(curr_f, true);
						var vmData = threeWayMethods.getAll_NR();
						var valueToSend;
						instance.callFunctionWithTemplateContext(() => {
							valueToSend = options.dataTransformToServer[matchFamily](value, vmData);
						});

						if (IN_DEBUG_MODE_FOR('db')) {
							console.log('[db|update] [' + Tracker.nonreactive(threeWayMethods.get3wInstanceId) + '] Initiating update... ' + curr_f + ' -> ', value, ' (Value for server:', valueToSend, ')');
						}

						// Store recent states to avoid the "reversion" problem
						// Due to cursor.observeChanges sending the entire sub-document,
						// what has to be stored is the sub-document
						//
						// This is here instead of within the updater to ensure that state 
						// at the point of the change is stored instead of at the point
						// where debouncing/throttling releases the update.
						// This means no "state" is missed out
						var fieldPrefix = curr_f.split('.')[0];
						_.forEach(threeWay.fieldMatchParams, function(m, f) {
							if (f.substr(0, fieldPrefix.length) === fieldPrefix) {
								if (typeof vmData[f] !== "undefined") {
									if (typeof threeWay.__recentDBUpdates[f] === "undefined") {
										threeWay.__recentDBUpdates[f] = [];
									}
									var thisClientSideValue = (f === curr_f) ? value : vmData[f];
									ThreeWayDependencies.utils.removeOldItems(threeWay.__recentDBUpdates[f], AGE_THRESHOLD_OLD_ITEM);
									threeWay.__recentDBUpdates[f].push({
										valueOnClient: thisClientSideValue,
										ts: (new Date()).getTime(),
									});
									if (IN_DEBUG_MODE_FOR('db')) {
										console.log('[db|update-recents] [' + Tracker.nonreactive(threeWayMethods.get3wInstanceId) + '] Storing recent (client-side) value for ' + f + ':', thisClientSideValue, ' (Value for server:', valueToSend, ')');
									}
								}
							}
						});

						debouncedOrThrottledUpdaters[curr_f](valueToSend);
					} else {
						if (IN_DEBUG_MODE_FOR('db') || IN_DEBUG_MODE_FOR('validation')) {
							console.log('[db/validation] [' + Tracker.nonreactive(threeWayMethods.get3wInstanceId) + '] Validation failed. No update. Field: ' + curr_f + '; Value:', value);
							threeWay.__dataIsNotInvalid.set(curr_f, false);
						}
					}

				} else {
					if (IN_DEBUG_MODE_FOR('db')) {
						console.log('[db|update] [' + Tracker.nonreactive(threeWayMethods.get3wInstanceId) + '] No update for ' + curr_f + '; value:', value);

						if (!__id) {
							console.log('\tReason: No ID');
						}
						if (skipUpdate) {
							console.log('\tReason: Skip Due To Related Object Update');
						}
						if (!threeWay.__idReady) {
							console.log('\tReason: ID not ready');
						}
						if (equalToRecentDBEntry) {
							console.log('\tReason: Equal to recent DB entry');
						}
					}
				}
			});
		}
	};
});

/////////////////////////////////////////////////////////////////////
// Set up validation
/////////////////////////////////////////////////////////////////////

// TODO: ensure this is called at most once per instance
// without leaving something that cannot be garbage collected post destroy

PackageUtilities.addImmutablePropertyFunction(ThreeWayDependencies.instanceUtils, 'generateValidationFunction', function generateValidationFunction(options, instance) {
	var threeWay = instance[THREE_WAY_NAMESPACE];
	var threeWayMethods = instance[THREE_WAY_NAMESPACE_METHODS];

	threeWay.fieldMatchParamsForValidationVM = {};
	threeWay.fieldMatchParamsForValidationServer = {};
	var validatorFieldsVM = _.map(options.validatorsVM, (v, k) => k);
	var validatorFieldsServer = _.map(options.validatorsServer, (v, k) => k);

	return function validateInViewModelThenServer(field, value, validateForServer) {
		if (typeof validateForServer === "undefined") {
			validateForServer = true;
		}

		if (!threeWay.fieldMatchParams[field]) {
			validateForServer = false;
		}


		if (typeof threeWay.fieldMatchParams[field] === "undefined") {
			// might be overwritten once... but that's ok
			threeWay.fieldMatchParams[field] = null;
			var matches = ThreeWayDependencies.utils.matchParamStrings(options.fields, field);
			if (matches.length > 0) {
				threeWay.fieldMatchParams[field] = matches[0];
			}
		}

		if (typeof threeWay.fieldMatchParamsForValidationVM[field] === "undefined") {
			threeWay.fieldMatchParamsForValidationVM[field] = null;
			var vmMatches = ThreeWayDependencies.utils.matchParamStrings(validatorFieldsVM, field);
			if (vmMatches.length > 0) {
				threeWay.fieldMatchParamsForValidationVM[field] = vmMatches[0];
			}
		}
		if (typeof threeWay.fieldMatchParamsForValidationServer[field] === "undefined") {
			threeWay.fieldMatchParamsForValidationServer[field] = null;
			var serverMatches = ThreeWayDependencies.utils.matchParamStrings(validatorFieldsServer, field);
			if (serverMatches.length > 0) {
				threeWay.fieldMatchParamsForValidationServer[field] = serverMatches[0];
			}
		}

		var vmData = threeWayMethods.getAll_NR();

		var matchFamily = threeWay.fieldMatchParams[field] && threeWay.fieldMatchParams[field].match || null;

		var matchFamilyVM = threeWay.fieldMatchParamsForValidationVM[field] && threeWay.fieldMatchParamsForValidationVM[field].match;
		var matchFamilyServer = threeWay.fieldMatchParamsForValidationServer[field] && threeWay.fieldMatchParamsForValidationServer[field].match;

		var useValidatorForVM = !!threeWay.fieldMatchParamsForValidationVM[field] && !!options.validatorsVM[matchFamilyVM];
		var useValidatorForServer = validateForServer && !!threeWay.fieldMatchParamsForValidationServer[field] && !!options.validatorsServer[matchFamilyServer];

		var valueToUse = value;
		var passed = true;
		var validator, successCB, failureCB;

		var didValidationWork = false;

		instance.callFunctionWithTemplateContext(function() {
			if (useValidatorForVM) {
				validator = !!options.validatorsVM[matchFamilyVM].validator ? options.validatorsVM[matchFamilyVM].validator : () => true;
				successCB = !!options.validatorsVM[matchFamilyVM].success ? options.validatorsVM[matchFamilyVM].success : function() {};
				failureCB = !!options.validatorsVM[matchFamilyVM].failure ? options.validatorsVM[matchFamilyVM].failure : function() {};

				if (options.validateRepeats || (typeof threeWay.__mostRecentValidationValueVM[field] === "undefined") || !_.isEqual(threeWay.__mostRecentValidationValueVM[field].value, valueToUse)) {
					// If successive repeat... don't repeat validation
					didValidationWork = true;

					if (IN_DEBUG_MODE_FOR('validation')) {
						console.log('[validation] [' + Tracker.nonreactive(threeWayMethods.get3wInstanceId) + '] Doing validation (VM)... Field: ' + field + '; Value:', value, '; Validation Info (VM):', threeWay.fieldMatchParamsForValidationVM[field]);
					}

					passed = validator.call(instance, valueToUse, threeWay.fieldMatchParamsForValidationVM[field], vmData);
					if (passed) {
						successCB.call(instance, valueToUse, threeWay.fieldMatchParamsForValidationVM[field], vmData);
					} else {
						failureCB.call(instance, valueToUse, threeWay.fieldMatchParamsForValidationVM[field], vmData);
					}

					threeWay.__mostRecentValidationValueVM[field] = {
						value: value,
						outcome: passed,
					};
				} else {
					if (IN_DEBUG_MODE_FOR('validation')) {
						console.log('[validation] [' + Tracker.nonreactive(threeWayMethods.get3wInstanceId) + '] Not doing validation (VM) due to repeat value... Field: ' + field + '; Value:', value, '; Validation Info (VM):', threeWay.fieldMatchParamsForValidationVM[field]);
					}
					passed = threeWay.__mostRecentValidationValueVM[field].outcome;
				}
			}
			if (passed && useValidatorForServer) {
				// already called with Template context
				valueToUse = options.dataTransformToServer[matchFamily](value, vmData);

				validator = !!options.validatorsServer[matchFamilyServer].validator ? options.validatorsServer[matchFamilyServer].validator : () => true;
				successCB = !!options.validatorsServer[matchFamilyServer].success ? options.validatorsServer[matchFamilyServer].success : function() {};
				failureCB = !!options.validatorsServer[matchFamilyServer].failure ? options.validatorsServer[matchFamilyServer].failure : function() {};

				if (options.validateRepeats || (typeof threeWay.__mostRecentValidationValueServer[field] === "undefined") || !_.isEqual(threeWay.__mostRecentValidationValueServer[field].serverValue, valueToUse)) {
					// If successive repeat... don't repeat validation
					didValidationWork = true;

					if (IN_DEBUG_MODE_FOR('validation')) {
						console.log('[validation] [' + Tracker.nonreactive(threeWayMethods.get3wInstanceId) + '] Doing validation (Server)... Field: ' + field + '; Value:', value, '; Validation Info (Server):', threeWay.fieldMatchParamsForValidationServer[field]);
					}

					passed = validator.call(instance, valueToUse, threeWay.fieldMatchParamsForValidationServer[field], vmData);
					if (passed) {
						successCB.call(instance, valueToUse, threeWay.fieldMatchParamsForValidationServer[field], vmData);
					} else {
						failureCB.call(instance, valueToUse, threeWay.fieldMatchParamsForValidationServer[field], vmData);
					}

					threeWay.__mostRecentValidationValueServer[field] = {
						value: value,
						serverValue: valueToUse,
						outcome: passed,
					};
				} else {
					if (IN_DEBUG_MODE_FOR('validation')) {
						console.log('[validation] [' + Tracker.nonreactive(threeWayMethods.get3wInstanceId) + '] Not doing validation (Server) due to repeat value... Field: ' + field + '; Value:', value, '; Validation Info (Server):', threeWay.fieldMatchParamsForValidationServer[field]);
					}
					passed = threeWay.__mostRecentValidationValueServer[field].outcome;
				}
			}
		}, this);

		if (didValidationWork && IN_DEBUG_MODE_FOR('validation')) {
			console.log('[validation] [' + Tracker.nonreactive(threeWayMethods.get3wInstanceId) + '] Validation result. Field: ' + field + '; Value:', value, '; Passed: ' + passed);
		}

		return passed;
	};
});
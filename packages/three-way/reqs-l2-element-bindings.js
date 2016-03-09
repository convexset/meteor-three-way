/* global ThreeWayDependencies: true */
if (typeof ThreeWayDependencies === "undefined") {
	ThreeWayDependencies = {};
}

//////////////////////////////////////////////////////////////////////
// createBindElementFunction
//////////////////////////////////////////////////////////////////////
ThreeWayDependencies.createBindElementFunction = function(options, instance) {
	var threeWay = instance[THREE_WAY_NAMESPACE];
	var threeWayMethods = instance[THREE_WAY_NAMESPACE_METHODS];

	// var updateRelatedFields = ThreeWayDependencies.instanceUtils.generateUpdateRelatedFieldsFunction(options, instance);
	var updateServerUpdatedStatus = ThreeWayDependencies.instanceUtils.generateUpdateServerUpdatedStatusFunction(options, instance);
	var doFieldMatch = threeWayMethods._doFieldMatch;
	var processInTemplateContext = threeWayMethods._processInTemplateContext;

	if (typeof doFieldMatch === "undefined") {
		// for debugging in future... just in case...
		throw new Meteor.Error("missing-function", "threeWayMethods._doFieldMatch should have been defined");
	}

	return function bindElem(elem) {
		var instanceId;

		if (!elem.getAttribute) {
			throw new Meteor.Error('unexpected-error-not-elem', elem);
		}

		if (!!elem.getAttributeNS(THREE_WAY_ATTRIBUTE_NAMESPACE, THREE_WAY_DATA_BINDING_ID)) {
			// Already data-bound
			if (IN_DEBUG_MODE_FOR('bind')) {
				var thisTemplateName = instance.view.name.split('.').pop().trim();
				Tracker.nonreactive(function() {
					instanceId = threeWay.instanceId.get();
				});
				console.warn("[bind] [" + Tracker.nonreactive(threeWayMethods.get3wInstanceId) + "] Not binding to " + instanceId + " (" + thisTemplateName + "). Element already bound.", elem);
			}
			return;
		}

		Tracker.nonreactive(function() {
			instanceId = threeWay.instanceId.get();
		});
		if (!instanceId) {
			instanceId = "~~id-unassigned~~";
		}
		if (!!elem.getAttributeNS(THREE_WAY_ATTRIBUTE_NAMESPACE, THREE_WAY_DATA_BINDING_INSTANCE)) {
			if (elem.getAttributeNS(THREE_WAY_ATTRIBUTE_NAMESPACE, THREE_WAY_DATA_BINDING_INSTANCE) !== instanceId) {
				// Already data-bound to other node
				return;
			}
		}

		var dataBind = elem.getAttribute(DATA_BIND_ATTRIBUTE);

		var elemBindings = {
			elem: elem,
			bindings: {}
		};
		var parseErrors = {};
		var haveParseErrors = false;
		dataBind.split(";").map(x => x.trim()).filter(x => x !== "").forEach(function(x) {
			var idxColon = x.indexOf(":");
			var itemNameSplit = x.substr(0, idxColon).split("#").map(x => x.trim().toLowerCase());
			var itemName = itemNameSplit[0];
			var itemOptions = _.object(itemNameSplit.splice(1).map(function(x) {
				var xs = x.split('-').map(y => y.trim());
				// Options whose arguments should be numbers
				if ((xs[0] === "debounce") || (xs[0] === "throttle")) {
					xs[1] = Number(xs[1]);
					if (Number.isNaN(xs[1])) {
						console.error('[ThreeWay] Binding parse error: ' + itemName, elem);
					}
				}
				if ((xs.length > 2) || (xs[0] === "")) {
					console.error('[ThreeWay] Binding parse error: ' + itemName, elem);
				}
				return [xs[0], (xs.length > 1) ? xs[1] : ""];
			}));
			var rawItemData = x.substr(idxColon + 1).trim();
			var itemData;

			var isDictType = (itemName === "class") || (itemName === "style") || (itemName === "attr") || (itemName === "event");
			if (isDictType) {
				if ((rawItemData[0] !== '{') || (rawItemData[rawItemData.length - 1] !== '}')) {
					console.error('[ThreeWay] Binding parse error: ' + itemName, elem);
					haveParseErrors = true;
					parseErrors[itemName] = rawItemData;
					return;
				}
				var objData = rawItemData
					.substr(1, rawItemData.length - 2)
					.split(",")
					.map(x => x.trim()).filter(x => x !== "")
					.map(x => x.split(":").map(y => y.trim()));
				var problematicItems = objData.filter(x => (x.length !== 2) || (x[0].length === 0) || (x[1].length === 0));
				if (problematicItems.length > 0) {
					console.error('[ThreeWay] Binding parse error: ' + itemName, problematicItems, elem);
					haveParseErrors = true;
					parseErrors[itemName] = rawItemData;
					return;
				}
				itemData = _.object(objData);

				_.forEach(itemData, function(v, f) {
					f.split("|")[0].split("#").forEach(function(_f) {
						doFieldMatch(_f);
					});
				});
			} else {
				itemData = rawItemData;
				if (itemData.length === 0) {
					console.error('[ThreeWay] Binding parse error: ' + itemName, itemData, elem);
					return;
				}
				itemData.split("|")[0].split("#").forEach(function(_f) {
					doFieldMatch(_f);
				});
			}

			elemBindings.bindings[itemName] = {
				isDictType: isDictType,
				source: itemData,
				itemOptions: itemOptions,
			};

			// Check value and checked for multivariate binding
			['value', 'checked', 'focus'].forEach(function(bindingType) {
				if (!!elemBindings.bindings[bindingType]) {
					var pipelineSplit = elemBindings.bindings[bindingType].source.split('|').map(x => x.trim()).filter(x => x !== "");
					var source = pipelineSplit[0];
					if (source.split("#").length > 1) {
						console.error('[ThreeWay] Binding parse error: Multivariate bindings not allowed for ' + bindingType + ' binding. Using first element.', elem);
						pipelineSplit[0] = source.split("#")[0];
						elemBindings.bindings[bindingType].source = pipelineSplit.join('|');
					}
				}
			});

			_.forEach(elemBindings.bindings, function(v, bindingType) {
				if ((bindingType !== "value") && (bindingType !== "checked")) {
					if (_.map(elemBindings.bindings[bindingType].itemOptions, () => 1).length > 0) {
						console.warn('[ThreeWay] Binding parse warning: Ignoring itemOptions for ' + bindingType + ' binding.', elemBindings.bindings[bindingType]);
						elemBindings.bindings[bindingType].itemOptions = {};
					}
				}
			});

		});

		if (IN_DEBUG_MODE_FOR('parse')) {
			console.log('[parse] [' + Tracker.nonreactive(threeWayMethods.get3wInstanceId) + '] Parsed:', elem, elemBindings);
		}

		if (IN_DEBUG_MODE_FOR('bindings')) {
			console.log("[bindings] [" + Tracker.nonreactive(threeWayMethods.get3wInstanceId) + "] Creating Bindings for ", elem, elemBindings.bindings);
		}

		//////////////////////////////////////////////////////
		// Dealing With Update Bindings
		//////////////////////////////////////////////////////

		var elemGlobals = {
			suppressChangesToSSOT: false
		};
		var boundElemComputations = [];
		var boundElemEventHandlers = [];
		var bindEventToThisElem = function bindEventToThisElem(eventName, handler) {
			$(elem).on(eventName, handler);
			boundElemEventHandlers.push({
				eventName: eventName,
				handler: handler
			});
		};


		//////////////////////////////////////////////////////
		// .value
		//////////////////////////////////////////////////////
		if (!!elemBindings.bindings.value) {

			var valueChangeHandler = function valueChangeHandler() { // function(event)
				var rawValue = $(elem).val();
				var value;
				var pipelineSplit = elemBindings.bindings.value.source.split('|').map(x => x.trim()).filter(x => x !== "");
				var fieldName = pipelineSplit[0];
				var curr_value = threeWayMethods.get(fieldName);

				if ((elem.tagName && elem.tagName.toLowerCase() || '') === 'input') {
					var inputType = elem.getAttribute('type') && elem.getAttribute('type').toLowerCase() || '';
					if (['number', 'range'].indexOf(inputType) !== -1) {
						value = Number(rawValue);
					} else if (['date', 'datetime-local'].indexOf(inputType) !== -1) {
						value = new Date(rawValue);
					} else if (inputType === 'month') {
						value = new Date(rawValue + '-01');
					} else {
						value = rawValue;
					}
				} else {
					value = rawValue;
				}
				if (IN_DEBUG_MODE_FOR('value')) {
					console.log('[.value] [' + Tracker.nonreactive(threeWayMethods.get3wInstanceId) + '] Change', elem);
					console.log('[.value] [' + Tracker.nonreactive(threeWayMethods.get3wInstanceId) + '] : ' + fieldName + '; data-bind | ' + dataBind);
				}

				if (elemGlobals.suppressChangesToSSOT) {
					if (IN_DEBUG_MODE_FOR('value')) {
						console.log('[.value] [' + Tracker.nonreactive(threeWayMethods.get3wInstanceId) + '] Change to S.S.o.T. Suppressed | ' + fieldName + ':', curr_value, ' (in mirror); Current:', value);
					}
				} else {
					if (value !== curr_value) {
						if (IN_DEBUG_MODE_FOR('value')) {
							console.log('[.value] [' + Tracker.nonreactive(threeWayMethods.get3wInstanceId) + '] Updating ' + fieldName + ':', curr_value, ' (in mirror); Current:', value);
						}
						threeWayMethods.set(fieldName, value);
						updateServerUpdatedStatus(fieldName);
					} else {
						if (IN_DEBUG_MODE_FOR('value')) {
							console.log('[.value] [' + Tracker.nonreactive(threeWayMethods.get3wInstanceId) + '] Unchanged value: ' + fieldName + ';', curr_value, '(in mirror)');
						}
					}
				}
			};

			// Apply options to changeHandler
			_.forEach(elemBindings.bindings.value.itemOptions, function(v, opt) {
				if (opt === "throttle") {
					if (IN_DEBUG_MODE_FOR('value')) {
						console.log("[.value] [" + Tracker.nonreactive(threeWayMethods.get3wInstanceId) + "] Binding with option " + opt + "=" + v + " for", elem);
					}
					valueChangeHandler = _.throttle(valueChangeHandler, v);
				}
				if (opt === "debounce") {
					if (IN_DEBUG_MODE_FOR('value')) {
						console.log("[.value] [" + Tracker.nonreactive(threeWayMethods.get3wInstanceId) + "] Binding with option " + opt + "=" + v + " for", elem);
					}
					valueChangeHandler = _.debounce(valueChangeHandler, v);
				}
			});

			// Bind change handler
			bindEventToThisElem('change', valueChangeHandler);
			if (!_.filter(elemBindings.bindings.value.itemOptions, (v, opt) => (opt === 'donotupdateon') && (v === 'input')).length) {
				// if not prevented from changing on input
				bindEventToThisElem('input', function changeTriggeredByInput() {
					$(elem).trigger('change');
				});
			}

			// Bind to additional events
			_.forEach(elemBindings.bindings.value.itemOptions, function(v, opt) {
				if (opt === "updateon") {
					if (IN_DEBUG_MODE_FOR('value')) {
						console.log("[.value] [" + Tracker.nonreactive(threeWayMethods.get3wInstanceId) + "] Binding with option " + opt + "=" + v + " for", elem);
					}
					bindEventToThisElem(v, function changeTriggeredByOtherEvent() {
						$(elem).trigger('change');
					});
				}
			});

			threeWay.computations.push(Tracker.autorun(function(c) {
				var pipelineSplit = elemBindings.bindings.value.source.split('|').map(x => x.trim()).filter(x => x !== "");
				var source = pipelineSplit[0];
				var pipeline = pipelineSplit.splice(1);

				if (c.firstRun) {
					if (IN_DEBUG_MODE_FOR('value')) {
						console.log("[.value] [" + Tracker.nonreactive(threeWayMethods.get3wInstanceId) + "] Preparing .value binding (to " + source + ") for", elem);
					}
				}

				elemGlobals.suppressChangesToSSOT = true;
				var value = processInTemplateContext(source, pipeline, elem, {
					useHelpers: false,
					processorsMutateValue: false,
					additionalFailureCondition: () => false,
					allowWholeDocumentAsSource: false,
				}); // helpers not used and pipelines do not manipulate value
				// Validate here
				var isValid = threeWay.validateInput(source, value);
				threeWay.__dataIsNotInvalid.set(source, isValid);

				var newValue;
				var inputType = elem.getAttribute('type') && elem.getAttribute('type').toLowerCase() || '';
				if (['number', 'range'].indexOf(inputType) !== -1) {
					newValue = value.toString();
				} else if (inputType === 'date') {
					newValue = ThreeWayDependencies.extras.transformations.dateToString(value);
				} else if (inputType === 'datetime-local') {
					newValue = ThreeWayDependencies.extras.transformations.datetimeToString(value);
				} else if (inputType === 'month') {
					newValue = ThreeWayDependencies.extras.transformations.dateToString(value).split('-').splice(0, 2).join('-');
				} else {
					newValue = value;
				}

				if (!_.isEqual($(elem).val(), newValue)) {
					$(elem).val(newValue);

					if (IN_DEBUG_MODE_FOR('value')) {
						console.log('[.value] [' + Tracker.nonreactive(threeWayMethods.get3wInstanceId) + '] Setting .value to \"' + newValue + '\" for', elem);
					}
				} else {
					if (IN_DEBUG_MODE_FOR('value')) {
						console.log('[.value] [' + Tracker.nonreactive(threeWayMethods.get3wInstanceId) + '] Not updating .value of', elem);
					}
				}
				elemGlobals.suppressChangesToSSOT = false;
			}));
			boundElemComputations.push(threeWay.computations[threeWay.computations.length - 1]);

			bindEventToThisElem('focus', function() {
				ThreeWayDependencies.utils.pushToEndOfEventQueue(function delayedFocusChange() {
					var pipelineSplit = elemBindings.bindings.value.source.split('|').map(x => x.trim()).filter(x => x !== "");
					var source = pipelineSplit[0];
					threeWay._focusedField.set(source);
				}, {});
			});
			bindEventToThisElem('focusout', function() {
				threeWay._focusedField.set(null);
			});
		}


		//////////////////////////////////////////////////////
		// .checked
		//////////////////////////////////////////////////////
		if (!!elemBindings.bindings.checked) {

			var checkedChangeHandler = function checkedChangeHandler() { // function(event)
				var elem_value = elem.value;
				var elem_checked = elem.checked;

				var fieldName = elemBindings.bindings.checked.source;
				var curr_value = threeWayMethods.get(fieldName);

				var new_value;
				var isRadio = elem.getAttribute('type').toLowerCase() === "radio";
				if (isRadio) {
					new_value = elem_value;
				} else {
					new_value = (_.isArray(curr_value) ? curr_value : []).map(x => x); // copy
					if (!elem_checked) {
						while (new_value.indexOf(elem_value) > -1) {
							new_value.splice(new_value.indexOf(elem_value), 1);
						}
					} else {
						if (new_value.indexOf(elem_value) === -1) {
							new_value.push(elem_value);
						}
					}
				}

				if (IN_DEBUG_MODE_FOR('checked')) {
					console.log('[.checked] [' + Tracker.nonreactive(threeWayMethods.get3wInstanceId) + '] Change', elem);
					console.log('[.checked] [' + Tracker.nonreactive(threeWayMethods.get3wInstanceId) + '] Field: ' + fieldName + '; data-bind | ' + dataBind);
					console.log('[.checked] [' + Tracker.nonreactive(threeWayMethods.get3wInstanceId) + '] data-bind | ' + dataBind);
				}

				if (elemGlobals.suppressChangesToSSOT) {
					if (IN_DEBUG_MODE_FOR('checked')) {
						console.log('[.checked] [' + Tracker.nonreactive(threeWayMethods.get3wInstanceId) + '] Change to S.S.o.T. Suppressed | ' + fieldName + ':', curr_value, ' (in mirror); Current:', new_value);
					}
				} else {
					if (!_.isEqual(new_value, curr_value)) {
						if (IN_DEBUG_MODE_FOR('checked')) {
							console.log('[.checked] [' + Tracker.nonreactive(threeWayMethods.get3wInstanceId) + '] Updating ' + fieldName + ':', curr_value, ' (in mirror); Current:', new_value);
						}
						threeWayMethods.set(fieldName, new_value);
						updateServerUpdatedStatus(fieldName);
					} else {
						if (IN_DEBUG_MODE_FOR('checked')) {
							console.log('[.checked] [' + Tracker.nonreactive(threeWayMethods.get3wInstanceId) + '] Unchanged value: ' + fieldName + ';', curr_value, '(in mirror)');
						}
					}
				}
			};

			// Apply options to changeHandler
			// _.forEach(elemBindings.bindings.checked.itemOptions, function(v, opt) {
			// 	if (opt === "throttle") {
			// 		if (IN_DEBUG_MODE_FOR('checked')) {
			// 			console.log("[.checked] [" + Tracker.nonreactive(threeWayMethods.get3wInstanceId) + "] Binding with option " + opt + "=" + v + " for", elem);
			// 		}
			// 		checkedChangeHandler = _.throttle(checkedChangeHandler, v);
			// 	}
			// 	if (opt === "debounce") {
			// 		if (IN_DEBUG_MODE_FOR('checked')) {
			// 			console.log("[.checked] [" + Tracker.nonreactive(threeWayMethods.get3wInstanceId) + "] Binding with option " + opt + "=" + v + " for", elem);
			// 		}
			// 		checkedChangeHandler = _.debounce(checkedChangeHandler, v);
			// 	}
			// });

			// Bind change handler
			bindEventToThisElem('change', checkedChangeHandler);

			// Bind to additional events
			_.forEach(elemBindings.bindings.checked.itemOptions, function(v, opt) {
				if (opt === "updateon") {
					if (IN_DEBUG_MODE_FOR('checked')) {
						console.log("[.checked] [" + Tracker.nonreactive(threeWayMethods.get3wInstanceId) + "] Binding with option " + opt + "=" + v + " for", elem);
					}
					bindEventToThisElem(v, function changeTriggeredByOtherEvent() {
						$(elem).trigger('change');
					});
				}
			});

			threeWay.computations.push(Tracker.autorun(function(c) {
				var pipelineSplit = elemBindings.bindings.checked.source.split('|').map(x => x.trim()).filter(x => x !== "");
				var source = pipelineSplit[0];
				var pipeline = pipelineSplit.splice(1);

				if (c.firstRun) {
					if (IN_DEBUG_MODE_FOR('checked')) {
						console.log("[.checked] [" + Tracker.nonreactive(threeWayMethods.get3wInstanceId) + "] Preparing .checked binding (to " + source + ") for", elem);
					}
				}

				elemGlobals.suppressChangesToSSOT = true;
				var value = processInTemplateContext(source, pipeline, elem, {
					useHelpers: false,
					processorsMutateValue: false,
					additionalFailureCondition: (elem.getAttribute('type').toLowerCase() === "radio") ? () => false : v => (typeof v !== "object") || (!(_.isArray(v))),
					allowWholeDocumentAsSource: false,
				});  // helpers not used and pipelines do not manipulate value

				// Validate here
				var isValid = threeWay.validateInput(source, value);
				threeWay.__dataIsNotInvalid.set(source, isValid);

				if (elem.getAttribute('type').toLowerCase() === "radio") {
					// Radio Button
					if (_.isEqual(elem.value, value)) {
						// Should be checked now
						if (!elem.checked) {
							elem.checked = true;
							if (IN_DEBUG_MODE_FOR('checked')) {
								console.log('[.checked] [' + Tracker.nonreactive(threeWayMethods.get3wInstanceId) + '] Setting .checked to ' + elem.checked + ' for', elem);
							}
						} else {
							if (IN_DEBUG_MODE_FOR('checked')) {
								console.log('[.checked] [' + Tracker.nonreactive(threeWayMethods.get3wInstanceId) + '] Not updating .checked of', elem);
							}
						}
					} else {
						// Should be unchecked now
						if (elem.checked) {
							elem.checked = false;
							if (IN_DEBUG_MODE_FOR('checked')) {
								console.log('[.checked] [' + Tracker.nonreactive(threeWayMethods.get3wInstanceId) + '] Setting .checked to ' + elem.checked + ' for', elem);
							}
						} else {
							if (IN_DEBUG_MODE_FOR('checked')) {
								console.log('[.checked] [' + Tracker.nonreactive(threeWayMethods.get3wInstanceId) + '] Not updating .checked of', elem);
							}
						}
					}
				} else if (elem.getAttribute('type').toLowerCase() === "checkbox") {
					// Check Boxes
					if ((!!value) && (value instanceof Array)) {
						if (value.indexOf(elem.value) > -1) {
							// Should be checked now
							if (!elem.checked) {
								elem.checked = true;
								if (IN_DEBUG_MODE_FOR('checked')) {
									console.log('[.checked] [' + Tracker.nonreactive(threeWayMethods.get3wInstanceId) + '] Setting .checked to ' + elem.checked + ' for', elem);
								}
							} else {
								if (IN_DEBUG_MODE_FOR('checked')) {
									console.log('[.checked] [' + Tracker.nonreactive(threeWayMethods.get3wInstanceId) + '] Not updating .checked of', elem);
								}
							}
						} else {
							// Should be unchecked now
							if (elem.checked) {
								elem.checked = false;
								if (IN_DEBUG_MODE_FOR('checked')) {
									console.log('[.checked] [' + Tracker.nonreactive(threeWayMethods.get3wInstanceId) + '] Setting .checked to ' + elem.checked + ' for', elem);
								}
							} else {
								if (IN_DEBUG_MODE_FOR('checked')) {
									console.log('[.checked] [' + Tracker.nonreactive(threeWayMethods.get3wInstanceId) + '] Not updating .checked of', elem);
								}
							}
						}
					} else {
						if (IN_DEBUG_MODE_FOR('checked')) {
							console.warn('[.checked] [' + Tracker.nonreactive(threeWayMethods.get3wInstanceId) + '] Not bound to an array:', elem);
						}
					}

				}

				elemGlobals.suppressChangesToSSOT = false;
			}));
			boundElemComputations.push(threeWay.computations[threeWay.computations.length - 1]);

			bindEventToThisElem('focus', function() {
				ThreeWayDependencies.utils.pushToEndOfEventQueue(function delayedFocusChange() {
					var pipelineSplit = elemBindings.bindings.checked.source.split('|').map(x => x.trim()).filter(x => x !== "");
					var source = pipelineSplit[0];
					threeWay._focusedField.set(source);
				}, {});
			});
			bindEventToThisElem('focusout', function() {
				threeWay._focusedField.set(null);
			});

		}


		//////////////////////////////////////////////////////
		// .ischecked
		//////////////////////////////////////////////////////
		if (!!elemBindings.bindings.ischecked) {

			var ischeckedChangeHandler = function ischeckedChangeHandler() { // function(event)
				var new_value = elem.checked;

				var fieldName = elemBindings.bindings.ischecked.source;
				var curr_value = threeWayMethods.get(fieldName);

				if (IN_DEBUG_MODE_FOR('checked')) {
					console.log('[.ischecked] [' + Tracker.nonreactive(threeWayMethods.get3wInstanceId) + '] Change', elem);
					console.log('[.ischecked] [' + Tracker.nonreactive(threeWayMethods.get3wInstanceId) + '] Field: ' + fieldName + '; data-bind | ' + dataBind);
					console.log('[.ischecked] [' + Tracker.nonreactive(threeWayMethods.get3wInstanceId) + '] data-bind | ' + dataBind);
				}

				if (elemGlobals.suppressChangesToSSOT) {
					if (IN_DEBUG_MODE_FOR('checked')) {
						console.log('[.ischecked] [' + Tracker.nonreactive(threeWayMethods.get3wInstanceId) + '] Change to S.S.o.T. Suppressed | ' + fieldName + ':', curr_value, ' (in mirror); Current:', new_value);
					}
				} else {
					if (!_.isEqual(new_value, curr_value)) {
						if (IN_DEBUG_MODE_FOR('checked')) {
							console.log('[.ischecked] [' + Tracker.nonreactive(threeWayMethods.get3wInstanceId) + '] Updating ' + fieldName + ':', curr_value, ' (in mirror); Current:', new_value);
						}
						threeWayMethods.set(fieldName, new_value);
						updateServerUpdatedStatus(fieldName);
					} else {
						if (IN_DEBUG_MODE_FOR('checked')) {
							console.log('[.ischecked] [' + Tracker.nonreactive(threeWayMethods.get3wInstanceId) + '] Unchanged value: ' + fieldName + ';', curr_value, '(in mirror)');
						}
					}
				}

				if (elem.getAttribute('type').toLowerCase() === "radio") {
					// trigger change on "non-receiving" radios
					var name = elem.name;
					if (!!name && elem.checked) {
						instance.$('[type=radio][name=' + name + ']').each(function() {
							if (this !== elem) {
								instance.$(this).trigger('change');
							}
						});
					}
				}
			};

			// Bind change handler
			bindEventToThisElem('change', ischeckedChangeHandler);

			// Bind to additional events
			_.forEach(elemBindings.bindings.ischecked.itemOptions, function(v, opt) {
				if (opt === "updateon") {
					if (IN_DEBUG_MODE_FOR('checked')) {
						console.log("[.ischecked] [" + Tracker.nonreactive(threeWayMethods.get3wInstanceId) + "] Binding with option " + opt + "=" + v + " for", elem);
					}
					bindEventToThisElem(v, function changeTriggeredByOtherEvent() {
						$(elem).trigger('change');
					});
				}
			});

			threeWay.computations.push(Tracker.autorun(function(c) {
				var pipelineSplit = elemBindings.bindings.ischecked.source.split('|').map(x => x.trim()).filter(x => x !== "");
				var source = pipelineSplit[0];
				var pipeline = pipelineSplit.splice(1);

				if (c.firstRun) {
					if (IN_DEBUG_MODE_FOR('checked')) {
						console.log("[.ischecked] [" + Tracker.nonreactive(threeWayMethods.get3wInstanceId) + "] Preparing .checked binding (to " + source + ") for", elem);
					}
				}

				elemGlobals.suppressChangesToSSOT = true;
				var ischecked = !!processInTemplateContext(source, pipeline, elem, {
					useHelpers: false,
					processorsMutateValue: false,
					allowWholeDocumentAsSource: false,
				});  // helpers not used and pipelines do not manipulate value

				// Validate here
				var isValid = threeWay.validateInput(source, ischecked);
				threeWay.__dataIsNotInvalid.set(source, isValid);

				// Check Boxes
				if (elem.checked) {
					// Should be checked now
					if (ischecked) {
						if (IN_DEBUG_MODE_FOR('checked')) {
							console.log('[.ischecked] [' + Tracker.nonreactive(threeWayMethods.get3wInstanceId) + '] Not updating .checked of', elem);
						}
					} else {
						elem.checked = false;
						if (IN_DEBUG_MODE_FOR('checked')) {
							console.log('[.ischecked] [' + Tracker.nonreactive(threeWayMethods.get3wInstanceId) + '] Setting .checked to ' + elem.checked + ' for', elem);
						}
					}
				} else {
					// Should be unchecked now
					if (ischecked) {
						elem.checked = true;
						if (IN_DEBUG_MODE_FOR('checked')) {
							console.log('[.ischecked] [' + Tracker.nonreactive(threeWayMethods.get3wInstanceId) + '] Setting .checked to ' + elem.checked + ' for', elem);
						}
					} else {
						if (IN_DEBUG_MODE_FOR('checked')) {
							console.log('[.ischecked] [' + Tracker.nonreactive(threeWayMethods.get3wInstanceId) + '] Not updating .checked of', elem);
						}
					}
				}

				elemGlobals.suppressChangesToSSOT = false;
			}));
			boundElemComputations.push(threeWay.computations[threeWay.computations.length - 1]);

			bindEventToThisElem('focus', function() {
				ThreeWayDependencies.utils.pushToEndOfEventQueue(function delayedFocusChange() {
					var pipelineSplit = elemBindings.bindings.ischecked.source.split('|').map(x => x.trim()).filter(x => x !== "");
					var source = pipelineSplit[0];
					threeWay._focusedField.set(source);
				}, {});
			});
			bindEventToThisElem('focusout', function() {
				threeWay._focusedField.set(null);
			});

		}


		//////////////////////////////////////////////////////
		// .focus
		//////////////////////////////////////////////////////
		if (!!elemBindings.bindings.focus) {

			var focusChangeHandler = function focusChangeHandler(event) {
				event.preventDefault();

				var focus = elem === document.activeElement;
				var pipelineSplit = elemBindings.bindings.focus.source.split('|').map(x => x.trim()).filter(x => x !== "");
				var fieldName = pipelineSplit[0];
				var curr_value = !!threeWayMethods.get(fieldName);

				if (IN_DEBUG_MODE_FOR('focus')) {
					console.log('[.focus] [' + Tracker.nonreactive(threeWayMethods.get3wInstanceId) + '] Focus Change', elem);
					console.log('[.focus] [' + Tracker.nonreactive(threeWayMethods.get3wInstanceId) + '] Field: ' + fieldName + '; data-bind | ' + dataBind);
				}

				if (elemGlobals.suppressChangesToSSOT) {
					if (IN_DEBUG_MODE_FOR('focus')) {
						console.log('[.focus] [' + Tracker.nonreactive(threeWayMethods.get3wInstanceId) + '] Change to S.S.o.T. Suppressed | ' + fieldName + ':', curr_value, ' (in mirror); Current:', focus);
					}
				} else {
					if (focus !== curr_value) {
						if (IN_DEBUG_MODE_FOR('focus')) {
							console.log('[.focus] [' + Tracker.nonreactive(threeWayMethods.get3wInstanceId) + '] Updating ' + fieldName + ':', curr_value, ' (in mirror); Current:', focus);
						}
						threeWayMethods.set(fieldName, focus);
						updateServerUpdatedStatus(fieldName);
					} else {
						if (IN_DEBUG_MODE_FOR('focus')) {
							console.log('[.focus] [' + Tracker.nonreactive(threeWayMethods.get3wInstanceId) + '] Unchanged focus: ' + fieldName + ';', curr_value, '(in mirror)');
						}
					}
				}
			};

			bindEventToThisElem('focus', focusChangeHandler);
			bindEventToThisElem('focusout', focusChangeHandler);

			threeWay.computations.push(Tracker.autorun(function(c) {
				var pipelineSplit = elemBindings.bindings.focus.source.split('|').map(x => x.trim()).filter(x => x !== "");
				var source = pipelineSplit[0];
				var pipeline = pipelineSplit.splice(1);

				if (c.firstRun) {
					if (IN_DEBUG_MODE_FOR('focus')) {
						console.log("[.focus] [" + Tracker.nonreactive(threeWayMethods.get3wInstanceId) + "] Preparing .focus binding (to " + source + ") for", elem);
					}
				}

				elemGlobals.suppressChangesToSSOT = true;
				var focus = !!processInTemplateContext(source, pipeline, elem, {
					useHelpers: false,
					processorsMutateValue: false,
					additionalFailureCondition: () => false,
					allowWholeDocumentAsSource: false,
				});  // helpers not used and pipelines do not manipulate value

				// Validate here
				var isValid = threeWay.validateInput(source, focus);
				threeWay.__dataIsNotInvalid.set(source, isValid);

				if ((elem === document.activeElement) !== focus) {
					if (focus) {
						$(elem).focus();
					} else {
						$(elem).blur();
					}
					if (IN_DEBUG_MODE_FOR('value')) {
						console.log('[.focus] [' + Tracker.nonreactive(threeWayMethods.get3wInstanceId) + '] Setting .focus to \"' + focus + '\" for', elem);
					}
				} else {
					if (IN_DEBUG_MODE_FOR('focus')) {
						console.log('[.focus] [' + Tracker.nonreactive(threeWayMethods.get3wInstanceId) + '] Not updating .focus of', elem);
					}
				}
				elemGlobals.suppressChangesToSSOT = false;
			}));
			boundElemComputations.push(threeWay.computations[threeWay.computations.length - 1]);

		}


		//////////////////////////////////////////////////////
		// .html
		//////////////////////////////////////////////////////
		if (!!elemBindings.bindings.html) {
			threeWay.computations.push(Tracker.autorun(function(c) {
				var pipelineSplit = elemBindings.bindings.html.source.split('|').map(x => x.trim()).filter(x => x !== "");
				var source = pipelineSplit[0];
				var mappings = pipelineSplit.splice(1);

				if (c.firstRun) {
					if (IN_DEBUG_MODE_FOR('html-text')) {
						console.log("[.html] [" + Tracker.nonreactive(threeWayMethods.get3wInstanceId) + "] Preparing .html binding for", elem);
						console.log("[.html] [" + Tracker.nonreactive(threeWayMethods.get3wInstanceId) + "] Field: " + source + "; Mappings: ", mappings);
					}
				}

				var html = processInTemplateContext(source, mappings, elem);

				if (elem.innerHTML !== html) {
					if (IN_DEBUG_MODE_FOR('html-text')) {
						console.log('[.html] [' + Tracker.nonreactive(threeWayMethods.get3wInstanceId) + '] Setting .innerHTML to \"' + html + '\" for', elem);
					}
					elem.innerHTML = html;
				}
			}));
			boundElemComputations.push(threeWay.computations[threeWay.computations.length - 1]);
		}

		//////////////////////////////////////////////////////
		// .text
		//////////////////////////////////////////////////////
		if (!!elemBindings.bindings.text) {
			threeWay.computations.push(Tracker.autorun(function(c) {
				var pipelineSplit = elemBindings.bindings.text.source.split('|').map(x => x.trim()).filter(x => x !== "");
				var source = pipelineSplit[0];
				var mappings = pipelineSplit.splice(1);

				if (c.firstRun) {
					if (IN_DEBUG_MODE_FOR('html-text')) {
						console.log("[.text] [" + Tracker.nonreactive(threeWayMethods.get3wInstanceId) + "] Preparing .text binding for", elem);
						console.log("[.text] [" + Tracker.nonreactive(threeWayMethods.get3wInstanceId) + "] Field: " + source + "; Mappings: ", mappings);
					}
				}

				var text = processInTemplateContext(source, mappings, elem);

				if ($(elem).text() !== text) {
					if (IN_DEBUG_MODE_FOR('html-text')) {
						console.log('[.text] [' + Tracker.nonreactive(threeWayMethods.get3wInstanceId) + '] Setting .text to \"' + text + '\" for', elem);
					}
					$(elem).text(text);
				}
			}));
			boundElemComputations.push(threeWay.computations[threeWay.computations.length - 1]);
		}

		//////////////////////////////////////////////////////
		// "process"
		//////////////////////////////////////////////////////
		if (!!elemBindings.bindings.process) {
			threeWay.computations.push(Tracker.autorun(function(c) {
				var pipelineSplit = elemBindings.bindings.process.source.split('|').map(x => x.trim()).filter(x => x !== "");
				var source = pipelineSplit[0];
				var mappings = pipelineSplit.splice(1);

				if (c.firstRun) {
					if (IN_DEBUG_MODE_FOR('process')) {
						console.log("[process] [" + Tracker.nonreactive(threeWayMethods.get3wInstanceId) + "] Preparing \"process\" binding with " + source + " for", elem);
					}
				}

				processInTemplateContext(source, mappings, elem, {
					useHelpers: true,
					processorsMutateValue: true,
					additionalFailureCondition: () => false,
					allowWholeDocumentAsSource: true
				});
			}));
			boundElemComputations.push(threeWay.computations[threeWay.computations.length - 1]);
		}

		//////////////////////////////////////////////////////
		// .styles
		//////////////////////////////////////////////////////
		if (!!elemBindings.bindings.styles) {
			threeWay.computations.push(Tracker.autorun(function(c) {
				var pipelineSplit = elemBindings.bindings.styles.source.split('|').map(x => x.trim()).filter(x => x !== "");
				var source = pipelineSplit[0];
				var mappings = pipelineSplit.splice(1);

				if (c.firstRun) {
					if (IN_DEBUG_MODE_FOR('style')) {
						console.log("[.styles] [" + Tracker.nonreactive(threeWayMethods.get3wInstanceId) + "] Preparing .styles binding with " + source + " for", elem);
					}
				}

				var styles = processInTemplateContext(source, mappings, elem);
				styles = _.isObject(styles) ? styles : {};

				if (IN_DEBUG_MODE_FOR('style')) {
					console.log('[.styles] [' + Tracker.nonreactive(threeWayMethods.get3wInstanceId) + '] Setting styles.', styles, elem);
				}
				_.forEach(styles, function(v, k) {
					elem.style[k] = v;
				});
			}));
			boundElemComputations.push(threeWay.computations[threeWay.computations.length - 1]);
		}

		//////////////////////////////////////////////////////
		// .classes
		//////////////////////////////////////////////////////
		if (!!elemBindings.bindings.classes) {
			threeWay.computations.push(Tracker.autorun(function(c) {
				var pipelineSplit = elemBindings.bindings.classes.source.split('|').map(x => x.trim()).filter(x => x !== "");
				var source = pipelineSplit[0];
				var mappings = pipelineSplit.splice(1);

				if (c.firstRun) {
					if (IN_DEBUG_MODE_FOR('class')) {
						console.log("[.classes] [" + Tracker.nonreactive(threeWayMethods.get3wInstanceId) + "] Preparing .classes binding with " + source + " for", elem);
					}
				}

				var classes = processInTemplateContext(source, mappings, elem);
				classes = _.isObject(classes) ? classes : {};

				if (IN_DEBUG_MODE_FOR('class')) {
					console.log('[.classes] [' + Tracker.nonreactive(threeWayMethods.get3wInstanceId) + '] Setting classes.', classes, elem);
				}
				_.forEach(classes, function(v, k) {
					if (v) {
						$(elem).addClass(k);
					} else {
						$(elem).removeClass(k);
					}
				});
			}));
			boundElemComputations.push(threeWay.computations[threeWay.computations.length - 1]);
		}

		//////////////////////////////////////////////////////
		// .attributes
		//////////////////////////////////////////////////////
		if (!!elemBindings.bindings.attributes) {
			threeWay.computations.push(Tracker.autorun(function(c) {
				var pipelineSplit = elemBindings.bindings.attributes.source.split('|').map(x => x.trim()).filter(x => x !== "");
				var source = pipelineSplit[0];
				var mappings = pipelineSplit.splice(1);

				if (c.firstRun) {
					if (IN_DEBUG_MODE_FOR('attr')) {
						console.log("[.attributes] [" + Tracker.nonreactive(threeWayMethods.get3wInstanceId) + "] Preparing .attributes binding with " + source + " for", elem);
					}
				}

				var attributes = processInTemplateContext(source, mappings, elem);
				attributes = _.isObject(attributes) ? attributes : {};

				if (IN_DEBUG_MODE_FOR('attr')) {
					console.log('[.attributes] [' + Tracker.nonreactive(threeWayMethods.get3wInstanceId) + '] Setting attributes.', attributes, elem);
				}
				_.forEach(attributes, function(v, k) {
					if ((v === null) || (typeof v === "undefined")) {
						$(elem).removeAttr(k);
					} else {
						$(elem).attr(k, v);
					}
				});
			}));
			boundElemComputations.push(threeWay.computations[threeWay.computations.length - 1]);
		}

		//////////////////////////////////////////////////////
		// .visible
		//////////////////////////////////////////////////////
		if (!!elemBindings.bindings.visible) {
			threeWay.computations.push(Tracker.autorun(function(c) {
				var pipelineSplit = elemBindings.bindings.visible.source.split('|').map(x => x.trim()).filter(x => x !== "");
				var source = pipelineSplit[0];
				var mappings = pipelineSplit.splice(1);

				if (c.firstRun) {
					if (IN_DEBUG_MODE_FOR('visible-and-disabled')) {
						console.log("[.visible] [" + Tracker.nonreactive(threeWayMethods.get3wInstanceId) + "] Preparing .visible binding with " + source + " for", elem);
					}
				}

				var visible = processInTemplateContext(source, mappings, elem);
				visible = (!!visible) ? "" : "none";

				if (elem.style.display !== visible) {
					if (IN_DEBUG_MODE_FOR('visible-and-disabled')) {
						console.log('[.visible] [' + Tracker.nonreactive(threeWayMethods.get3wInstanceId) + '] Setting .style[visible] to \"' + visible + '\" for', elem);
					}
					elem.style.display = visible;
				}
			}));
			boundElemComputations.push(threeWay.computations[threeWay.computations.length - 1]);
		}

		//////////////////////////////////////////////////////
		// .disabled
		//////////////////////////////////////////////////////
		if (!!elemBindings.bindings.disabled) {
			threeWay.computations.push(Tracker.autorun(function(c) {
				var pipelineSplit = elemBindings.bindings.disabled.source.split('|').map(x => x.trim()).filter(x => x !== "");
				var source = pipelineSplit[0];
				var mappings = pipelineSplit.splice(1);

				if (c.firstRun) {
					if (IN_DEBUG_MODE_FOR('visible-and-disabled')) {
						console.log("[.disabled] [" + Tracker.nonreactive(threeWayMethods.get3wInstanceId) + "] Preparing .disabled binding with " + source + " for", elem);
					}
				}

				var disabled = processInTemplateContext(source, mappings, elem);
				disabled = (!!disabled);

				if (elem.disabled !== disabled) {
					if (IN_DEBUG_MODE_FOR('visible-and-disabled')) {
						console.log('[.disabled] [' + Tracker.nonreactive(threeWayMethods.get3wInstanceId) + '] Setting .disabled to \"' + disabled + '\" for', elem);
					}
					elem.disabled = disabled;
				}
			}));
			boundElemComputations.push(threeWay.computations[threeWay.computations.length - 1]);
		}

		//////////////////////////////////////////////////////
		// style
		//////////////////////////////////////////////////////
		if (!!elemBindings.bindings.style) {
			_.forEach(elemBindings.bindings.style.source, function(pipelineString, key) {
				threeWay.computations.push(Tracker.autorun(function(c) {
					var pipelineSplit = pipelineString.split('|').map(x => x.trim()).filter(x => x !== "");
					var source = pipelineSplit[0];
					var mappings = pipelineSplit.splice(1);

					if (c.firstRun) {
						if (IN_DEBUG_MODE_FOR('style')) {
							console.log("[.style|" + key + "] [" + Tracker.nonreactive(threeWayMethods.get3wInstanceId) + "] Preparing .style binding for", elem);
							console.log("[.style|" + key + "] [" + Tracker.nonreactive(threeWayMethods.get3wInstanceId) + "] Field: " + source + "; Mappings: ", mappings);
						}
					}

					var value = processInTemplateContext(source, mappings, elem);

					// Update Style
					if (elem.style[key] !== value) {
						if (IN_DEBUG_MODE_FOR('style')) {
							console.log('[.style|' + key + '] [' + Tracker.nonreactive(threeWayMethods.get3wInstanceId) + '] Setting style.' + key + ' to \"' + value + '\" for', elem);
						}
						elem.style[key] = value;
					}
				}));
				boundElemComputations.push(threeWay.computations[threeWay.computations.length - 1]);
			});
		}

		//////////////////////////////////////////////////////
		// attr
		//////////////////////////////////////////////////////
		if (!!elemBindings.bindings.attr) {
			_.forEach(elemBindings.bindings.attr.source, function(pipelineString, key) {
				threeWay.computations.push(Tracker.autorun(function(c) {
					var pipelineSplit = pipelineString.split('|').map(x => x.trim()).filter(x => x !== "");
					var source = pipelineSplit[0];
					var mappings = pipelineSplit.splice(1);

					if (c.firstRun) {
						if (IN_DEBUG_MODE_FOR('attr')) {
							console.log("[.attr|" + key + "] [" + Tracker.nonreactive(threeWayMethods.get3wInstanceId) + "] Preparing attribute binding for", elem);
							console.log("[.attr|" + key + "] [" + Tracker.nonreactive(threeWayMethods.get3wInstanceId) + "] Field: " + source + "; Mappings: ", mappings);
						}
					}

					var value = processInTemplateContext(source, mappings, elem);

					// Update Attr
					if ($(elem).attr(key) !== value) {
						if (IN_DEBUG_MODE_FOR('attr')) {
							console.log('[.attr|' + key + '] [' + Tracker.nonreactive(threeWayMethods.get3wInstanceId) + '] Setting attribute ' + key + ' to \"' + value + '\" for', elem);
						}
						if ((value === null) || (typeof value === "undefined")) {
							$(elem).removeAttr(key);
						} else {
							$(elem).attr(key, value);
						}
					}
				}));
				boundElemComputations.push(threeWay.computations[threeWay.computations.length - 1]);
			});
		}

		//////////////////////////////////////////////////////
		// class
		//////////////////////////////////////////////////////
		if (!!elemBindings.bindings.class) {
			_.forEach(elemBindings.bindings.class.source, function(pipelineString, key) {
				threeWay.computations.push(Tracker.autorun(function(c) {
					var pipelineSplit = pipelineString.split('|').map(x => x.trim()).filter(x => x !== "");
					var source = pipelineSplit[0];
					var mappings = pipelineSplit.splice(1);

					if (c.firstRun) {
						if (IN_DEBUG_MODE_FOR('class')) {
							console.log("[.class|" + key + "] [" + Tracker.nonreactive(threeWayMethods.get3wInstanceId) + "] Preparing class binding for", elem);
							console.log("[.class|" + key + "] [" + Tracker.nonreactive(threeWayMethods.get3wInstanceId) + "] Field: " + source + "; Mappings: ", mappings);
						}
					}

					var value = processInTemplateContext(source, mappings, elem);
					value = (!!value);

					// Update Style
					if ($(elem).hasClass(key) !== value) {
						if (IN_DEBUG_MODE_FOR('class')) {
							console.log('[.class|' + key + '] [' + Tracker.nonreactive(threeWayMethods.get3wInstanceId) + '] Setting class ' + key + ' to \"' + value + '\" for', elem);
						}
						if (value) {
							$(elem).addClass(key);
						} else {
							$(elem).removeClass(key);
						}
					}
				}));
				boundElemComputations.push(threeWay.computations[threeWay.computations.length - 1]);
			});
		}

		//////////////////////////////////////////////////////
		// event
		//////////////////////////////////////////////////////
		if (!!elemBindings.bindings.event) {
			_.forEach(elemBindings.bindings.event.source, function(handlerString, eventName) {
				threeWay.computations.push(Tracker.autorun(function(c) {
					var handlerNames = handlerString.split('|').map(x => x.trim()).filter(x => x !== "");

					if (c.firstRun) {
						if (IN_DEBUG_MODE_FOR('event')) {
							console.log("[.event|" + eventName + "] [" + Tracker.nonreactive(threeWayMethods.get3wInstanceId) + "] Preparing event binding for", elem);
							console.log("[.event|" + eventName + "] [" + Tracker.nonreactive(threeWayMethods.get3wInstanceId) + "] Handlers: ", handlerNames);
						}
					}

					handlerNames.forEach(function(m) {
						var handler = threeWayMethods.getInheritedEventHandler(m);
						if (!_.isFunction(handler)) {
							console.error('[ThreeWay] [' + Tracker.nonreactive(threeWayMethods.get3wInstanceId) + '] No such event handler: ' + m, elem);
							return;
						}
						var compositeHandlerUsed = false;

						_.forEach({
							'backspaceKey': 8,
							'tabKey': 9,
							'returnKey': 13,
							'escapeKey': 27,
							'pageUpKey': 33,
							'pageDownKey': 34,
							'endKey': 35,
							'homeKey': 36,
							'leftArrowKey': 37,
							'upArrowKey': 38,
							'rightArrowKey': 39,
							'downArrowKey': 40,
							'insertKey': 45,
							'deleteKey': 46,
							'f1Key': 112,
							'f2Key': 113,
							'f3Key': 114,
							'f4Key': 115,
							'f5Key': 116,
							'f6Key': 117,
							'f7Key': 118,
							'f8Key': 119,
							'f9Key': 120,
							'f10Key': 121,
							'f11Key': 122,
							'f12Key': 123,
						}, function(key, _eventName) {
							if ((eventName.toLowerCase() === _eventName.toLowerCase()) || (eventName.toLowerCase() === 'keyup_' + _eventName.toLowerCase())) {
								bindEventToThisElem('keyup', ThreeWayDependencies.extras.eventGenerators.keypressHandlerGenerator(function(event) {
									if (IN_DEBUG_MODE_FOR('event')) {
										console.log("[.event|keyup=" + _eventName + "] [" + Tracker.nonreactive(threeWayMethods.get3wInstanceId) + "] Firing " + m + " for", elem);
									}
									instance.callFunctionWithTemplateContext(function() {
										handler.call(this, event, instance, threeWayMethods.getAll_NR());
									}, this);
								}, [key]));
								compositeHandlerUsed = true;
							} else if (eventName.toLowerCase() === 'keydown_' + _eventName.toLowerCase()) {
								bindEventToThisElem('keydown', ThreeWayDependencies.extras.eventGenerators.keypressHandlerGenerator(function(event) {
									if (IN_DEBUG_MODE_FOR('event')) {
										console.log("[.event|keydown=" + _eventName + "] [" + Tracker.nonreactive(threeWayMethods.get3wInstanceId) + "] Firing " + m + " for", elem);
									}
									instance.callFunctionWithTemplateContext(function() {
										handler.call(this, event, instance, threeWayMethods.getAll_NR());
									}, this);
								}, [key]));
								compositeHandlerUsed = true;
							}
						});

						if (compositeHandlerUsed) {
							return;
						}

						bindEventToThisElem(eventName, function(event) {
							if (IN_DEBUG_MODE_FOR('event')) {
								console.log("[.event|" + eventName + "] [" + Tracker.nonreactive(threeWayMethods.get3wInstanceId) + "] Firing " + m + " for", elem);
							}
							instance.callFunctionWithTemplateContext(function() {
								handler.call(this, event, instance, threeWayMethods.getAll_NR());
							}, this);
						});
					});
				}));
				boundElemComputations.push(threeWay.computations[threeWay.computations.length - 1]);
			});
		}
		//////////////////////////////////////////////////////


		var thisElemId = ThreeWayDependencies.utils.getNewId();
		elem.setAttributeNS(THREE_WAY_ATTRIBUTE_NAMESPACE, THREE_WAY_DATA_BINDING_ID, thisElemId);
		Tracker.autorun(function(c) {
			var instanceId = threeWay.instanceId.get();
			if (!!instanceId) {
				if (IN_DEBUG_MODE_FOR('bind')) {
					console.log("[bind] [" + Tracker.nonreactive(threeWayMethods.get3wInstanceId) + "] Element bound to " + instanceId + " (twbId: " + elem.getAttributeNS(THREE_WAY_ATTRIBUTE_NAMESPACE, THREE_WAY_DATA_BINDING_ID) + ")", elem);
				}
				elem.setAttributeNS(THREE_WAY_ATTRIBUTE_NAMESPACE, THREE_WAY_DATA_BINDING_INSTANCE, instanceId);
				c.stop();
			}
		});
		threeWay.boundElemComputations[thisElemId] = boundElemComputations;
		threeWay.boundElemEventHandlers[thisElemId] = boundElemComputations;
	};
};
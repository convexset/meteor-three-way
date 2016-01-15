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

	var updateRelatedFields = ThreeWayDependencies.instanceUtils.generateUpdateRelatedFieldsFunction(options, instance);
	var updateServerUpdatedStatus = ThreeWayDependencies.instanceUtils.generateUpdateServerUpdatedStatusFunction(options, instance);
	var doFieldMatch = threeWayMethods._doFieldMatch;
	var processInTemplateContext = threeWayMethods._processInTemplateContext;

	if (typeof doFieldMatch === "undefined") {
		// for debugging in future... just in case...
		throw new Meteor.Error("missing-function", "threeWayMethods._doFieldMatch should have been defined");
	}

	return function bindElem(elem) {
		if (!elem.getAttribute) {
			throw new Meteor.Error('unexpected-error-not-elem', elem);
		}

		if (!!elem.getAttributeNS(THREE_WAY_ATTRIBUTE_NAMESPACE, THREE_WAY_DATA_BINDING_ID)) {
			// Already data-bound
			return;
		}

		var instanceId;
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
			console.log('[parse] Parsed:', elem, elemBindings);
		}

		if (IN_DEBUG_MODE_FOR('bindings')) {
			console.log("[bindings] Creating Bindings for ", elem, elemBindings.bindings);
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
					} else if (['date', 'datetime-local', 'month'].indexOf(inputType) !== -1) {
						value = new Date(rawValue);
					} else {
						value = rawValue;
					}
				} else {
					value = rawValue;
				}

				if (IN_DEBUG_MODE_FOR('value')) {
					console.log('[.value] Change', elem);
					console.log('[.value] Field: ' + fieldName + '; data-bind | ' + dataBind);
				}

				if (elemGlobals.suppressChangesToSSOT) {
					if (IN_DEBUG_MODE_FOR('value')) {
						console.log('[.value] Change to S.S.o.T. Suppressed | ' + fieldName + ':', curr_value, ' (in mirror); Current:', value);
					}
				} else {
					if (value !== curr_value) {
						if (IN_DEBUG_MODE_FOR('value')) {
							console.log('[.value] Updating ' + fieldName + ':', curr_value, ' (in mirror); Current:', value);
						}
						threeWayMethods.set(fieldName, value);
						updateServerUpdatedStatus(fieldName);
					} else {
						if (IN_DEBUG_MODE_FOR('value')) {
							console.log('[.value] Unchanged value: ' + fieldName + ';', curr_value, '(in mirror)');
						}
					}
				}
			};

			// Apply options to changeHandler
			_.forEach(elemBindings.bindings.value.itemOptions, function(v, opt) {
				if (opt === "throttle") {
					if (IN_DEBUG_MODE_FOR('value')) {
						console.log("[.value] Binding with option " + opt + "=" + v + " for", elem);
					}
					valueChangeHandler = _.throttle(valueChangeHandler, v);
				}
				if (opt === "debounce") {
					if (IN_DEBUG_MODE_FOR('value')) {
						console.log("[.value] Binding with option " + opt + "=" + v + " for", elem);
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
						console.log("[.value] Binding with option " + opt + "=" + v + " for", elem);
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
						console.log("[.value] Preparing .value binding (to " + source + ") for", elem);
					}
				}

				elemGlobals.suppressChangesToSSOT = true;
				var value = processInTemplateContext(source, pipeline, elem, {
					useHelpers: false,
					processorsMutateValue: false,
					additionalFailureCondition: () => false,
					allowWholeDocumentAsSource: false,
				});  // helpers not used and pipelines do not manipulate value

				// Validate here
				var isValid = threeWay.validateInput(source, value);
				threeWay.__dataIsNotInvalid.set(source, isValid);

				if (!_.isEqual($(elem).val(), value)) {
					$(elem).val(value);
					if (IN_DEBUG_MODE_FOR('value')) {
						console.log('[.value] Setting .value to \"' + value + '\" for', elem);
					}
				} else {
					if (IN_DEBUG_MODE_FOR('value')) {
						console.log('[.value] Not updating .value of', elem);
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
					console.log('[.checked] Change', elem);
					console.log('[.checked] Field: ' + fieldName + '; data-bind | ' + dataBind);
					console.log('[.checked] data-bind | ' + dataBind);
				}

				if (elemGlobals.suppressChangesToSSOT) {
					if (IN_DEBUG_MODE_FOR('checked')) {
						console.log('[.checked] Change to S.S.o.T. Suppressed | ' + fieldName + ':', curr_value, ' (in mirror); Current:', new_value);
					}
				} else {
					if (!_.isEqual(new_value, curr_value)) {
						if (IN_DEBUG_MODE_FOR('checked')) {
							console.log('[.checked] Updating ' + fieldName + ':', curr_value, ' (in mirror); Current:', new_value);
						}
						threeWayMethods.set(fieldName, new_value);
						updateServerUpdatedStatus(fieldName);
					} else {
						if (IN_DEBUG_MODE_FOR('checked')) {
							console.log('[.checked] Unchanged value: ' + fieldName + ';', curr_value, '(in mirror)');
						}
					}
				}
			};

			// Apply options to changeHandler
			// _.forEach(elemBindings.bindings.checked.itemOptions, function(v, opt) {
			// 	if (opt === "throttle") {
			// 		if (IN_DEBUG_MODE_FOR('checked')) {
			// 			console.log("[.checked] Binding with option " + opt + "=" + v + " for", elem);
			// 		}
			// 		checkedChangeHandler = _.throttle(checkedChangeHandler, v);
			// 	}
			// 	if (opt === "debounce") {
			// 		if (IN_DEBUG_MODE_FOR('checked')) {
			// 			console.log("[.checked] Binding with option " + opt + "=" + v + " for", elem);
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
						console.log("[.checked] Binding with option " + opt + "=" + v + " for", elem);
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
						console.log("[.checked] Preparing .checked binding (to " + source + ") for", elem);
					}
				}

				elemGlobals.suppressChangesToSSOT = true;
				var value = processInTemplateContext(source, pipeline, elem, {
					useHelpers: false,
					processorsMutateValue: false,
					additionalFailureCondition: (elem.getAttribute('type').toLowerCase() === "radio") ? () => false : v => (typeof v !== "object") || (!(v instanceof Array)),
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
								console.log('[.checked] Setting .checked to ' + elem.checked + ' for', elem);
							}
						} else {
							if (IN_DEBUG_MODE_FOR('checked')) {
								console.log('[.checked] Not updating .checked of', elem);
							}
						}
					} else {
						// Should be unchecked now
						if (elem.checked) {
							elem.checked = false;
							if (IN_DEBUG_MODE_FOR('checked')) {
								console.log('[.checked] Setting .checked to ' + elem.checked + ' for', elem);
							}
						} else {
							if (IN_DEBUG_MODE_FOR('checked')) {
								console.log('[.checked] Not updating .checked of', elem);
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
									console.log('[.checked] Setting .checked to ' + elem.checked + ' for', elem);
								}
							} else {
								if (IN_DEBUG_MODE_FOR('checked')) {
									console.log('[.checked] Not updating .checked of', elem);
								}
							}
						} else {
							// Should be unchecked now
							if (elem.checked) {
								elem.checked = false;
								if (IN_DEBUG_MODE_FOR('checked')) {
									console.log('[.checked] Setting .checked to ' + elem.checked + ' for', elem);
								}
							} else {
								if (IN_DEBUG_MODE_FOR('checked')) {
									console.log('[.checked] Not updating .checked of', elem);
								}
							}
						}
					} else {
						if (IN_DEBUG_MODE_FOR('checked')) {
							console.warn('[.checked] Not bound to an array:', elem);
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
					console.log('[.focus] Focus Change', elem);
					console.log('[.focus] Field: ' + fieldName + '; data-bind | ' + dataBind);
				}

				if (elemGlobals.suppressChangesToSSOT) {
					if (IN_DEBUG_MODE_FOR('focus')) {
						console.log('[.focus] Change to S.S.o.T. Suppressed | ' + fieldName + ':', curr_value, ' (in mirror); Current:', focus);
					}
				} else {
					if (focus !== curr_value) {
						if (IN_DEBUG_MODE_FOR('focus')) {
							console.log('[.focus] Updating ' + fieldName + ':', curr_value, ' (in mirror); Current:', focus);
						}
						threeWayMethods.set(fieldName, focus);
						updateServerUpdatedStatus(fieldName);
					} else {
						if (IN_DEBUG_MODE_FOR('focus')) {
							console.log('[.focus] Unchanged focus: ' + fieldName + ';', curr_value, '(in mirror)');
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
						console.log("[.focus] Preparing .focus binding (to " + source + ") for", elem);
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
						console.log('[.focus] Setting .focus to \"' + focus + '\" for', elem);
					}
				} else {
					if (IN_DEBUG_MODE_FOR('focus')) {
						console.log('[.focus] Not updating .focus of', elem);
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
						console.log("[.html] Preparing .html binding for", elem);
						console.log("[.html] Field: " + source + "; Mappings: ", mappings);
					}
				}

				var html = processInTemplateContext(source, mappings, elem);

				if (elem.innerHTML !== html) {
					if (IN_DEBUG_MODE_FOR('html-text')) {
						console.log('[.html] Setting .innerHTML to \"' + html + '\" for', elem);
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
						console.log("[.text] Preparing .text binding for", elem);
						console.log("[.text] Field: " + source + "; Mappings: ", mappings);
					}
				}

				var text = processInTemplateContext(source, mappings, elem);

				if ($(elem).text() !== text) {
					if (IN_DEBUG_MODE_FOR('html-text')) {
						console.log('[.text] Setting .text to \"' + text + '\" for', elem);
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
						console.log("[process] Preparing \"process\" binding with " + source + " for", elem);
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
		// .visible
		//////////////////////////////////////////////////////
		if (!!elemBindings.bindings.visible) {
			threeWay.computations.push(Tracker.autorun(function(c) {
				var pipelineSplit = elemBindings.bindings.visible.source.split('|').map(x => x.trim()).filter(x => x !== "");
				var source = pipelineSplit[0];
				var mappings = pipelineSplit.splice(1);

				if (c.firstRun) {
					if (IN_DEBUG_MODE_FOR('visible-and-disabled')) {
						console.log("[.visible] Preparing .visible binding with " + source + " for", elem);
					}
				}

				var visible = processInTemplateContext(source, mappings, elem);
				visible = (!!visible) ? "" : "none";

				if (elem.style.display !== visible) {
					if (IN_DEBUG_MODE_FOR('visible-and-disabled')) {
						console.log('[.visible] Setting .style[visible] to \"' + visible + '\" for', elem);
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
						console.log("[.disabled] Preparing .disabled binding with " + source + " for", elem);
					}
				}

				var disabled = processInTemplateContext(source, mappings, elem);
				disabled = (!!disabled);

				if (elem.disabled !== disabled) {
					if (IN_DEBUG_MODE_FOR('visible-and-disabled')) {
						console.log('[.disabled] Setting .disabled to \"' + disabled + '\" for', elem);
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
							console.log("[.style|" + key + "] Preparing .style binding for", elem);
							console.log("[.style|" + key + "] Field: " + source + "; Mappings: ", mappings);
						}
					}

					var value = processInTemplateContext(source, mappings, elem);

					// Update Style
					if (elem.style[key] !== value) {
						if (IN_DEBUG_MODE_FOR('style')) {
							console.log('[.style|' + key + '] Setting style.' + key + ' to \"' + value + '\" for', elem);
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
							console.log("[.attr|" + key + "] Preparing attribute binding for", elem);
							console.log("[.attr|" + key + "] Field: " + source + "; Mappings: ", mappings);
						}
					}

					var value = processInTemplateContext(source, mappings, elem);

					// Update Style
					if ($(elem).attr(key) !== value) {
						if (IN_DEBUG_MODE_FOR('attr')) {
							console.log('[.attr|' + key + '] Setting attribute ' + key + ' to \"' + value + '\" for', elem);
						}
						$(elem).attr(key, value);
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
							console.log("[.class|" + key + "] Preparing class binding for", elem);
							console.log("[.class|" + key + "] Field: " + source + "; Mappings: ", mappings);
						}
					}

					var value = processInTemplateContext(source, mappings, elem);
					value = (!!value);

					// Update Style
					if ($(elem).hasClass(key) !== value) {
						if (IN_DEBUG_MODE_FOR('class')) {
							console.log('[.class|' + key + '] Setting class ' + key + ' to \"' + value + '\" for', elem);
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
							console.log("[.event|" + eventName + "] Preparing event binding for", elem);
							console.log("[.event|" + eventName + "] Handlers: ", handlerNames);
						}
					}

					handlerNames.forEach(function(m) {
						var handler = threeWayMethods.getInheritedEventHandler(m);
						if (!_.isFunction(handler)) {
							console.error('[ThreeWay] No such event handler: ' + m, elem);
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
										console.log("[.event|keyup=" + _eventName + "] Firing " + m + " for", elem);
									}
									instance.callFunctionWithTemplateContext(function() {
										handler.call(this, event, instance, threeWayMethods.getAll_NR());
									}, this);
								}, [key]));
								compositeHandlerUsed = true;
							} else if (eventName.toLowerCase() === 'keydown_' + _eventName.toLowerCase()) {
								bindEventToThisElem('keydown', ThreeWayDependencies.extras.eventGenerators.keypressHandlerGenerator(function(event) {
									if (IN_DEBUG_MODE_FOR('event')) {
										console.log("[.event|keydown=" + _eventName + "] Firing " + m + " for", elem);
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
								console.log("[.event|" + eventName + "] Firing " + m + " for", elem);
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
					console.log("[bind] Element bound to " + instanceId + " (twbId: " + elem.getAttributeNS(THREE_WAY_ATTRIBUTE_NAMESPACE, THREE_WAY_DATA_BINDING_ID) + ")", elem);
				}
				elem.setAttributeNS(THREE_WAY_ATTRIBUTE_NAMESPACE, THREE_WAY_DATA_BINDING_INSTANCE, instanceId);
				c.stop();
			}
		});
		threeWay.boundElemComputations[thisElemId] = boundElemComputations;
		threeWay.boundElemEventHandlers[thisElemId] = boundElemComputations;
	};
};
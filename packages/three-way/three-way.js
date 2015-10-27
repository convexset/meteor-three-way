/* global ThreeWay: true */
/* global PackageUtilities: true */

var __tw = function ThreeWay() {};
ThreeWay = new __tw();

var THREE_WAY_NAMESPACE = "__three_way__";
var THREE_WAY_DATA_BOUND_ATTRIBUTE = "three-way-data-bound";
var DEFAULT_DEBOUNCE_INTERVAL = 400;
var DEFAULT_DOM_POLL_INTERVAL = 300;

var DEBUG_MODE = false;
var DEBUG_MODE_ALL = false;
var DEBUG_MESSAGES = {
	'bindings': false,
	'data-mirror': false,
	'observer': false,
	'tracker': false,
	'new-id': false,
	'db': false,
	'value': false,
	'checked': false,
	'html': false,
	'visible': false,
	'vm-only': false,
	're-bind': false,
};

function IN_DEBUG_MODE_FOR(message_class) {
	return DEBUG_MODE && (DEBUG_MODE_ALL || DEBUG_MESSAGES[message_class]);
}

function removeInPlace(a, item) {
	var idx = a.indexOf(item);
	while (idx !== -1) {
		a.splice(idx, 1);
		idx = a.indexOf(item);
	}
	return a;
}

function getFieldParams(templateString, itemString) {
	var tss = templateString.split('.');
	var iss = itemString.split('.');
	var matchFailed = {
		match: false,
		params: []
	};
	if (tss.length !== iss.length) {
		return matchFailed;
	} else {
		var n = tss.length;
		var match = {
			match: true,
			params: []
		};
		// I would zip, but...
		for (var k = 0; k < n; k++) {
			if (tss[k] === '*') {
				// Wildcard: Store
				if (iss[k].length > 0) {
					match.params.push(iss[k]);
				} else {
					throw Meteor.Error('invalid-field-string', itemString);
				}
			} else {
				// Non-wildcard: Check for match
				if (tss[k] !== iss[k]) {
					return matchFailed;
				}
			}
		}
		return match;
	}
}

function matchParamStrings(templateStrings, itemString, matchOne) {
	if (typeof matchOne === "undefined") {
		matchOne = true;
	}

	var ts, getParamsRes;
	var matches = [];
	for (var k = 0; k < templateStrings.length; k++) {
		ts = templateStrings[k];
		getParamsRes = getFieldParams(ts, itemString);
		if (getParamsRes.match) {
			matches.push({
				match: ts,
				params: getParamsRes.params
			});

			if (matchOne) {
				return matches;
			}
		}
	}
	return matches;
}
PackageUtilities.addImmutablePropertyFunction(ThreeWay, 'matchParamStrings', matchParamStrings);

if (Meteor.isClient) {
	PackageUtilities.addImmutablePropertyFunction(ThreeWay, 'setDebugModeOn', function setDebugModeOn() {
		DEBUG_MODE = true;
	});
	PackageUtilities.addImmutablePropertyFunction(ThreeWay, 'setDebugModeOff', function setDebugModeOff() {
		DEBUG_MODE = false;
	});
	PackageUtilities.addImmutablePropertyFunction(ThreeWay, 'debugModeSelectAll', function debugModeSelectAll() {
		DEBUG_MODE_ALL = true;
	});
	PackageUtilities.addImmutablePropertyFunction(ThreeWay, 'debugModeSelectNone', function debugModeSelectNone() {
		DEBUG_MODE_ALL = false;
		for (var k in DEBUG_MESSAGES) {
			if (DEBUG_MESSAGES.hasOwnProperty(k)) {
				DEBUG_MESSAGES[k] = false;
			}
		}
	});
	PackageUtilities.addImmutablePropertyFunction(ThreeWay, 'debugModeSelect', function debugModeSelect(k) {
		if (DEBUG_MESSAGES.hasOwnProperty(k)) {
			DEBUG_MESSAGES[k] = true;
		}
	});

	PackageUtilities.addImmutablePropertyFunction(ThreeWay, 'prepare', function prepare(tmpl, options) {
		if (typeof tmpl === "undefined") {
			throw new Meteor.Error('missing-argument', 'template required');
		}
		if (typeof options === "undefined") {
			throw new Meteor.Error('missing-argument', 'options required');
		}
		options = PackageUtilities.updateDefaultOptionsWithInput({
			fields: [],
			collection: null,
			updatersForServer: {},
			dataTransformToServer: {},
			dataTransformFromServer: {},
			preProcessors: {},
			viewModelToViewOnly: {},
			debounceInterval: DEFAULT_DEBOUNCE_INTERVAL,
			rebindPollInterval: DEFAULT_DOM_POLL_INTERVAL,
		}, options, true);

		if (!(options.collection instanceof Mongo.Collection)) {
			throw new Meteor.Error('options-error', 'collection should be a Mongo.Collection');
		}
		options.fields.forEach(function(f) {
			// check
			if (!options.updatersForServer.hasOwnProperty(f)) {
				// Check for updaters
				throw new Meteor.Error('missing-updater', 'Meteor call to update server missing: ' + f);
			}
			if (!options.dataTransformToServer.hasOwnProperty(f)) {
				// Set default transforms (local data to server)
				options.dataTransformToServer[f] = x => x;
			}
			if (!options.dataTransformFromServer.hasOwnProperty(f)) {
				// Set default transforms (server to local data)
				options.dataTransformFromServer[f] = x => x;
			}
		});


		var extendedFields = (function genObjSubFields(fields) {
			var ret = [];
			fields.forEach(function(f) {
				var currResults = [f];
				var split = f.split('.');
				split.pop();
				if (split.length > 0) {
					genObjSubFields([split.join('.')]).forEach(function(f) {
						if (currResults.indexOf(f) === -1) {
							currResults.push(f);
						}
					});
				}

				currResults.forEach(function(f) {
					if (ret.indexOf(f) === -1) {
						ret.push(f);
					}
				});
			});
			return ret;
		})(options.fields);
		var pseudoFields = (function () {
			var efo = [];
			extendedFields.forEach(function (item) {
				if (options.fields.indexOf(item) === -1) {
					efo.push(item);
				}
			});
			return efo;
		})();
		if (IN_DEBUG_MODE_FOR('observer')) {
			console.log('[Observer] Field list: ', options.fields);
			console.log('[Observer] Pseudo fields: ', pseudoFields);
		}


		tmpl.onCreated(function() {
			var instance = this;

			var threeWay = {
				data: new ReactiveDict(),
				viewModelOnlyData: {},
				dataMirror: {},
				dataMatchParams: {},
				haveData: new ReactiveVar(false),
				id: new ReactiveVar(null),
				observer: null,
				bindings: [],
				computations: [],
				_dataUpdateComputations: {},
				doRebindOperations: true
			};

			instance[THREE_WAY_NAMESPACE] = threeWay;
			instance._3w_SetId = function(id) {
				threeWay.id.set(id);
			};
			instance._3w_GetId = function() {
				return threeWay.id.get();
			};
			instance._3w_Get = p => threeWay.data.get(p);
			instance._3w_Set = (p, v) => threeWay.data.set(p, v);
			instance._3w_Get_NR = p => threeWay.dataMirror[p];
			instance._3w_GetAll_NR = () => _.extend({}, threeWay.dataMirror);

			var mostRecentDatabaseEntry = {};

			Tracker.autorun(function() {
				threeWay.dataMirror = threeWay.data.all();
				if (IN_DEBUG_MODE_FOR('data-mirror')) {
					console.log('Updating data mirror...', threeWay.dataMirror);
				}
			});

			_.forEach(options.viewModelToViewOnly, function(value, field) {
				threeWay.data.set(field, value);
				if (IN_DEBUG_MODE_FOR('vm-only')) {
					console.log("[vm-only] Setting up initial value for " + field + " to ", value, " using template-level options.");
				}
				threeWay._dataUpdateComputations[field] = Tracker.autorun(function() {
					threeWay.viewModelOnlyData[field] = threeWay.data.get(field);
					if (IN_DEBUG_MODE_FOR('vm-only')) {
						console.log("[vm-only] Updating vm-only data:", threeWay.viewModelOnlyData);
					}
				});
			});


			Tracker.autorun(function() {
				var _id = threeWay.id.get();

				if (!!threeWay.observer) {
					if (IN_DEBUG_MODE_FOR('observer')) {
						console.log('[Observer] Stopping existing observer...');
					}
					threeWay.observer.stop();
				}
				if (!!threeWay._dataUpdateComputations) {
					if (IN_DEBUG_MODE_FOR('tracker')) {
						console.log('[ThreeWay] Stopping existing data update autoruns...');
					}
					_.forEach(threeWay._dataUpdateComputations, function(c) {
						c.stop();
					});
					threeWay._dataUpdateComputations = {};
				}

				if (IN_DEBUG_MODE_FOR('data-mirror')) {
					console.log("[data-mirror] Clearing threeWay.data");
				}
				threeWay.data.clear();

				// Replace ViewModel only data and set-up mirroring again
				_.forEach(threeWay.viewModelOnlyData, function(value, field) {
					threeWay.data.set(field, threeWay.viewModelOnlyData[field]);
					if (IN_DEBUG_MODE_FOR('vm-only')) {
						console.log("[vm-only] Restoring value for " + field + " to ", threeWay.viewModelOnlyData[field], ".");
					}
					threeWay._dataUpdateComputations[field] = Tracker.autorun(function() {
						threeWay.viewModelOnlyData[field] = threeWay.data.get(field);
						if (IN_DEBUG_MODE_FOR('vm-only')) {
							console.log("[vm-only] Updating vm-only data:", threeWay.viewModelOnlyData);
						}
					});
				});

				threeWay.dataMatchParams = {};
				mostRecentDatabaseEntry = {};
				threeWay.__idReadyFor = _.object(options.fields, options.fields.map(() => false));

				if (!!_id) {
					if (IN_DEBUG_MODE_FOR('new-id')) {
						console.log('Current id: ' + _id);
					}
					if (IN_DEBUG_MODE_FOR('observer')) {
						console.log('[Observer] Creating new cursor: ' + _id);
					}

					// Retrieve only the necessary fields
					// Not doing a minimal field set retrieval because
					// that aspect should have been handled by the subscription
					var cursor = options.collection.find(_id);

					// Descend into objects and arrays
					var untouchedFields = [];
					var descendInto = function descendInto(fields, doc, addedRun, fieldPrefix) {
						if (typeof fieldPrefix === "undefined") {
							fieldPrefix = '';
						}

						if (fieldPrefix === '') {
							untouchedFields = _.map(threeWay.dataMatchParams, (v, k) => k);
						}

						_.forEach(fields, function(v, f) {
							var curr_f = fieldPrefix + f;

							// Get matching items to data-bind
							// item.subitem --> (item.subitem, [])
							// item.subitem --> (item.*, ['subitem'])
							var matches = matchParamStrings(options.fields, curr_f, !addedRun);  // Match more than one only if in a "added" observe callback
							if (addedRun) {
								if (matches.length > 1) {
									if (IN_DEBUG_MODE_FOR('observer')) {
										console.error('[Observer] Ambiguous matches for ' + curr_f, ' (will use first):', matches);
									}
								}
							}
							var match = (matches.length > 0) ? matches[0] : null;
							var psuedoMatched = (!!match) ? true : (extendedFields.indexOf(curr_f) === -1) || matchParamStrings(pseudoFields, curr_f, true).length > 0;

							if ((!match) && (!psuedoMatched)) {
								// Skip if unnecessary branch
								if (IN_DEBUG_MODE_FOR('observer')) {
									console.log('[Observer] Skipping ' + curr_f + ' and children.');
								}
								return;
							}

							if (!!match) {
								// This is field we might be binding to...
								// ... (based on options.fields)...do something

								// Indicate field is touched and update matches
								removeInPlace(untouchedFields, curr_f);
								threeWay.dataMatchParams[curr_f] = match;

								if (IN_DEBUG_MODE_FOR('observer')) {
									console.log('[Observer] Field match -- ' + curr_f, ':', v);
								}

								// Update data if changed
								var mostRecentValue = mostRecentDatabaseEntry[curr_f];
								var newValue = options.dataTransformFromServer[match.match](v, doc);
								if (!_.isEqual(mostRecentValue, newValue)) {
									threeWay.data.set(curr_f, newValue);
									mostRecentDatabaseEntry[curr_f] = newValue;
									threeWay.__idReadyFor[curr_f] = true;
								}

								if (typeof threeWay._dataUpdateComputations[curr_f] === "undefined") {
									threeWay._dataUpdateComputations[curr_f] = Tracker.autorun(function() {
										var value = threeWay.data.get(curr_f);

										var __id;
										Tracker.nonreactive(function() {
											__id = threeWay.id.get();
										});
										if (IN_DEBUG_MODE_FOR('db')) {
											console.log('[DB Update] Field: ' + curr_f + "; id: " + __id + "; isReady[f]: " + threeWay.__idReadyFor[curr_f]);
											console.log("\tValue:", value);
											console.log("\tMost Recent DB entry: ", mostRecentDatabaseEntry[curr_f]);
										}
										if ((!!__id) && threeWay.__idReadyFor[curr_f] && (!_.isEqual(value, mostRecentDatabaseEntry[curr_f]))) {
											if (IN_DEBUG_MODE_FOR('db')) {
												console.log('[DB] Updating... ' + curr_f + ' -> ', value);
											}
											mostRecentDatabaseEntry[curr_f] = value;
											var matchFamily = threeWay.dataMatchParams[curr_f].match;
											threeWay.debouncedUpdaters[matchFamily](options.dataTransformToServer[matchFamily](value, _.extend({}, threeWay.dataMirror)), threeWay.dataMatchParams[curr_f]);
										} else {
											if (IN_DEBUG_MODE_FOR('db')) {
												console.log('[DB] No update.');
											}
										}
									});
								}
							}

							if (typeof v === "object") {
								// Parent of field we are binding to
								// Object or array
								if (IN_DEBUG_MODE_FOR('observer')) {
									console.log('[Observer] Descending -- ' + curr_f + (fieldPrefix === '' ? '' : ' (' + fieldPrefix + ' + ' + f + ')') + ' :', v);
								}
								descendInto(v, doc, addedRun, curr_f + '.');
							}
						});

						if (fieldPrefix === '') {
							// Remove stuff in untouchedFields
							untouchedFields.forEach(function(field) {
								delete threeWay.dataMatchParams[field];
							});
						}
					};

					// Setting Up Observers
					threeWay.observer = cursor.observe({
						added: function(document) {
							if (IN_DEBUG_MODE_FOR('observer')) {
								console.log('[Observer] Added:', document._id, document);
							}
							threeWay.haveData.set(true);
							descendInto(document, document, true);
						},
						changed: function(newDocument, oldDocument) {
							if (IN_DEBUG_MODE_FOR('observer')) {
								console.log('[Observer] Changed:', newDocument._id, newDocument, oldDocument);
							}
							descendInto(newDocument, newDocument, false);
						},
						removed: function(oldDocument) {
							if (IN_DEBUG_MODE_FOR('observer')) {
								console.log('[Observer] Removed:', oldDocument._id);
							}
							threeWay.haveData.set(false);
							threeWay.id.set(null);
							threeWay.__idReadyFor = _.object(options.fields, options.fields.map(() => false));
						}
					});

					// Setting Up Debounced Updaters
					// Old ones will trigger even if id changes since
					// new functions are created when id changes
					threeWay.debouncedUpdaters = _.object(options.fields,
						options.fields.map(function(f) {
							return _.debounce(function updateServer(v, match) {
								var params = [_id, v];
								match.params.forEach(function(p) {
									params.push(p);
								});
								Meteor.apply(options.updatersForServer[f], params);
							}, options.debounceInterval);
						}));

				}
			});
		});

		tmpl.onRendered(function() {
			var instance = this;
			var threeWay = instance[THREE_WAY_NAMESPACE];

			// Set initial values for data (in particular, view model only fields)
			Array.prototype.forEach.call(instance.$("data[field]"), function(elem) {
				var field = elem.getAttribute('field');
				var initValue = elem.getAttribute('initial-value') || null;
				threeWay.data.set(field, initValue);

				if (IN_DEBUG_MODE_FOR('vm-only')) {
					console.log("[vm-only] Setting up initial value for " + field + " to ", initValue, " using ", elem);
				}

				if (typeof threeWay._dataUpdateComputations[field] === "undefined") {
					threeWay._dataUpdateComputations[field] = Tracker.autorun(function() {
						threeWay.viewModelOnlyData[field] = threeWay.data.get(field);
						if (IN_DEBUG_MODE_FOR('vm-only')) {
							console.log("[vm-only] vm-only data:", threeWay.viewModelOnlyData);
						}
					});
				}
			});


			(function rebindOperations() { // Invoke and setTimeout on completion
				if (IN_DEBUG_MODE_FOR('re-bind')) {
					console.log("[re-bind] Checking for new elements to bind.");
				}

				Array.prototype.forEach.call(instance.$("[data-bind]"), function(elem) {
					if (!!elem.getAttribute(THREE_WAY_DATA_BOUND_ATTRIBUTE)) {
						// Already data-bound
						return;
					}

					var dataBind = elem.getAttribute('data-bind');

					var elemBindings = {
						elem: elem,
						bindings: {}
					};
					dataBind.split(";").map(x => x.trim()).forEach(function(x) {
						var idxColon = x.indexOf(":");
						var itemName = x.substr(0, idxColon).trim().toLowerCase();
						var rawItemData = x.substr(idxColon + 1).trim();
						var itemData;

						var isDictType = (itemName === "class") || (itemName === "style") || (itemName === "attr");
						if (isDictType) {
							itemData = _.object(rawItemData.substr(1, rawItemData.length - 2).split(",").map(x => x.trim()).map(function(x) {
								return x.split(":").map(x => x.trim());
							}));
						} else {
							itemData = rawItemData;
						}

						elemBindings.bindings[itemName] = {
							isDictType: isDictType,
							source: itemData
						};
					});

					threeWay.bindings.push(elemBindings);
					if (IN_DEBUG_MODE_FOR('bindings')) {
						console.log("[bindings] Creating Bindings for ", elem, elemBindings.bindings);
					}

					//////////////////////////////////////////////////////
					//////////////////////////////////////////////////////
					//////////////////////////////////////////////////////
					// Dealing With Update Bindings
					//////////////////////////////////////////////////////
					//////////////////////////////////////////////////////

					var elemGlobals = {
						suppressChange: false
					};

					//////////////////////////////////////////////////////
					// .value
					//////////////////////////////////////////////////////
					if (!!elemBindings.bindings.value) {

						var valueChangeHandler = function valueChangeHandler() { // function(event)
							var value = elem.value;
							var pipelineSplit = elemBindings.bindings.value.source.split('|').map(x => x.trim());
							var fieldName = pipelineSplit[0];
							var curr_value = threeWay.dataMirror[fieldName];

							if (IN_DEBUG_MODE_FOR('value')) {
								console.log('[.value] Change', elem);
								console.log('[.value] data-bind | ' + dataBind);
								console.log('[.value] Field: ' + fieldName);
							}

							if (elemGlobals.suppressChange) {
								if (IN_DEBUG_MODE_FOR('value')) {
									console.log('[.value] Change Suppressed | ' + fieldName + ':', curr_value, ' (in mirror); Current:', value);
								}
							} else {
								if (value !== curr_value) {
									if (IN_DEBUG_MODE_FOR('value')) {
										console.log('[.value] Updating ' + fieldName + ':', curr_value, ' (in mirror); Current:', value);
									}
									threeWay.data.set(fieldName, value);
								} else {
									if (IN_DEBUG_MODE_FOR('value')) {
										console.log('[.value] Unchanged value: ' + fieldName + ';', curr_value, '(in mirror)');
									}
								}
							}
						};

						$(elem).change(valueChangeHandler);
						$(elem).keyup(valueChangeHandler);

						threeWay.computations.push(Tracker.autorun(function(c) {
							var pipelineSplit = elemBindings.bindings.value.source.split('|').map(x => x.trim());
							var source = pipelineSplit[0];
							var pipeline = pipelineSplit.splice(1);

							var value = threeWay.data.get(source);
							if (c.firstRun) {
								if (IN_DEBUG_MODE_FOR('value')) {
									console.log("[.value] Preparing .value update for", elem);
									console.log("[.value] " + source + "; Pipeline: ", pipeline);
								}
								if (typeof value === "undefined") {
									return;
								}
							}

							elemGlobals.suppressChange = true;
							pipeline.forEach(function(m) {
								value = options.preProcessors[m](value, elem, _.extend({}, threeWay.dataMirror));
							});

							if (elem.value !== value) {
								elem.value = value;
								if (IN_DEBUG_MODE_FOR('value')) {
									console.log('[.value] Setting .value to \"' + value + '\" for', elem);
								}
							} else {
								if (IN_DEBUG_MODE_FOR('value')) {
									console.log('[.value] Not updating .value of', elem);
								}
							}
							elemGlobals.suppressChange = false;
						}));

					}


					//////////////////////////////////////////////////////
					// .checked
					//////////////////////////////////////////////////////
					if (!!elemBindings.bindings.checked) {

						var checkedChangeHandler = function checkedChangeHandler() { // function(event)
							var elem_value = elem.value;
							var elem_checked = elem.checked;

							var fieldName = elemBindings.bindings.checked.source;
							var curr_value = threeWay.dataMirror[fieldName];

							var new_value;
							var isRadio = elem.getAttribute('type').toLowerCase() === "radio";
							if (isRadio) {
								new_value = elem_value;
							} else {
								new_value = (!!curr_value ? curr_value : []).map(x => x); // copy
								if (!elem_checked) {
									var idx = new_value.indexOf(elem_value);
									if (idx > -1) {
										new_value.splice(idx, 1);
									}
								} else {
									new_value.push(elem_value);
								}
							}

							if (IN_DEBUG_MODE_FOR('checked')) {
								console.log('[.checked] Change', elem);
								console.log('[.checked] data-bind | ' + dataBind);
								console.log('[.checked] Field: ' + fieldName);
							}

							if (elemGlobals.suppressChange) {
								if (IN_DEBUG_MODE_FOR('checked')) {
									console.log('[.checked] Change Suppressed | ' + fieldName + ':', curr_value, ' (in mirror); Current:', new_value);
								}
							} else {
								if (!_.isEqual(new_value, curr_value)) {
									if (IN_DEBUG_MODE_FOR('checked')) {
										console.log('[.checked] Updating ' + fieldName + ':', curr_value, ' (in mirror); Current:', new_value);
									}
									threeWay.data.set(fieldName, new_value);
								} else {
									if (IN_DEBUG_MODE_FOR('checked')) {
										console.log('[.checked] Unchanged value: ' + fieldName + ';', curr_value, '(in mirror)');
									}
								}
							}
						};

						$(elem).change(checkedChangeHandler);

						threeWay.computations.push(Tracker.autorun(function(c) {
							var source = elemBindings.bindings.checked.source;

							var value = threeWay.data.get(source);
							if (c.firstRun) {
								if (IN_DEBUG_MODE_FOR('checked')) {
									console.log("[.checked] Preparing .checked update (to ", value, ") for", source, elem);
								}
								if (typeof value === "undefined") {
									return;
								}
							}
							elemGlobals.suppressChange = true;

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
							}

							elemGlobals.suppressChange = false;
						}));

					}


					//////////////////////////////////////////////////////
					// .html
					//////////////////////////////////////////////////////
					if (!!elemBindings.bindings.html) {
						threeWay.computations.push(Tracker.autorun(function(c) {
							var pipelineSplit = elemBindings.bindings.html.source.split('|').map(x => x.trim());
							var source = pipelineSplit[0];
							var mappings = pipelineSplit.splice(1);

							var html = threeWay.data.get(source);
							if (c.firstRun) {
								if (IN_DEBUG_MODE_FOR('html')) {
									console.log("[.html] Preparing .html update for", elem);
									console.log("[.html] Field: " + source + "; Mappings: ", mappings);
								}
								if (typeof html === "undefined") {
									return;
								}
							}

							mappings.forEach(function(m) {
								html = options.preProcessors[m](html, elem, _.extend({}, threeWay.dataMirror));
							});

							if (elem.innerHTML !== html) {
								if (IN_DEBUG_MODE_FOR('html')) {
									console.log('[.html] Setting .innerHTML to \"' + html + '\" for', elem);
								}
								elem.innerHTML = html;
							}
						}));
					}

					//////////////////////////////////////////////////////
					// .visible
					//////////////////////////////////////////////////////
					if (!!elemBindings.bindings.visible) {
						threeWay.computations.push(Tracker.autorun(function(c) {
							var pipelineSplit = elemBindings.bindings.visible.source.split('|').map(x => x.trim());
							var source = pipelineSplit[0];
							var mappings = pipelineSplit.splice(1);

							if (c.firstRun) {
								if (IN_DEBUG_MODE_FOR('visible')) {
									console.log("[.visible] Preparing .visible update with " + source + " for", elem);
								}
							}

							var visible;
							if (source === "_3w_haveData") {
								visible = threeWay.haveData.get() ? "" : "none";
							} else {
								visible = threeWay.data.get(source);
								if (c.firstRun) {
									if (typeof visible === "undefined") {
										return;
									}
								}
								mappings.forEach(function(m) {
									visible = options.preProcessors[m](visible, elem, _.extend({}, threeWay.dataMirror));
								});
							}

							if (elem.style.display !== visible) {
								if (IN_DEBUG_MODE_FOR('visible')) {
									console.log('[.visible] Setting .style[visible] to \"' + visible + '\" for', elem);
								}
								elem.style.display = visible;
							}
						}));
					}

					//////////////////////////////////////////////////////
					//////////////////////////////////////////////////////
					// End Dealing with Bindings
					//////////////////////////////////////////////////////
					//////////////////////////////////////////////////////

					elem.setAttribute(THREE_WAY_DATA_BOUND_ATTRIBUTE, true);

				});

				if (threeWay.doRebindOperations) {
					// Recheck later
					setTimeout(rebindOperations, options.rebindPollInterval);
				}
			})(); // Invoke rebindOperations
		});

		tmpl.onDestroyed(function() {
			var instance = this;
			var threeWay = instance[THREE_WAY_NAMESPACE];
			threeWay.doRebindOperations = false;

			if (IN_DEBUG_MODE_FOR('tracker')) {
				console.log('[ThreeWay] onDestroy: Stopping computations', instance);
			}
			_.forEach(threeWay.computations, function(c) {
				c.stop();
			});
			if (IN_DEBUG_MODE_FOR('tracker')) {
				console.log('[ThreeWay] onDestroy: Stopping data-update computations', instance);
			}
			_.forEach(threeWay._dataUpdateComputations, function(c) {
				c.stop();
			});
		});

		tmpl.helpers({
			_3w_id: function() {
				return Template.instance()[THREE_WAY_NAMESPACE].id.get();
			},
			_3w_haveData: function() {
				return Template.instance()[THREE_WAY_NAMESPACE].haveData.get();
			},
			_3w_get: function(propName) {
				return Template.instance()[THREE_WAY_NAMESPACE].data.get(propName);
			},
			_3w_getAll: function() {
				return Template.instance()[THREE_WAY_NAMESPACE].data.all();
			}
		});
	});

	PackageUtilities.addImmutablePropertyObject(ThreeWay, 'helpers', {
		updateSemanticUIDropdown: function updateSemanticUIDropdown(x, elem) {
			if (typeof x !== "undefined") {
				if (x.trim() === "") {
					$(elem.parentElement)
						.dropdown('set exactly', []);
				} else {
					$(elem.parentElement)
						.dropdown('set exactly', x.split(',').map(x => x.trim()));
				}
			}
			return x;
		}
	});
}
/* global ThreeWay: true */
/* global PackageUtilities: true */

var __tw = function ThreeWay() {};
ThreeWay = new __tw();

var THREE_WAY_NAMESPACE = "__three_way__";
var THREE_WAY_DATA_BOUND_ATTRIBUTE = "three-way-data-bound";
var DEFAULT_DEBOUNCE_INTERVAL = 500;
var DEFAULT_THROTTLE_INTERVAL = 500;
var DEFAULT_DOM_POLL_INTERVAL = 300;
var DEFAULT_METHOD_INTERVAL = 100;

var DEBUG_MODE = false;
var DEBUG_MODE_ALL = false;
var DEBUG_MESSAGES = {
	'bindings': false,
	'data-mirror': false,
	'observer': false,
	'tracker': false,
	'new-id': false,
	'db': false,
	'methods': false,
	'value': false,
	'checked': false,
	'html': false,
	'visible-and-disabled': false,
	'style': false,
	'attr': false,
	'class': false,
	'event': false,
	'vm-only': false,
	're-bind': false,
};

function IN_DEBUG_MODE_FOR(message_class) {
	return DEBUG_MODE && (DEBUG_MODE_ALL || DEBUG_MESSAGES[message_class]);
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
		matchOne = false;
	}

	var ts, getParamsRes;
	var matches = [];
	for (var k = 0; k < templateStrings.length; k++) {
		ts = templateStrings[k];
		getParamsRes = getFieldParams(ts, itemString);
		if (getParamsRes.match) {
			matches.push({
				fieldPath: itemString,
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
	PackageUtilities.addImmutablePropertyArray(ThreeWay, 'DEBUG_MESSAGES', _.map(DEBUG_MESSAGES, (v, k) => k));
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
			throttleInterval: DEFAULT_THROTTLE_INTERVAL,
			throttledUpdaters: [],
			rebindPollInterval: DEFAULT_DOM_POLL_INTERVAL,
			methodInterval: DEFAULT_METHOD_INTERVAL,
			eventHandlers: {}
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
		var pseudoFields = (function() {
			var efo = [];
			extendedFields.forEach(function(item) {
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
				instanceId: null,
				children: {},
				__hasChild: new ReactiveDict(),
				data: new ReactiveDict(),
				viewModelOnlyData: {},
				dataMirror: {},
				fieldMatchParams: {}, // No need to re-create
				_fieldPseudoMatched: [], // No need to re-create
				_fieldsTested: [], // No need to re-create
				haveData: new ReactiveVar(false),
				id: new ReactiveVar(null),
				observer: null,
				bindings: [],
				computations: [],
				_dataUpdateComputations: {},
				doRebindOperations: true,
			};

			instance[THREE_WAY_NAMESPACE] = threeWay;
			instance._3w_setId = function(id) {
				threeWay.id.set(id);
			};
			instance._3w_getId = function() {
				return threeWay.id.get();
			};
			instance._3w_get = p => threeWay.data.get(p);
			instance._3w_set = (p, v) => threeWay.data.set(p, v);
			instance._3w_get_NR = p => threeWay.dataMirror[p];
			instance._3w_getAll = () => threeWay.data.all();
			instance._3w_getAll_NR = () => _.extend({}, threeWay.dataMirror);

			instance._3w_parentDataGet = (p, levelsUp) => instance.parentTemplate((!!levelsUp) ? levelsUp : 1)[THREE_WAY_NAMESPACE].data.get(p);
			instance._3w_parentDataGetAll = (levelsUp) => instance.parentTemplate((!!levelsUp) ? levelsUp : 1)[THREE_WAY_NAMESPACE].data.all();
			instance._3w_parentDataSet = (p, v, levelsUp) => instance.parentTemplate((!!levelsUp) ? levelsUp : 1)[THREE_WAY_NAMESPACE].data.set(p, v);
			instance._3w_parentDataGet_NR = (p, levelsUp) => instance.parentTemplate((!!levelsUp) ? levelsUp : 1)[THREE_WAY_NAMESPACE].dataMirror[p];
			instance._3w_parentDataGetAll_NR = (levelsUp) => _.extend({}, instance.parentTemplate((!!levelsUp) ? levelsUp : 1)[THREE_WAY_NAMESPACE].dataMirror);

			instance._3w_childDataGet = function _3w_childDataGet(p, childNameArray) {
				if (childNameArray instanceof Array) {
					if (childNameArray.length === 0) {
						return;
					}
					var hasChildData = !!threeWay.__hasChild.get(childNameArray[0]);
					if (!hasChildData) {
						return;
					}
					if (childNameArray.length === 1) {
						var value = threeWay.children[childNameArray[0]][THREE_WAY_NAMESPACE].data.get(p);
						return value;
					} else {
						var cn = childNameArray.map(x => x);
						cn.shift();
						return threeWay.children[childNameArray[0]]._3w_childDataGet(p, cn);
					}
				} else {
					return instance._3w_childDataGet(p, [childNameArray]);
				}
			};
			instance._3w_childDataGetAll = function _3w_childDataGetAll(childNameArray) {
				if (childNameArray instanceof Array) {
					if (childNameArray.length === 0) {
						return;
					}
					var hasChildData = !!threeWay.__hasChild.get(childNameArray[0]);
					if (!hasChildData) {
						return;
					}
					if (childNameArray.length === 1) {
						var value = threeWay.children[childNameArray[0]][THREE_WAY_NAMESPACE].data.all();
						return value;
					} else {
						var cn = childNameArray.map(x => x);
						cn.shift();
						return threeWay.children[childNameArray[0]]._3w_childDataGetAll(cn);
					}
				} else {
					return instance._3w_childDataGetAll([childNameArray]);
				}
			};
			instance._3w_childDataSet = function _3w_childDataSet(p, v, childNameArray) {
				if (childNameArray instanceof Array) {
					if (childNameArray.length === 0) {
						return;
					}
					var hasChildData;
					Tracker.nonreactive(function() {
						hasChildData = !!threeWay.__hasChild.get(childNameArray[0]);
					});
					if (!hasChildData) {
						throw new Meteor.Error('child-does-not-exist', childNameArray[0]);
					}
					if (childNameArray.length === 1) {
						var value = threeWay.children[childNameArray[0]][THREE_WAY_NAMESPACE].data.set(p, v);
						return value;
					} else {
						var cn = childNameArray.map(x => x);
						cn.shift();
						return threeWay.children[childNameArray[0]]._3w_childDataSet(p, v, cn);
					}
				} else {
					return instance._3w_childDataSet(p, v, [childNameArray]);
				}
			};
			instance._3w_childDataGet_NR = function _3w_childDataGet_NR(p, childNameArray) {
				var value;
				Tracker.nonreactive(function () {
					value = instance._3w_childDataGet(p, childNameArray);
				});
				return value;
			};
			instance._3w_childDataGetAll_NR = function _3w_childDataGetAll_NR(childNameArray) {
				var value;
				Tracker.nonreactive(function () {
					value = instance._3w_childDataGetAll(childNameArray);
				});
				return value;
			};

			instance._3w_getAllDescendants_NR = function _3w_getAllDescendants_NR(levels, currDepth) {
				if (typeof levels === "undefined") {
					levels = Number.MAX_SAFE_INTEGER;
				}
				if (typeof currDepth === "undefined") {
					currDepth = 1;
				}
				if (levels === 0) {
					return [];
				}
				var __hasChild;
				Tracker.nonreactive(function () {
					__hasChild = threeWay.__hasChild.all();
				});
				var descendants = [];
				_.forEach(__hasChild, function(hasChild, id) {
					if (hasChild) {
						descendants.push({
							id: id,
							level: currDepth,
							instance: threeWay.children[id],
							templateType: threeWay.children[id].view.name
						});
						Array.prototype.push.apply(descendants, threeWay.children[id]._3w_getAllDescendants_NR(levels - 1, currDepth + 1));
					}
				});
				return descendants;
			};


			var mostRecentDatabaseEntry;
			var baseUpdaters;
			var debouncedOrThrottledUpdaters;

			////////////////////////////////////////////////////////////////
			// For batching Meteor calls
			//
			var templateLevelUpdatePromiseLedger = {};
			var templateLevelUpdatePromiseLedger_LastTimings = {};

			function meteorApply_usePromiseBins(fieldPath, method, args, _options) {
				if (!!_options) {
					_options = {};
				}
				var bin = fieldPath.split('.')[0];
				if (typeof templateLevelUpdatePromiseLedger[bin] === "undefined") {
					templateLevelUpdatePromiseLedger[bin] = Promise.resolve(true);
					templateLevelUpdatePromiseLedger_LastTimings[bin] = (new Date()).getTime();
				}

				templateLevelUpdatePromiseLedger[bin] = templateLevelUpdatePromiseLedger[bin]
				// need "resist change list" to "resist updates" in the observer
				// clear it once method returns (after the methodInterval delay)
				.then(function() {
					return new Promise(function(resolve, reject) {
							if (IN_DEBUG_MODE_FOR('methods')) {
								console.info('[methods|' + bin + '] Updating server...\n', method, args);
							}
							Meteor.apply(method, args, _options, function meteorApplyCB(err, res) {
								if (!!err) {
									reject(err);
								} else {
									resolve(res);
								}
							});
						})
						.then(function() {
							return new Promise(function(resolve) {
								var t_now = (new Date()).getTime();
								if (IN_DEBUG_MODE_FOR('methods')) {
									console.info('[methods|' + bin + '] Updated server.\n', method, args);
									console.info('[methods|' + bin + '] Since Last: ' + (t_now - templateLevelUpdatePromiseLedger_LastTimings[bin]));
								}

								// Pausing for updates from the database to be complete
								templateLevelUpdatePromiseLedger_LastTimings[bin] = t_now;
								setTimeout(function() {
									if (IN_DEBUG_MODE_FOR('methods')) {
										console.info('[methods|' + bin + '] Waited: ' + ((new Date()).getTime() - templateLevelUpdatePromiseLedger_LastTimings[bin]), method, args);
									}
									resolve(true);
								}, options.methodInterval);
							});
						})
						.catch(function(err) {
							if (IN_DEBUG_MODE_FOR('methods')) {
								console.error('[Error updating server]', err);
							}
						});
				});
			}
			//
			// End Meteor call batching
			////////////////////////////////////////////////////////////////


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


			// The big set-up
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

				mostRecentDatabaseEntry = {};
				threeWay.__idReadyFor = _.object(options.fields, options.fields.map(() => false));

				// Setting Up Debounced/Throttled Updaters
				// Old ones will trigger even if id changes since
				// new functions are created when id changes
				debouncedOrThrottledUpdaters = {};
				baseUpdaters = _.object(
					options.fields,
					options.fields.map(function(f) {
						return function updateServer(v, match) {
							var params = [_id, v];
							match.params.forEach(function(p) {
								params.push(p);
							});
							// Meteor.apply(options.updatersForServer[f], params);
							meteorApply_usePromiseBins(match.fieldPath, options.updatersForServer[f], params);
						};
					})
				);

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

					//////////////////////////////////////////////////// 
					// Descend into objects and arrays
					//
					var descendInto = (function() {
						return function descendInto(fields, doc, addedRun, fieldPrefix) {
							if (typeof fieldPrefix === "undefined") {
								fieldPrefix = '';
							}

							_.forEach(fields, function(v, f) {
								var curr_f = fieldPrefix + f;

								// Get matching items to data-bind
								// item.subitem --> (item.subitem, [])
								// item.subitem --> (item.*, ['subitem'])
								if (threeWay._fieldsTested.indexOf(curr_f) === -1) {
									var matches = matchParamStrings(options.fields, curr_f); // Match all (single run)
									if (matches.length > 1) {
										if (IN_DEBUG_MODE_FOR('observer')) {
											console.error('[Observer] Ambiguous matches for ' + curr_f, ' (will use first):', matches);
										}
									}
									threeWay.fieldMatchParams[curr_f] = (matches.length > 0) ? matches[0] : null;
									threeWay._fieldPseudoMatched[curr_f] = (!!threeWay.fieldMatchParams[curr_f]) ? true : ((extendedFields.indexOf(curr_f) === -1) || (matchParamStrings(pseudoFields, curr_f, true).length > 0));
									threeWay._fieldsTested.push(curr_f);
								}
								var match = threeWay.fieldMatchParams[curr_f] || null;
								var psuedoMatched = threeWay._fieldPseudoMatched[curr_f] || null;

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
									threeWay.fieldMatchParams[curr_f] = match;
									if (IN_DEBUG_MODE_FOR('db')) {
										console.log('[db] Field match:', curr_f, match);
										console.log('[db] All matches:', threeWay.fieldMatchParams);
									}

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
												var matchFamily = threeWay.fieldMatchParams[curr_f].match;

												if (typeof debouncedOrThrottledUpdaters[curr_f] === "undefined") {
													// Create specific updater for field if not already done.
													// Presents updates being lost if "fast" updates are being done
													// for a bunch of fields matching a spec. like "someArray.*"
													var updater = function updater(v) {
														baseUpdaters[matchFamily](v, threeWay.fieldMatchParams[curr_f]);
													};
													debouncedOrThrottledUpdaters[curr_f] = (options.throttledUpdaters.indexOf(matchFamily) !== -1) ? _.throttle(updater, options.throttleInterval) : _.debounce(updater, options.debounceInterval);
												}
												var valueToSend = options.dataTransformToServer[matchFamily](value, _.extend({}, threeWay.dataMirror));
												debouncedOrThrottledUpdaters[curr_f](valueToSend);

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
						};
					})();
					//
					// End Descend Into
					//////////////////////////////////////////////////// 

					// Setting Up Observers
					threeWay.observer = cursor.observeChanges({
						added: function(id, fields) {
							var doc = options.collection.findOne(id, {
								reactive: false
							});
							if (IN_DEBUG_MODE_FOR('observer')) {
								console.log('[Observer] Added:', id, doc);
							}
							threeWay.haveData.set(true);
							descendInto(fields, doc, true);
						},
						changed: function(id, fields) {
							var doc = options.collection.findOne(id, {
								reactive: false
							});
							if (IN_DEBUG_MODE_FOR('observer')) {
								// console.log('[Observer] Changed:', id, fields, doc);
								console.log('[Observer] Changed:', id, fields);
							}
							descendInto(fields, doc, false);
						},
						removed: function(id) {
							if (IN_DEBUG_MODE_FOR('observer')) {
								console.log('[Observer] Removed:', id);
							}
							threeWay.haveData.set(false);
							threeWay.id.set(null);
							threeWay.__idReadyFor = _.object(options.fields, options.fields.map(() => false));
						}
					});

				}
			});
		});

		tmpl.onRendered(function() {
			var instance = this;
			var threeWay = instance[THREE_WAY_NAMESPACE];

			// Set initial values for data (in particular, view model only fields)
			Array.prototype.forEach.call(instance.$("twdata[field]"), function(elem) {
				var field = elem.getAttribute('field');
				var initValue = elem.getAttribute('initial-value') || null;
				var processorString = elem.getAttribute('processors') || "";
				var templateRestrictionString = elem.getAttribute('restrict-template-type') || "";
				var templateRestrictions = (templateRestrictionString === "") ? [] : templateRestrictionString.split(',').map(x => x.trim());

				if (IN_DEBUG_MODE_FOR('vm-only')) {
					console.log("[vm-only] Initialization for " + field + " with", elem);
				}

				var thisTemplateType = instance.view.name.split('.').pop().trim();
				if ((templateRestrictions.length > 0) && (templateRestrictions.indexOf(thisTemplateType) === -1)) {
					// Skip if restricted to other template type
					if (IN_DEBUG_MODE_FOR('vm-only')) {
						console.log("[vm-only] Skipping initialization: restricted to", templateRestrictions,"; Template Type: " + thisTemplateType);
					}
					return;
				}

				var processors = (processorString === "") ? [] : processorString.split('|').map(x => x.trim());
				var value = initValue;

				processors.forEach(function(m) {
					// processors here do not provide view model data as an argument
					value = options.preProcessors[m](value, elem, {});
				});

				if (IN_DEBUG_MODE_FOR('vm-only')) {
					if (processors.length === 0) {
						console.log("[vm-only] Setting up initial value for " + field + " to ", initValue, " using ", elem);
					} else {
						console.log("[vm-only] Setting up initial value for " + field + " using ", elem);						
						console.log("[vm-only] Processors:", processors, "; Init Value:", initValue, "; Final value:", value);
					}
				}
				threeWay.data.set(field, value);

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

						var isDictType = (itemName === "class") || (itemName === "style") || (itemName === "attr") || (itemName === "event");
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
								console.log('[.value] Field: ' + fieldName + '; data-bind | ' + dataBind);
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
						$(elem).on('input', function() {
							$(this).trigger('change');
						});

						threeWay.computations.push(Tracker.autorun(function(c) {
							var pipelineSplit = elemBindings.bindings.value.source.split('|').map(x => x.trim());
							var source = pipelineSplit[0];
							var pipeline = pipelineSplit.splice(1);

							var value = threeWay.data.get(source);
							if (c.firstRun) {
								if (IN_DEBUG_MODE_FOR('value')) {
									console.log("[.value] Preparing .value binding (to " + source + ") for", elem);
								}
								if (typeof value === "undefined") {
									return;
								}
							}

							elemGlobals.suppressChange = true;

							pipeline.forEach(function(m) {
								// pipelines do not manipulate value
								options.preProcessors[m](value, elem, _.extend({}, threeWay.dataMirror));
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
								console.log('[.checked] Field: ' + fieldName + '; data-bind | ' + dataBind);
								console.log('[.checked] data-bind | ' + dataBind);
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
							var pipelineSplit = elemBindings.bindings.checked.source.split('|').map(x => x.trim());
							var source = pipelineSplit[0];
							var pipeline = pipelineSplit.splice(1);

							var value = threeWay.data.get(source);
							if (c.firstRun) {
								if (IN_DEBUG_MODE_FOR('checked')) {
									console.log("[.checked] Preparing .checked binding (to " + source + ") for", elem);
								}
								if ((typeof value !== "object") || (!(value instanceof Array))) {
									return;
								}
							}

							elemGlobals.suppressChange = true;

							pipeline.forEach(function(m) {
								// pipelines do not manipulate value
								options.preProcessors[m](value, elem, _.extend({}, threeWay.dataMirror));
							});

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
									console.log("[.html] Preparing .html binding for", elem);
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
								if (IN_DEBUG_MODE_FOR('visible-and-disabled')) {
									console.log("[.visible] Preparing .visible binding with " + source + " for", elem);
								}
							}

							var visible;
							if (source === "_3w_haveData") {
								visible = threeWay.haveData.get();
							} else {
								visible = threeWay.data.get(source);
								if (c.firstRun) {
									if (typeof visible === "undefined") {
										return;
									}
								}
							}
							mappings.forEach(function(m) {
								visible = options.preProcessors[m](visible, elem, _.extend({}, threeWay.dataMirror));
							});
							visible = (!!visible) ? "" : "none";

							if (elem.style.display !== visible) {
								if (IN_DEBUG_MODE_FOR('visible-and-disabled')) {
									console.log('[.visible] Setting .style[visible] to \"' + visible + '\" for', elem);
								}
								elem.style.display = visible;
							}
						}));
					}

					//////////////////////////////////////////////////////
					// .disabled
					//////////////////////////////////////////////////////
					if (!!elemBindings.bindings.disabled) {
						threeWay.computations.push(Tracker.autorun(function(c) {
							var pipelineSplit = elemBindings.bindings.disabled.source.split('|').map(x => x.trim());
							var source = pipelineSplit[0];
							var mappings = pipelineSplit.splice(1);

							if (c.firstRun) {
								if (IN_DEBUG_MODE_FOR('visible-and-disabled')) {
									console.log("[.disabled] Preparing .disabled binding with " + source + " for", elem);
								}
							}

							var disabled;
							if (source === "_3w_haveData") {
								disabled = threeWay.haveData.get();
							} else {
								disabled = threeWay.data.get(source);
								if (c.firstRun) {
									if (typeof disabled === "undefined") {
										return;
									}
								}
							}
							mappings.forEach(function(m) {
								disabled = options.preProcessors[m](disabled, elem, _.extend({}, threeWay.dataMirror));
							});
							disabled = (!!disabled);

							if (elem.disabled !== disabled) {
								if (IN_DEBUG_MODE_FOR('visible-and-disabled')) {
									console.log('[.disabled] Setting .disabled to \"' + disabled + '\" for', elem);
								}
								elem.disabled = disabled;
							}
						}));
					}

					//////////////////////////////////////////////////////
					// style
					//////////////////////////////////////////////////////
					if (!!elemBindings.bindings.style) {
						_.forEach(elemBindings.bindings.style.source, function(pipelineString, key) {
							threeWay.computations.push(Tracker.autorun(function(c) {
								var pipelineSplit = pipelineString.split('|').map(x => x.trim());
								var source = pipelineSplit[0];
								var mappings = pipelineSplit.splice(1);

								var value = threeWay.data.get(source);
								if (c.firstRun) {
									if (IN_DEBUG_MODE_FOR('style')) {
										console.log("[.style|" + key + "] Preparing .style binding for", elem);
										console.log("[.style|" + key + "] Field: " + source + "; Mappings: ", mappings);
									}
									if (typeof value === "undefined") {
										return;
									}
								}

								mappings.forEach(function(m) {
									value = options.preProcessors[m](value, elem, _.extend({}, threeWay.dataMirror));
								});

								// Update Style
								if (elem.style[key] !== value) {
									if (IN_DEBUG_MODE_FOR('style')) {
										console.log('[.style|' + key + '] Setting style.' + key + ' to \"' + value + '\" for', elem);
									}
									elem.style[key] = value;
								}
							}));
						});
					}

					//////////////////////////////////////////////////////
					// attr
					//////////////////////////////////////////////////////
					if (!!elemBindings.bindings.attr) {
						_.forEach(elemBindings.bindings.attr.source, function(pipelineString, key) {
							threeWay.computations.push(Tracker.autorun(function(c) {
								var pipelineSplit = pipelineString.split('|').map(x => x.trim());
								var source = pipelineSplit[0];
								var mappings = pipelineSplit.splice(1);

								var value = threeWay.data.get(source);
								if (c.firstRun) {
									if (IN_DEBUG_MODE_FOR('attr')) {
										console.log("[.attr|" + key + "] Preparing attribute binding for", elem);
										console.log("[.attr|" + key + "] Field: " + source + "; Mappings: ", mappings);
									}
									if (typeof value === "undefined") {
										return;
									}
								}

								mappings.forEach(function(m) {
									value = options.preProcessors[m](value, elem, _.extend({}, threeWay.dataMirror));
								});

								// Update Style
								if ($(elem).attr(key) !== value) {
									if (IN_DEBUG_MODE_FOR('attr')) {
										console.log('[.attr|' + key + '] Setting attribute ' + key + ' to \"' + value + '\" for', elem);
									}
									$(elem).attr(key, value);
								}
							}));
						});
					}

					//////////////////////////////////////////////////////
					// class
					//////////////////////////////////////////////////////
					if (!!elemBindings.bindings.class) {
						_.forEach(elemBindings.bindings.class.source, function(pipelineString, key) {
							threeWay.computations.push(Tracker.autorun(function(c) {
								var pipelineSplit = pipelineString.split('|').map(x => x.trim());
								var source = pipelineSplit[0];
								var mappings = pipelineSplit.splice(1);

								var value = threeWay.data.get(source);
								if (c.firstRun) {
									if (IN_DEBUG_MODE_FOR('class')) {
										console.log("[.class|" + key + "] Preparing class binding for", elem);
										console.log("[.class|" + key + "] Field: " + source + "; Mappings: ", mappings);
									}
									if (typeof value === "undefined") {
										return;
									}
								}

								mappings.forEach(function(m) {
									value = options.preProcessors[m](value, elem, _.extend({}, threeWay.dataMirror));
								});
								value = !!value;

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
						});
					}

					//////////////////////////////////////////////////////
					// event
					//////////////////////////////////////////////////////
					if (!!elemBindings.bindings.event) {
						_.forEach(elemBindings.bindings.event.source, function(handlerString, eventName) {
							threeWay.computations.push(Tracker.autorun(function(c) {
								var handlerNames = handlerString.split('|').map(x => x.trim());

								if (c.firstRun) {
									if (IN_DEBUG_MODE_FOR('event')) {
										console.log("[.event|" + eventName + "] Preparing event binding for", elem);
										console.log("[.event|" + eventName + "] Handlers: ", handlerNames);
									}
								}

								handlerNames.forEach(function(m) {
									var handler = options.eventHandlers[m];
									$(elem).on(eventName, function(event) {
										if (IN_DEBUG_MODE_FOR('event')) {
											console.log("[.event|" + eventName + "] Firing " + m + " for", elem);
										}
										handler.call(this, event, instance, _.extend({}, threeWay.dataMirror));
									});
								});
							}));
						});
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


			// Say hi to parent now that its rendered
			var myId = 'progenitor_' + Math.floor(Math.random() * 1e15);
			if ((!!instance.parentTemplate()) && (!!instance.parentTemplate()[THREE_WAY_NAMESPACE])) {
				var parentThreeWayInstance = instance.parentTemplate()[THREE_WAY_NAMESPACE];
				myId = instance.data._3w_name;

				if (!!myId) {
					if (!!parentThreeWayInstance.children[myId]) {
						throw new Meteor.Error('three-way-repeated-id', instance.data._3w_instanceId);
					}
				} else {
					myId = instance.view.name + '_' + Math.floor(Math.random() * 1e15);
					while (!!parentThreeWayInstance.children[myId]) {
						myId = instance.view.name + '_' + Math.floor(Math.random() * 1e15);
					}
				}
				parentThreeWayInstance.__hasChild.set(myId, true);
				parentThreeWayInstance.children[myId] = instance;
			}
			threeWay.instanceId = myId;

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
			_3w_id: () => Template.instance()._3w_getId(),
			_3w_haveData: () => Template.instance()[THREE_WAY_NAMESPACE].haveData.get(),
			_3w_get: (propName) => Template.instance()._3w_get(propName),
			_3w_getAll: () => Template.instance()._3w_getAll(),
			_3w_parentDataGet: (p, levelsUp) => Template.instance()._3w_parentDataGet(p, levelsUp),
			_3w_parentDataGetAll: (levelsUp) => Template.instance()._3w_parentDataGetAll(levelsUp),
			_3w_childDataGet: (p, childNameArray) => Template.instance()._3w_childDataGet(p, childNameArray),
			_3w_childDataGetAll: (childNameArray) => Template.instance()._3w_childDataGetAll(childNameArray),
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
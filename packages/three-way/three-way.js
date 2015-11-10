/* global ThreeWay: true */
/* global PackageUtilities: true */

var __tw = function ThreeWay() {};
ThreeWay = new __tw();

const THREE_WAY_NAMESPACE = "__three_way__";
const DATA_BIND_ATTRIBUTE = "data-bind";
const THREE_WAY_ATTRIBUTE_NAMESPACE = "three-way";
const THREE_WAY_DATA_BINDING_ID = "three-way-id";
const THREE_WAY_DATA_BINDING_INSTANCE = "three-way-instance";
const RESTRICT_TEMPLATE_TYPE_ATTRIBUTE = 'restrict-template-type';
const DEFAULT_DEBOUNCE_INTERVAL = 500;
const DEFAULT_THROTTLE_INTERVAL = 500;
const DEFAULT_METHOD_INTERVAL = 10;

const AGE_THRESHOLD_OLD_ITEM = 10000;

var DEBUG_MODE = false;
var DEBUG_MODE_ALL = false;
var DEBUG_MESSAGES = {
	'parse': false,
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
	'validation': false,
	'bind': false,
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

function removeOldItems(arr, threshold) {
	if (!arr) {
		return;
	}
	var currIdx = 0;
	var currTs = (new Date()).getTime();
	while (currIdx < arr.length) {
		if (currTs - arr[currIdx].ts >= threshold) {
			arr.shift();
		} else {
			currIdx += 1;
		}
	}
}

function popItemWithValue(arr, value, item, popOne) {
	var currIdx = 0;
	var count = 0;
	while (!!arr && (currIdx < arr.length)) {
		if (_.isEqual(arr[currIdx][item], value)) {
			arr.splice(currIdx, 1);
			count += 1;
			if (popOne) {
				break;
			}
		} else {
			currIdx += 1;
		}
	}
	return count;
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
	return matches.sort(function(x, y) {
		if (x.params.length !== y.params.length) {
			// shorter param set wins
			return x.params.length - y.params.length;
		}
		// later occurrence of "*" wins
		return -(x.match.indexOf('*') - y.match.indexOf('*'));
	});
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

	PackageUtilities.addImmutablePropertyFunction(ThreeWay, 'expandParams', function expandParams(fieldSpec, params) {
		if (!(params instanceof Array)) {
			params = [params];
		}
		var fldSplit = fieldSpec.split('.');
		var idx = 0;
		_.forEach(fldSplit, function(v, i) {
			if (v === "*") {
				fldSplit[i] = params[idx];
				idx += 1;
			}
		});
		return fldSplit.join('.');
	});

	var idIndices = [0];
	PackageUtilities.addImmutablePropertyFunction(ThreeWay, 'getNewId', function getNewId() {
		function padLeft(s, num, char) {
			var res = s.toString();
			while (res.length < num) {
				res = char + res;
			}
			return res;
		}
		idIndices[0] += 1;
		var idx = 0;
		while ((idx < idIndices.length) && (idIndices[idx] >= 10000)) {
			idIndices[idx] = 0;
			if (typeof idIndices[idx + 1] !== "undefined") {
				idIndices[idx + 1] += 1;
			} else {
				idIndices[idx + 1] = 1;
			}
			idx++;
		}
		return 'tw-' + idIndices.map(x => padLeft(x, 4, '0')).join('-');
	});

	PackageUtilities.addImmutablePropertyFunction(ThreeWay, 'prepare', function prepare(tmpl, options) {
		if (typeof tmpl === "undefined") {
			throw new Meteor.Error('missing-argument', 'template required');
		}
		if (typeof options === "undefined") {
			throw new Meteor.Error('missing-argument', 'options required');
		}
		options = PackageUtilities.updateDefaultOptionsWithInput({
			collection: null,
			updatersForServer: {},
			dataTransformToServer: {},
			dataTransformFromServer: {},
			validatorsVM: {},
			validatorsServer: {},
			preProcessors: {},
			viewModelToViewOnly: {},
			debounceInterval: DEFAULT_DEBOUNCE_INTERVAL,
			throttleInterval: DEFAULT_THROTTLE_INTERVAL,
			throttledUpdaters: [],
			methodInterval: DEFAULT_METHOD_INTERVAL,
			eventHandlers: {},
			helpers: {},
		}, options, true);

		if (!(options.collection instanceof Mongo.Collection)) {
			throw new Meteor.Error('options-error', 'collection should be a Mongo.Collection');
		}
		options.fields = _.map(options.updatersForServer, (v, k) => k);
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


		// Adding Pre-Processors
		if (typeof options.preProcessors['not'] === "undefined") {
			options.preProcessors['not'] = x => !x;
		}
		if (typeof options.preProcessors['truthy'] === "undefined") {
			options.preProcessors['truthy'] = x => !!x;
		}
		if (typeof options.preProcessors['isNonEmptyString'] === "undefined") {
			options.preProcessors['isNonEmptyString'] = x => (typeof x === "string") && x.length > 0;
		}
		if (typeof options.preProcessors['isNonEmptyArray'] === "undefined") {
			options.preProcessors['isNonEmptyArray'] = x => (x instanceof Array) && x.length > 0;
		}
		if (typeof options.preProcessors['toUpperCase'] === "undefined") {
			options.preProcessors['toUpperCase'] = x => (typeof x === "undefined") ? "" : x.toString().toUpperCase();
		}
		if (typeof options.preProcessors['toLowerCase'] === "undefined") {
			options.preProcessors['toLowerCase'] = x => (typeof x === "undefined") ? "" : x.toString().toLowerCase();
		}

		// "" as field forbidden
		if (typeof options.updatersForServer[''] !== "undefined") {
			throw new Meteor.Error("empty-field-forbidden", "\"\" is not a valid field name");
		}

		// Generate list of all possible parent fields
		var extendedFields = (function(fields) {
			var ret = [];
			fields.forEach(function(f) {
				var split = f.split('.');
				var this_f;
				while (split.length > 0) {
					this_f = split.join('.');
					if (ret.indexOf(this_f) === -1) {
						ret.push(this_f);
					}
					split.pop();
				}
			});
			return ret;
		})(options.fields);

		// Extract those that aren't proper fields
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
				instanceId: new ReactiveVar(null),
				children: {},
				__hasChild: new ReactiveDict(),
				data: new ReactiveDict(),
				__serverIsUpdated: new ReactiveDict(),
				__dataIsNotInvalid: new ReactiveDict(),
				viewModelOnlyData: {},
				dataMirror: {},
				fieldMatchParams: {}, // No need to re-create
				_fieldPseudoMatched: [], // No need to re-create
				_fieldsTested: [], // No need to re-create
				haveData: new ReactiveVar(false),
				id: new ReactiveVar(null),
				observer: null,
				computations: [],
				_dataUpdateComputations: {},
				boundElemComputations: {},
				boundElemEventHandlers: {},
				mutationObserver: null,
				rootNode: document.body,
				_rootNode: new ReactiveVar("document.body"),
			};

			instance[THREE_WAY_NAMESPACE] = threeWay;
			var __rootChanges = 0;
			instance._3w_setRoot = function(selectorString) {
				var nodes = instance.$(selectorString);
				if (nodes.length === 1) {
					__rootChanges += 1;
					threeWay.rootNode = nodes[0];
					threeWay._rootNode.set(__rootChanges + '|' + threeWay.rootNode.toString());
				} else {
					throw new Meteor.Error("expected-single-node-selector", selectorString);
				}
			};
			instance._3w_setId = function(id) {
				threeWay.id.set(id);
			};
			instance._3w_getId = function() {
				return threeWay.id.get();
			};
			instance._3w_get3wInstanceId = function() {
				return threeWay.instanceId.get();
			};
			instance._3w_get = p => threeWay.data.get(p);
			instance._3w_set = (p, v) => threeWay.data.set(p, v);
			instance._3w_get_NR = p => threeWay.dataMirror[p];
			instance._3w_getAll = () => threeWay.data.all();
			instance._3w_getAll_NR = () => _.extend({}, threeWay.dataMirror);

			instance._3w_isSyncedToServer = p => !!threeWay.__serverIsUpdated.get(p);
			instance._3w_allSyncedToServer = function() {
				return _.reduce(threeWay.__serverIsUpdated.all(), (m, v) => !!m && !!v, true);
			};
			instance._3w_isNotInvalid = p => !!threeWay.__dataIsNotInvalid.get(p);

			instance._3w_parentDataGet = (p, levelsUp) => instance.parentTemplate((!!levelsUp) ? levelsUp : 1)[THREE_WAY_NAMESPACE].data.get(p);
			instance._3w_parentDataGetAll = (levelsUp) => instance.parentTemplate((!!levelsUp) ? levelsUp : 1)[THREE_WAY_NAMESPACE].data.all();
			instance._3w_parentDataSet = (p, v, levelsUp) => instance.parentTemplate((!!levelsUp) ? levelsUp : 1)[THREE_WAY_NAMESPACE].data.set(p, v);
			instance._3w_parentDataGet_NR = (p, levelsUp) => instance.parentTemplate((!!levelsUp) ? levelsUp : 1)[THREE_WAY_NAMESPACE].dataMirror[p];
			instance._3w_parentDataGetAll_NR = (levelsUp) => _.extend({}, instance.parentTemplate((!!levelsUp) ? levelsUp : 1)[THREE_WAY_NAMESPACE].dataMirror);

			instance._3w_childDataGetId = function _3w_childDataGetId(childNameArray) {
				if (childNameArray instanceof Array) {
					if (childNameArray.length === 0) {
						return;
					}
					var hasChildData = !!threeWay.__hasChild.get(childNameArray[0]);
					if (!hasChildData) {
						return;
					}
					if (childNameArray.length === 1) {
						return threeWay.children[childNameArray[0]]._3w_getId();
					} else {
						var cn = childNameArray.map(x => x);
						cn.shift();
						return threeWay.children[childNameArray[0]]._3w_childDataGetId(cn);
					}
				} else {
					return instance._3w_childDataGetId([childNameArray]);
				}
			};
			instance._3w_childDataSetId = function _3w_childDataSetId(id, childNameArray) {
				if (childNameArray instanceof Array) {
					if (childNameArray.length === 0) {
						return;
					}
					var hasChildData;
					Tracker.nonreactive(function() {
						hasChildData = !!threeWay.__hasChild.get(childNameArray[0]);
					});
					if (!hasChildData) {
						return;
					}
					if (childNameArray.length === 1) {
						threeWay.children[childNameArray[0]]._3w_setId(id);
					} else {
						var cn = childNameArray.map(x => x);
						cn.shift();
						threeWay.children[childNameArray[0]]._3w_childDataSetId(id, cn);
					}
				} else {
					instance._3w_childDataSetId(id, [childNameArray]);
				}
			};
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
				Tracker.nonreactive(function() {
					value = instance._3w_childDataGet(p, childNameArray);
				});
				return value;
			};
			instance._3w_childDataGetAll_NR = function _3w_childDataGetAll_NR(childNameArray) {
				var value;
				Tracker.nonreactive(function() {
					value = instance._3w_childDataGetAll(childNameArray);
				});
				return value;
			};

			instance._3w_getAllDescendants_NR = function _3w_getAllDescendants_NR(levels, currDepth, path) {
				if (typeof levels === "undefined") {
					levels = Number.MAX_SAFE_INTEGER;
				}
				if (typeof currDepth === "undefined") {
					currDepth = 1;
				}
				if (typeof path === "undefined") {
					path = [];
				}
				if (levels === 0) {
					return [];
				}
				var __hasChild;
				Tracker.nonreactive(function() {
					__hasChild = threeWay.__hasChild.all();
				});
				var descendants = [];
				_.forEach(__hasChild, function(hasChild, id) {
					if (hasChild) {
						var thisPath = path.concat([id]);
						descendants.push({
							id: id,
							level: currDepth,
							path: thisPath,
							instance: threeWay.children[id],
							templateType: threeWay.children[id].view.name
						});
						Array.prototype.push.apply(descendants, threeWay.children[id]._3w_getAllDescendants_NR(levels - 1, currDepth + 1, thisPath));
					}
				});
				return descendants;
			};

			instance._3w_siblingDataGet = function _3w_siblingDataGet(p, siblingName) {
				return instance.parentTemplate()._3w_childDataGet(p, siblingName);
			};
			instance._3w_siblingDataGetAll = function _3w_siblingDataGet(siblingName) {
				return instance.parentTemplate()._3w_childDataGetAll(siblingName);
			};
			instance._3w_siblingDataSet = function _3w_siblingDataSet(p, v, siblingName) {
				return instance.parentTemplate()._3w_childDataSet(p, v, siblingName);
			};
			instance._3w_siblingDataGet_NR = function _3w_siblingDataGet_NR(p, siblingName) {
				var value;
				Tracker.nonreactive(function() {
					value = instance._3w_siblingDataGet(p, siblingName);
				});
				return value;
			};
			instance._3w_siblingDataGetAll_NR = function _3w_siblingDataGetAll_NR(siblingName) {
				var value;
				Tracker.nonreactive(function() {
					value = instance._3w_siblingDataGetAll(siblingName);
				});
				return value;
			};

			var mostRecentDatabaseEntry;
			var recentDBUpdates;
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

			// For matching fields
			// item.subitem --> (item.subitem, [])
			// item.subitem --> (item.*, ['subitem'])
			function doFieldMatch(curr_f, isObserver) {
				if (typeof isObserver === "undefined") {
					isObserver = true;
				}
				if (threeWay._fieldsTested.indexOf(curr_f) === -1) {
					var matches = matchParamStrings(options.fields, curr_f); // Match all (single run)
					if (matches.length > 1) {
						if (isObserver && IN_DEBUG_MODE_FOR('observer')) {
							console.warn('[Observer] Ambiguous matches for ' + curr_f, ' (will use most specific):', matches);
						}
					}
					threeWay.fieldMatchParams[curr_f] = (matches.length > 0) ? matches[0] : null;
					threeWay._fieldPseudoMatched[curr_f] = (!!threeWay.fieldMatchParams[curr_f]) ? true : ((extendedFields.indexOf(curr_f) === -1) || (matchParamStrings(pseudoFields, curr_f, true).length > 0));
					threeWay._fieldsTested.push(curr_f);
				}
			}

			// The big set-up
			threeWay.__idReady = false;
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
				recentDBUpdates = {};
				// TODO: Figure out a sound way of reasoning when .clear() is ok
				// threeWay.__serverIsUpdated.clear();
				// threeWay.__dataIsNotInvalid.clear();

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
					var descendInto = function descendInto(fields, doc, addedRun, fieldPrefix) {
						if (typeof fieldPrefix === "undefined") {
							fieldPrefix = '';
						}

						_.forEach(fields, function(v, f) {
							var curr_f = fieldPrefix + f;

							// Get matching items to data-bind
							// item.subitem --> (item.subitem, [])
							// item.subitem --> (item.*, ['subitem'])
							doFieldMatch(curr_f);
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
									console.log('[db|match] Field match:', curr_f, match);
									console.log('[db|match] All matches:', threeWay.fieldMatchParams);
								}

								if (IN_DEBUG_MODE_FOR('observer')) {
									console.log('[Observer] Field match -- ' + curr_f, ':', v);
								}

								// Update data if changed
								var mostRecentValue = mostRecentDatabaseEntry[curr_f];
								var newValue = options.dataTransformFromServer[match.match](v, doc);
								if (_.isEqual(mostRecentValue, newValue)) {
									if (IN_DEBUG_MODE_FOR('db')) {
										console.log('[db|receive] Most recent value matches. No change to view model.');
									}
								} else {
									removeOldItems(recentDBUpdates[curr_f], AGE_THRESHOLD_OLD_ITEM);
									if (popItemWithValue(recentDBUpdates[curr_f], newValue, 'valueOnClient', true) > 0) {
										if (IN_DEBUG_MODE_FOR('db')) {
											console.log('[db|receive] Matches value from recent update. No change to view model.');
										}
									} else {
										threeWay.data.set(curr_f, newValue);
										mostRecentDatabaseEntry[curr_f] = newValue;
									}
								}

								// Figure out if server has been updated
								if (addedRun) {
									// First rcv
									threeWay.__serverIsUpdated.set(curr_f, true);
									threeWay.__dataIsNotInvalid.set(curr_f, true);
								} else {
									threeWay.__serverIsUpdated.set(curr_f, _.isEqual(newValue, threeWay.dataMirror[curr_f]));
								}

								if (typeof threeWay._dataUpdateComputations[curr_f] === "undefined") {
									threeWay._dataUpdateComputations[curr_f] = Tracker.autorun(function() {
										var value = threeWay.data.get(curr_f);

										var __id;
										Tracker.nonreactive(function() {
											__id = threeWay.id.get();
										});
										if (IN_DEBUG_MODE_FOR('db')) {
											console.log('[db|update] Field: ' + curr_f + "; id: " + __id + "; isReady: " + threeWay.__idReady);
											console.log("[db|update] Value:", value);
											console.log("[db|update] Most Recent DB entry: ", mostRecentDatabaseEntry[curr_f]);
										}
										if ((!!__id) && (!!threeWay.__idReady) && (!_.isEqual(value, mostRecentDatabaseEntry[curr_f]))) {
											// Create specific updater for field if not already done.
											// Presents updates being lost if "fast" updates are being done
											// for a bunch of fields matching a spec. like "someArray.*"
											var matchFamily = threeWay.fieldMatchParams[curr_f].match;
											if (typeof debouncedOrThrottledUpdaters[curr_f] === "undefined") {
												var updater = function updater(v) {
													if (IN_DEBUG_MODE_FOR('db')) {
														console.log('[db|update] Performing update... ' + curr_f + ' -> ', v);
													}
													mostRecentDatabaseEntry[curr_f] = v;
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
												var vmData = _.extend({}, threeWay.dataMirror);
												var valueToSend = options.dataTransformToServer[matchFamily](value, vmData);

												if (IN_DEBUG_MODE_FOR('db')) {
													console.log('[db|update] Initiating update... ' + curr_f + ' -> ', value);
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
															if (typeof recentDBUpdates[f] === "undefined") {
																recentDBUpdates[f] = [];
															}
															var thisClientSideValue = (f === curr_f) ? v : vmData[f];
															removeOldItems(recentDBUpdates[f], AGE_THRESHOLD_OLD_ITEM);
															recentDBUpdates[f].push({
																valueOnClient: thisClientSideValue,
																ts: (new Date()).getTime(),
															});
															if (IN_DEBUG_MODE_FOR('db')) {
																console.log('[db|update-recents] Storing recent (client-side) value for ' + f + ':', thisClientSideValue);
															}
														}
													}
												});

												debouncedOrThrottledUpdaters[curr_f](valueToSend);
											} else {
												if (IN_DEBUG_MODE_FOR('db') || IN_DEBUG_MODE_FOR('validation')) {
													console.log('[db/validation] Validation failed. No update. Field: ' + curr_f + '; Value:', value);
													threeWay.__dataIsNotInvalid.set(curr_f, false);
												}
											}

										} else {
											if (IN_DEBUG_MODE_FOR('db')) {
												console.log('[db|update] No update.');
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
							threeWay.__idReady = true;
							descendInto(fields, doc, true);
						},
						changed: function(id, fields) {
							var doc = options.collection.findOne(id, {
								reactive: false
							});
							if (IN_DEBUG_MODE_FOR('observer')) {
								console.log('[Observer] Changed:', id, fields, doc);
							}
							descendInto(fields, doc, false);
						},
						removed: function(id) {
							if (IN_DEBUG_MODE_FOR('observer')) {
								console.log('[Observer] Removed:', id);
							}
							threeWay.haveData.set(false);
							threeWay.id.set(null);
							threeWay.__idReady = false;
						}
					});

				}
			});

			threeWay.fieldMatchParamsForValidationVM = {};
			threeWay.fieldMatchParamsForValidationServer = {};
			var validatorFieldsVM = _.map(options.validatorsVM, (v, k) => k);
			var validatorFieldsServer = _.map(options.validatorsServer, (v, k) => k);
			threeWay.validateInput = function vmValidate(field, value, validateForServer) {
				if (typeof validateForServer === "undefined") {
					validateForServer = true;
				}

				if (!threeWay.fieldMatchParams[field]) {
					validateForServer = false;
				}


				if (typeof threeWay.fieldMatchParams[field] === "undefined") {
					// might be overwritten once... but that's ok
					threeWay.fieldMatchParams[field] = null;
					var matches = matchParamStrings(options.fields, field);
					if (matches.length > 0) {
						threeWay.fieldMatchParams[field] = matches[0];
					}
				}

				if (typeof threeWay.fieldMatchParamsForValidationVM[field] === "undefined") {
					threeWay.fieldMatchParamsForValidationVM[field] = null;
					var vmMatches = matchParamStrings(validatorFieldsVM, field);
					if (vmMatches.length > 0) {
						threeWay.fieldMatchParamsForValidationVM[field] = vmMatches[0];
					}
				}
				if (typeof threeWay.fieldMatchParamsForValidationServer[field] === "undefined") {
					threeWay.fieldMatchParamsForValidationServer[field] = null;
					var serverMatches = matchParamStrings(validatorFieldsServer, field);
					if (serverMatches.length > 0) {
						threeWay.fieldMatchParamsForValidationServer[field] = serverMatches[0];
					}
				}

				if (IN_DEBUG_MODE_FOR('validation')) {
					console.log('[validation] Doing validation... Field: ' + field + '; Value:', value, '; Validation Info (VM):', threeWay.fieldMatchParamsForValidationVM[field], '; Validation Info (Server):', threeWay.fieldMatchParamsForValidationServer[field]);
				}

				var vmData;

				var matchFamily = threeWay.fieldMatchParams[field] && threeWay.fieldMatchParams[field].match || null;

				var matchFamilyVM = threeWay.fieldMatchParamsForValidationVM[field] && threeWay.fieldMatchParamsForValidationVM[field].match;
				var matchParamsVM = threeWay.fieldMatchParamsForValidationVM[field] && threeWay.fieldMatchParamsForValidationVM[field].params;
				var matchFamilyServer = threeWay.fieldMatchParamsForValidationServer[field] && threeWay.fieldMatchParamsForValidationServer[field].match;
				var matchParamsServer = threeWay.fieldMatchParamsForValidationServer[field] && threeWay.fieldMatchParamsForValidationServer[field].params;

				var useValidatorForVM = !!threeWay.fieldMatchParamsForValidationVM[field] && !!options.validatorsVM[matchFamilyVM];
				var useValidatorForServer = validateForServer && !!threeWay.fieldMatchParamsForValidationServer[field] && !!options.validatorsServer[matchFamilyServer];

				var valueToUse = value;
				var passed = true;
				var validator, successCB, failureCB;
				if (useValidatorForVM) {
					vmData = _.extend({}, threeWay.dataMirror);
					validator = !!options.validatorsVM[matchFamilyVM].validator ? options.validatorsVM[matchFamilyVM].validator : () => true;
					successCB = !!options.validatorsVM[matchFamilyVM].success ? options.validatorsVM[matchFamilyVM].success : function() {};
					failureCB = !!options.validatorsVM[matchFamilyVM].failure ? options.validatorsVM[matchFamilyVM].failure : function() {};
					passed = validator(valueToUse, vmData, matchParamsVM);

					if (passed) {
						successCB(instance, valueToUse, vmData, matchFamilyVM, matchParamsVM);
					} else {
						failureCB(instance, valueToUse, vmData, matchFamilyVM, matchParamsVM);
					}
				}
				if (passed && useValidatorForServer) {
					valueToUse = options.dataTransformToServer[matchFamily](value, vmData);
					validator = !!options.validatorsServer[matchFamilyServer].validator ? options.validatorsServer[matchFamilyServer].validator : () => true;
					successCB = !!options.validatorsServer[matchFamilyServer].success ? options.validatorsServer[matchFamilyServer].success : function() {};
					failureCB = !!options.validatorsServer[matchFamilyServer].failure ? options.validatorsServer[matchFamilyServer].failure : function() {};
					passed = validator(valueToUse, matchParamsServer);

					if (passed) {
						successCB(instance, valueToUse, vmData, matchFamilyServer, matchParamsServer);
					} else {
						failureCB(instance, valueToUse, vmData, matchFamilyServer, matchParamsServer);
					}
				}

				if (IN_DEBUG_MODE_FOR('validation')) {
					console.log('[validation] Validation result. Field: ' + field + '; Value:', value, '; Passed: ' + passed);
				}

				return passed;
			};



			////////////////////////////////////////////////////////////
			////////////////////////////////////////////////////////////
			// Prepare For Bindings!!!
			////////////////////////////////////////////////////////////
			////////////////////////////////////////////////////////////

			// Call helpers and pre-processors in template context
			var processInTemplateContext = function processInTemplateContext(source, mappings, elem, computation, useHelpers, processorsMutateValue, additionalFailureCondition) {
				var thisTemplate = instance.view.template;

				if (typeof useHelpers === "undefined") {
					useHelpers = true;
				}
				if (typeof processorsMutateValue === "undefined") {
					processorsMutateValue = true;
				}
				if (typeof additionalFailureCondition !== "function") {
					additionalFailureCondition = () => false;
				}

				var currTemplateInstanceFunc = Template._currentTemplateInstanceFunc;
				Template._currentTemplateInstanceFunc = () => instance;
				var getFailed = false;
				var sourceElems = source.split("#").map(x => x.trim()).filter(x => x !== "");
				var value = sourceElems.map(function(src) {
					var _value;
					if (useHelpers && !!options.helpers[src]) {
						_value = options.helpers[src].call(instance);
					} else if (useHelpers && thisTemplate.__helpers.has(src)) {
						_value = thisTemplate.__helpers.get(src).call(instance);
					} else {
						_value = threeWay.data.get(src);
					}

					if ((typeof _value === "undefined") || additionalFailureCondition(_value)) {
						getFailed = true;
					} else {
						return _value;
					}
				});
				if (getFailed) {
					return;
				}

				if ((mappings.length === 0) && (value.length === 1)) {
					// if single valued and no mappings, "unbox"
					value = value[0];
				}
				_.forEach(mappings, function(m, idx) {
					if (!(options.preProcessors[m] instanceof Function)) {
						console.error('[ThreeWay] No such pre-processor: ' + m, elem);
						return;
					}

					var mutatedValue;
					if (idx === 0) {
						var args = value.map(x => x);
						mutatedValue = options.preProcessors[m].apply(instance, args.concat([elem, _.extend({}, threeWay.dataMirror)]));
						if (!processorsMutateValue) {
							// Yeah... this feels hacky... But it is all a
							// sacrifice to realize multi-variable data-binding
							// ... not sure if it is worth it
							value = value[0];
						}
					} else {
						mutatedValue = options.preProcessors[m].call(instance, value, elem, _.extend({}, threeWay.dataMirror));
					}

					if (processorsMutateValue) {
						value = mutatedValue;
					}
				});
				Template._currentTemplateInstanceFunc = currTemplateInstanceFunc;

				return value;
			};

			////////////////////////////////////////////////////////////////
			////////////////////////////////////////////////////////////////
			// Begin Big Rebind Operation
			////////////////////////////////////////////////////////////////
			////////////////////////////////////////////////////////////////
			var bindElem = function bindElem(elem) {
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
					var itemName = x.substr(0, idxColon).trim().toLowerCase();
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
						source: itemData
					};

					// Check value and checked for multivariate binding
					['value', 'checked'].forEach(function(bindingType) {
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
						var value = elem.value;
						var pipelineSplit = elemBindings.bindings.value.source.split('|').map(x => x.trim()).filter(x => x !== "");
						var fieldName = pipelineSplit[0];
						var curr_value = threeWay.dataMirror[fieldName];

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
								threeWay.data.set(fieldName, value);
								Tracker.flush();

								if (!!threeWay.fieldMatchParams[fieldName]) {
									// invalidate only if linked to server
									// ... and different
									var isUpdated;
									Tracker.nonreactive(function() {
										// get current value by digging into document
										var doc = options.collection.findOne(threeWay.id.get());
										var currValue = doc;
										var fieldNameSplit = fieldName.split('.');
										while (fieldNameSplit.length > 0) {
											currValue = currValue[fieldNameSplit.shift()];
										}
										currValue = options.dataTransformFromServer[threeWay.fieldMatchParams[fieldName].match](currValue, doc);
										isUpdated = _.isEqual(currValue, threeWay.dataMirror[fieldName]);
									});
									threeWay.__serverIsUpdated.set(fieldName, isUpdated);
								}
							} else {
								if (IN_DEBUG_MODE_FOR('value')) {
									console.log('[.value] Unchanged value: ' + fieldName + ';', curr_value, '(in mirror)');
								}
							}
						}
					};

					bindEventToThisElem('change', valueChangeHandler);
					bindEventToThisElem('input', function() {
						$(this).trigger('change');
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
						var value = processInTemplateContext(source, pipeline, elem, c, false, false);
						// (..., false, false): helpers not used and pipelines do not manipulate value

						// Validate here
						var isValid = threeWay.validateInput(source, value);
						threeWay.__dataIsNotInvalid.set(source, isValid);

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
						elemGlobals.suppressChangesToSSOT = false;
					}));
					boundElemComputations.push(threeWay.computations[threeWay.computations.length - 1]);

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

						if (elemGlobals.suppressChangesToSSOT) {
							if (IN_DEBUG_MODE_FOR('checked')) {
								console.log('[.checked] Change to S.S.o.T. Suppressed | ' + fieldName + ':', curr_value, ' (in mirror); Current:', new_value);
							}
						} else {
							if (!_.isEqual(new_value, curr_value)) {
								if (IN_DEBUG_MODE_FOR('checked')) {
									console.log('[.checked] Updating ' + fieldName + ':', curr_value, ' (in mirror); Current:', new_value);
								}
								threeWay.data.set(fieldName, new_value);
								Tracker.flush();

								if (!!threeWay.fieldMatchParams[fieldName]) {
									// invalidate only if linked to server
									// ... and different
									var isUpdated;
									Tracker.nonreactive(function() {
										// get current value by digging into document
										var doc = options.collection.findOne(threeWay.id.get());
										var currValue = doc;
										var fieldNameSplit = fieldName.split('.');
										while (fieldNameSplit.length > 0) {
											currValue = currValue[fieldNameSplit.shift()];
										}
										currValue = options.dataTransformFromServer[threeWay.fieldMatchParams[fieldName].match](currValue, doc);
										isUpdated = _.isEqual(currValue, threeWay.dataMirror[fieldName]);
									});
									threeWay.__serverIsUpdated.set(fieldName, isUpdated);
								}
							} else {
								if (IN_DEBUG_MODE_FOR('checked')) {
									console.log('[.checked] Unchanged value: ' + fieldName + ';', curr_value, '(in mirror)');
								}
							}
						}
					};

					bindEventToThisElem('change', checkedChangeHandler);

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
						var additionalFailureCondition = (elem.getAttribute('type').toLowerCase() === "radio") ? () => false : v => (typeof v !== "object") || (!(v instanceof Array));
						var value = processInTemplateContext(source, pipeline, elem, c, false, false, additionalFailureCondition);
						// (..., false, false): helpers not used and pipelines do not manipulate value

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
							if (IN_DEBUG_MODE_FOR('html')) {
								console.log("[.html] Preparing .html binding for", elem);
								console.log("[.html] Field: " + source + "; Mappings: ", mappings);
							}
						}

						var html = processInTemplateContext(source, mappings, elem, c);

						if (elem.innerHTML !== html) {
							if (IN_DEBUG_MODE_FOR('html')) {
								console.log('[.html] Setting .innerHTML to \"' + html + '\" for', elem);
							}
							elem.innerHTML = html;
						}
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

						var visible = processInTemplateContext(source, mappings, elem, c);
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

						var disabled = processInTemplateContext(source, mappings, elem, c);
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

							var value = processInTemplateContext(source, mappings, elem, c);

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

							var value = processInTemplateContext(source, mappings, elem, c);

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

							var value = processInTemplateContext(source, mappings, elem, c);
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
								var handler = options.eventHandlers[m];
								bindEventToThisElem(eventName, function(event) {
									if (IN_DEBUG_MODE_FOR('event')) {
										console.log("[.event|" + eventName + "] Firing " + m + " for", elem);
									}
									var currTemplateInstanceFunc = Template._currentTemplateInstanceFunc;
									Template._currentTemplateInstanceFunc = () => instance;
									handler.call(this, event, instance, _.extend({}, threeWay.dataMirror));
									Template._currentTemplateInstanceFunc = currTemplateInstanceFunc;
								});
							});
						}));
						boundElemComputations.push(threeWay.computations[threeWay.computations.length - 1]);
					});
				}

				var thisElemId = ThreeWay.getNewId();
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

			threeWay.__bindElem = bindElem;

			////////////////////////////////////////////////////////////////
			////////////////////////////////////////////////////////////////
			// End Big Rebind Operation
			////////////////////////////////////////////////////////////////
			////////////////////////////////////////////////////////////////
		});

		tmpl.onRendered(function() {
			var instance = this;
			var thisTemplateName = instance.view.name.split('.').pop().trim();
			var threeWay = instance[THREE_WAY_NAMESPACE];


			//////////////////////////////////////////////////////////////////
			// Set initial values for data (in particular, VM-only fields)
			//////////////////////////////////////////////////////////////////
			Array.prototype.forEach.call(instance.$("twdata[field]"), function(elem) {
				var field = elem.getAttribute('field');
				var initValue = elem.getAttribute('initial-value') || null;
				var processorString = elem.getAttribute('processors') || "";
				var templateRestrictionString = elem.getAttribute(RESTRICT_TEMPLATE_TYPE_ATTRIBUTE) || "";
				var templateRestrictions = (templateRestrictionString === "") ? [] : templateRestrictionString.split(',').map(x => x.trim()).filter(x => x !== "");

				if (IN_DEBUG_MODE_FOR('vm-only')) {
					console.log("[vm-only] Initialization for " + field + " with", elem);
				}

				if ((templateRestrictions.length > 0) && (templateRestrictions.indexOf(thisTemplateName) === -1)) {
					// Skip if restricted to other template type
					if (IN_DEBUG_MODE_FOR('vm-only')) {
						console.log("[vm-only] Skipping initialization: restricted to", templateRestrictions, "; Template Type: " + thisTemplateName);
					}
					return;
				}

				var processors = (processorString === "") ? [] : processorString.split('|').map(x => x.trim()).filter(x => x !== "");
				var value = initValue;

				var currTemplateInstanceFunc = Template._currentTemplateInstanceFunc;
				Template._currentTemplateInstanceFunc = () => instance;
				processors.forEach(function(m) {
					// processors here do not provide view model data as an argument
					if (!(options.preProcessors[m] instanceof Function)) {
						console.error('[ThreeWay] No such pre-processor: ' + m, elem);
						return;
					}
					value = options.preProcessors[m](value, elem, {});
				});
				Template._currentTemplateInstanceFunc = currTemplateInstanceFunc;

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

			//////////////////////////////////////////////////////////////////
			// Say hi to parent now that its rendered
			//////////////////////////////////////////////////////////////////
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
			threeWay.instanceId.set(myId);

			//////////////////////////////////////////////////////////////////
			// Initial Node Binding
			//  - Template lifecycle:
			//    Parent Create, Child Create, Child Rendered, Parent Rendered
			//  - Nodes of children get bound first
			//  - Parent gets the rest
			//////////////////////////////////////////////////////////////////
			if (IN_DEBUG_MODE_FOR('bind')) {
				console.log("[bind] Init on " + myId + ": Checking for new elements to bind.");
			}
			Array.prototype.forEach.call(instance.$("[data-bind]"), threeWay.__bindElem);


			//////////////////////////////////////////////////////////////////
			// Setup binding and re-binding
			//////////////////////////////////////////////////////////////////

			var lastGCOfComputations = 0;
			Tracker.autorun(function() {
				threeWay._rootNode.get();
				var rootNode = threeWay.rootNode;

				if (!!threeWay.mutationObserver) {
					threeWay.mutationObserver.disconnect();
				}

				threeWay.mutationObserver = new MutationObserver(function respondToMutation(mutations) { // (mutations, mutationObserverInstance)
					var instanceId;
					var thisTemplateName = instance.view.name.split('.').pop().trim();

					Tracker.nonreactive(function() {
						instanceId = threeWay.instanceId.get();
					});
					if (!instanceId) {
						instanceId = "~~id-unassigned~~";
					}

					mutations.forEach(function(mutation) {
						if (!!mutation.addedNodes) {
							Array.prototype.forEach.call(mutation.addedNodes, function(_node) {
								if (!!_node.getAttribute) {
									// For each node, look for sub nodes
									// Make sure to check both node and children
									var node_arr = Array.prototype.concat.apply((!!_node.getAttribute(DATA_BIND_ATTRIBUTE)) ? [_node] : [], $(_node).find('[' + DATA_BIND_ATTRIBUTE + ']'));
									node_arr.forEach(function(node) {
										if (!node.getAttributeNS(THREE_WAY_ATTRIBUTE_NAMESPACE, THREE_WAY_DATA_BINDING_ID)) {
											if (IN_DEBUG_MODE_FOR('bind')) {
												console.log("[bind] Node added on " + instanceId, node);
											}
											var templateRestrictionsAttr = node.getAttribute(RESTRICT_TEMPLATE_TYPE_ATTRIBUTE);
											var templateRestrictions = templateRestrictionsAttr && templateRestrictionsAttr.split(',').map(x => x.trim()).filter(x => x !== "") || [];
											if (templateRestrictions.indexOf(thisTemplateName) === -1) {
												threeWay.__bindElem(node);
											}
										}
									});
								}
							});
						}

						function stopBindingToNode(node) {
							var thisElemId = node.getAttributeNS(THREE_WAY_ATTRIBUTE_NAMESPACE, THREE_WAY_DATA_BINDING_ID);
							if (!!thisElemId) {
								// Clear computations
								if (!!threeWay.boundElemComputations[thisElemId]) {
									threeWay.boundElemComputations[thisElemId].forEach(function(c) {
										c.stop();
									});
									delete threeWay.boundElemComputations[thisElemId];
								}

								// Clear event handlers
								if (!!threeWay.boundElemEventHandlers[thisElemId]) {
									threeWay.boundElemEventHandlers[thisElemId].forEach(function(handlerInfo) {
										$(node).unbind(handlerInfo.eventName, handlerInfo.handler);
									});
									delete threeWay.boundElemEventHandlers[thisElemId];
								}

								// If 1min has passed since the last culling of stopped computations, ...
								// ... and 10% of the time otherwise... cull stopped computations
								var timeDelta = (new Date()).getTime() - lastGCOfComputations;
								if ((timeDelta > 60000) || (Math.random() < Math.min(0.1, timeDelta * 1e-4))) {
									var numComputationsStart = threeWay.computations.length;
									threeWay.computations = threeWay.computations.filter(c => !c.stopped);
									var numComputationsEnd = threeWay.computations.length;
									lastGCOfComputations = (new Date()).getTime();
									if (IN_DEBUG_MODE_FOR('bind')) {
										console.log("[bind] GC. # active computations: " + numComputationsEnd + " (# removed: " + (numComputationsStart - numComputationsEnd) + ")");
									}
								}
							}

							$(node).removeAttr(THREE_WAY_DATA_BINDING_ID);
							// $(node).removeAttr(THREE_WAY_DATA_BINDING_INSTANCE);
						}

						if (!!mutation.removedNodes) {
							Array.prototype.forEach.call(mutation.removedNodes, function(node) {
								if ((!!node.getAttribute) && !!node.getAttribute(DATA_BIND_ATTRIBUTE)) {
									if (node.getAttributeNS(THREE_WAY_ATTRIBUTE_NAMESPACE, THREE_WAY_DATA_BINDING_INSTANCE) === instanceId) {
										var thisElemId = node.getAttributeNS(THREE_WAY_ATTRIBUTE_NAMESPACE, THREE_WAY_DATA_BINDING_ID);
										if (IN_DEBUG_MODE_FOR('bind')) {
											console.log("[bind] Node removed on " + instanceId + " (twbId: " + thisElemId + ")", node);
										}
										stopBindingToNode(node);
									}
								}
							});
						}

						if (!!mutation.target && !!mutation.target.getAttribute) {
							if (mutation.attributeName === DATA_BIND_ATTRIBUTE) {
								var node = mutation.target;
								if (node.getAttributeNS(THREE_WAY_ATTRIBUTE_NAMESPACE, THREE_WAY_DATA_BINDING_INSTANCE) === instanceId) {
									if (IN_DEBUG_MODE_FOR('bind')) {
										console.log("[bind] " + DATA_BIND_ATTRIBUTE + " attribute changed (bound to: " + instanceId + ")", node);
									}
									stopBindingToNode(node);
									threeWay.__bindElem(node);
								} else if (!node.getAttributeNS(THREE_WAY_ATTRIBUTE_NAMESPACE, THREE_WAY_DATA_BINDING_INSTANCE)) {
									threeWay.__bindElem(node);
								}
							}
						}
					});
				});

				if (IN_DEBUG_MODE_FOR('bind')) {
					var instanceId;
					var thisTemplateName = instance.view.name.split('.').pop().trim();

					Tracker.nonreactive(function() {
						instanceId = threeWay.instanceId.get();
					});
					if (!instanceId) {
						instanceId = "~~id-unassigned~~";
					}
					console.log("[bind] Starting Mutation Observer for " + instanceId + " (" + thisTemplateName + ") on ", rootNode);
				}
				threeWay.mutationObserver.observe(rootNode, {
					childList: true,
					subtree: true,
					attributes: true,
					characterData: false
				});
			});
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

			if (!!threeWay.mutationObserver) {
				threeWay.mutationObserver.disconnect();
			}
		});

		tmpl.helpers({
			_3w_id: () => Template.instance()._3w_getId(),
			_3w_3wInstanceId: () => Template.instance()._3w_get3wInstanceId(),
			_3w_haveData: () => Template.instance()[THREE_WAY_NAMESPACE].haveData.get(),
			_3w_get: (propName) => Template.instance()._3w_get(propName),
			_3w_getAll: () => Template.instance()._3w_getAll(),

			_3w_isSyncedToServer: (propName) => Template.instance()._3w_isSyncedToServer(propName),
			_3w_notSyncedToServer: (propName) => !Template.instance()._3w_isSyncedToServer(propName),
			_3w_allSyncedToServer: () => Template.instance()._3w_allSyncedToServer(),
			_3w_isNotInvalid: (propName) => Template.instance()._3w_isNotInvalid(propName),
			_3w_isInvalid: (propName) => !Template.instance()._3w_isNotInvalid(propName),
			_3w_validValuesSynced: (propName) => Template.instance()._3w_isSyncedToServer(propName) || (!Template.instance()._3w_isNotInvalid(propName)),
			_3w_validValuesNotSynced: (propName) => (!Template.instance()._3w_isSyncedToServer(propName)) && Template.instance()._3w_isNotInvalid(propName),
			_3w_expandParams: ThreeWay.expandParams,

			_3w_parentDataGet: (p, levelsUp) => Template.instance()._3w_parentDataGet(p, levelsUp),
			_3w_parentDataGetAll: (levelsUp) => Template.instance()._3w_parentDataGetAll(levelsUp),

			_3w_childDataGetId: (childNameArray) => Template.instance()._3w_childDataGetId(childNameArray),
			_3w_childDataGet: (p, childNameArray) => Template.instance()._3w_childDataGet(p, childNameArray),
			_3w_childDataGetAll: (childNameArray) => Template.instance()._3w_childDataGetAll(childNameArray),

			_3w_siblingDataGet: (p, siblingName) => Template.instance()._3w_siblingDataGet(p, siblingName),
			_3w_siblingDataGetAll: (siblingName) => Template.instance()._3w_siblingDataGetAll(siblingName),
		});
	});

	PackageUtilities.addImmutablePropertyObject(ThreeWay, 'processorGenerators', {
		undefinedFilterGenerator: function undefinedFilter(defaultValue) {
			return x => (typeof x === "undefined") ? defaultValue : x;
		},
	});

	PackageUtilities.addImmutablePropertyObject(ThreeWay, 'processors', {
		updateSemanticUIDropdown: function updateSemanticUIDropdown(x, elem) {
			if (typeof x === "string") {
				if (x.trim() === "") {
					$(elem.parentElement)
						.dropdown('set exactly', []);
				} else {
					$(elem.parentElement)
						.dropdown('set exactly', x.split(',').map(x => x.trim()));
				}
			}
			return x;
		},
		undefinedToEmptyStringFilter: ThreeWay.processorGenerators.undefinedFilterGenerator(""),
	});

	PackageUtilities.addImmutablePropertyObject(ThreeWay, 'transformationGenerators', {
		arrayFromDelimitedString: function arrayFromDelimitedString(delimiter) {
			return function arrayFromDelimitedString(x) {
				var outcome;
				if (!x || (x.trim() === '')) {
					outcome = [];
				} else {
					outcome = x.split(delimiter).map(y => y.trim());
				}
				return outcome;
			};
		},
		arrayToDelimitedString: function arrayToDelimitedString(delimiter) {
			return function arrayToDelimitedString(arr) {
				return arr.join && arr.join(delimiter) || "";
			};
		},
		booleanFromArray: function booleanFromArray(trueIndicator) {
			return function booleanFromArray(arr) {
				return (arr instanceof Array) ? false : (((arr.length === 1) && (arr[0] === trueIndicator)) ? true : false);
			};
		},
		booleanToArray: function booleanToArray(trueIndicator) {
			return function booleanToArray(x) {
				return !!x ? [trueIndicator] : [];
			};
		},
	});

	PackageUtilities.addImmutablePropertyObject(ThreeWay, 'transformations', {
		dateFromString: function dateFromString(ds) {
			var splt = ds.split('-');
			var dt = new Date();
			if (splt.length === 3) {
				var day = Number(splt[2]);
				var mth = Number(splt[1]);
				var yr = Number(splt[0]);
				if (!Number.isNaN(day) && !Number.isNaN(mth) && !Number.isNaN(yr)) {
					dt = new Date(yr, mth - 1, day);
				}
			}
			return dt;
		},
		dateToString: function dateToString(dt) {
			if (!(dt instanceof Date)) {
				dt = new Date();
			}
			var mm = dt.getMonth() + 1;
			var dd = dt.getDate();
			mm = mm < 10 ? '0' + mm : mm;
			dd = dd < 10 ? '0' + dd : dd;
			var ds = dt.getFullYear() + '-' + mm + '-' + dd;
			return ds;
		},
		arrayFromCommaDelimitedString: ThreeWay.transformationGenerators.arrayFromDelimitedString(","),
		arrayToCommaDelimitedString: ThreeWay.transformationGenerators.arrayToDelimitedString(","),
	});

}
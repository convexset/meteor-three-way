/* global ThreeWay: true */
/* global PackageUtilities: true */
/* global Reload: true */
/* global __meteor_runtime_config__: true */

var __tw = function ThreeWay() {};
ThreeWay = new __tw();

var THREE_WAY_NAMESPACE = "__three_way__";
var THREE_WAY_NAMESPACE_METHODS = "_3w_";
var THREE_WAY_MIGRATION_NAME = "ThreeWay";
var DATA_BIND_ATTRIBUTE = "data-bind";
var THREE_WAY_ATTRIBUTE_NAMESPACE = "three-way";
var THREE_WAY_DATA_BINDING_ID = "three-way-id";
var THREE_WAY_DATA_BINDING_LEVEL = "three-way-id-level";
var THREE_WAY_DATA_BINDING_INSTANCE = "three-way-instance";
var RESTRICT_TEMPLATE_TYPE_ATTRIBUTE = 'restrict-template-type';
var DEFAULT_DEBOUNCE_INTERVAL = 500;
var DEFAULT_THROTTLE_INTERVAL = 500;
var DEFAULT_METHOD_INTERVAL = 10;

var AGE_THRESHOLD_OLD_ITEM = 10000;

var DEBUG_MODE = false;
var DEBUG_MODE_ALL = false;
var DEBUG_MESSAGES = {
	// DOM Observation
	'parse': false,
	'bind': false,
	// Computations
	'tracker': false,
	'new-id': false,
	// DB and Updates
	'observer': false,
	'db': false,
	// Data Related
	'default-values': false,
	'validation': false,
	'data-mirror': false,
	'vm-only': false,
	'reload': false,
	// Binding Related
	'bindings': false,
	'value': false,
	'checked': false,
	'focus': false,
	'html-text': false,
	'visible-and-disabled': false,
	'style': false,
	'attr': false,
	'class': false,
	'event': false,
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

// TODO: Remove this when appropriate
function clearReactiveDictSafely(rd) {
	_.forEach(rd.keys, function(v, k) {
		rd.delete(k);
	});
}

// Created to extricate event handlers that flush from computations
function pushToEndOfEventQueue(fn, context) {
	return function fnAtBackOfEventQueue(...params) {
		setTimeout(() => fn.apply(context, params), 0);
	};
}


if (Meteor.isClient) {

	//////////////////////////////////////////////////////////////////////
	// Debug Mode
	//////////////////////////////////////////////////////////////////////
	var ThreeWayDebug = {};
	PackageUtilities.addImmutablePropertyArray(ThreeWayDebug, 'MESSAGE_HEADINGS', _.map(DEBUG_MESSAGES, (v, k) => k));
	PackageUtilities.addImmutablePropertyFunction(ThreeWayDebug, 'set', function debugModeStatusSet(v) {
		DEBUG_MODE = !!v;
	});
	PackageUtilities.addImmutablePropertyFunction(ThreeWayDebug, 'get', function debugModeStatus() {
		return DEBUG_MODE;
	});
	PackageUtilities.addImmutablePropertyFunction(ThreeWayDebug, 'selectAll', function debugModeSelectAll() {
		DEBUG_MODE_ALL = true;
	});
	PackageUtilities.addImmutablePropertyFunction(ThreeWayDebug, 'selectNone', function debugModeSelectNone() {
		DEBUG_MODE_ALL = false;
		for (var k in DEBUG_MESSAGES) {
			if (DEBUG_MESSAGES.hasOwnProperty(k)) {
				DEBUG_MESSAGES[k] = false;
			}
		}
	});
	PackageUtilities.addImmutablePropertyFunction(ThreeWayDebug, 'select', function debugModeSelect(k) {
		if (DEBUG_MESSAGES.hasOwnProperty(k)) {
			DEBUG_MESSAGES[k] = true;
		}
	});
	PackageUtilities.addImmutablePropertyObject(ThreeWay, 'DEBUG_MODE', ThreeWayDebug);

	//////////////////////////////////////////////////////////////////////
	// Utilities
	//////////////////////////////////////////////////////////////////////
	var ThreeWayUtils = {};
	PackageUtilities.addImmutablePropertyFunction(ThreeWayUtils, 'expandParams', function expandParams(fieldSpec, params) {
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
	PackageUtilities.addImmutablePropertyFunction(ThreeWayUtils, 'getNewId', function getNewId() {
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
	PackageUtilities.addImmutablePropertyObject(ThreeWay, 'utils', ThreeWayUtils);

	//////////////////////////////////////////////////////////////////////
	// Stuff Proper
	//////////////////////////////////////////////////////////////////////
	PackageUtilities.addImmutablePropertyFunction(ThreeWay, 'prepare', function prepare(tmpl, options) {
		if (typeof tmpl === "undefined") {
			throw new Meteor.Error('missing-argument', 'template required');
		}
		if (typeof options === "undefined") {
			throw new Meteor.Error('missing-argument', 'options required');
		}
		options = _.extend({
			collection: null,
			updatersForServer: {},
			injectDefaultValues: {},
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
			updateOfFocusedFieldCallback: null,
			validateRepeats: false,
		}, options);

		if (!((options.collection instanceof Mongo.Collection) || (typeof options.collection === "string") || (options.collection === null))) {
			throw new Meteor.Error('options-error', 'collection should be a Mongo.Collection or a string with naming the collection, or null');
		}
		options.fields = _.map(options.updatersForServer, (v, k) => k);

		// Check updaters
		_.forEach(options.updatersForServer, function(v, k) {
			var ok = false;
			if (typeof v === "string") {
				ok = true;
			}
			if (typeof v === "function") {
				ok = true;
			}
			if (typeof v === "object") {
				if ((typeof v.method === "string") && (typeof v.callback === "function")) {
					ok = true;
				}
			}
			if (!ok) {
				throw new Meteor.Error('invalid-updater-specification', k);
			}
		});

		// Fill in data transforms
		options.fields.forEach(function(f) {
			if (!options.dataTransformToServer.hasOwnProperty(f)) {
				// Set default transforms (local data to server)
				options.dataTransformToServer[f] = x => x;
			}
			if (!options.dataTransformFromServer.hasOwnProperty(f)) {
				// Set default transforms (server to local data)
				options.dataTransformFromServer[f] = x => x;
			}
		});

		_.forEach(options.injectDefaultValues, function(v, f) {
			// Check that default values are valid fields
			if (options.fields.indexOf(f) === -1) {
				throw new Meteor.Error('no-such-field', '[Inject Default Values] No such field: ' + f);
			}

			// Wildcard fields rejected
			// if (f.indexOf("*") !== -1) {
			// 	throw new Meteor.Error('invalid-field', '[Inject Default Values] Wild card fields not allowed: ' + f);
			// }
			// Wildcards at last item of fields rejected
			if (f.split('.').pop() === "*") {
				throw new Meteor.Error('invalid-field', '[Inject Default Values] Field specifier cannot be terminated with a wild card: ' + f);
			}
		});

		// Adding Pre-Processors
		_.forEach(ThreeWay.preProcessors, function(fn, p) {
			if (typeof options.preProcessors[p] === "undefined") {
				options.preProcessors[p] = fn;
			}
		});

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
				options: options,
				instanceId: new ReactiveVar(null),
				children: {},
				__hasChild: new ReactiveDict(),
				data: new ReactiveDict(),
				__serverIsUpdated: new ReactiveDict(),
				__dataIsNotInvalid: new ReactiveDict(),
				_focusedFieldUpdatedOnServer: new ReactiveDict(),
				dataMirror: {},
				fieldMatchParams: {}, // No need to re-create
				_fieldPseudoMatched: [], // No need to re-create
				_fieldsTested: [], // No need to re-create
				hasData: new ReactiveVar(false),
				id: new ReactiveVar(null),
				observer: null,
				computations: [],
				_dataUpdateComputations: {},
				boundElemComputations: {},
				boundElemEventHandlers: {},
				mutationObserver: null,
				rootNodes: [document.body],
				_rootNodes: new ReactiveVar("document.body"),
				_focusedField: new ReactiveVar(null),
				__level: 0,
				__mostRecentDatabaseEntry: {},
				__mostRecentValidationValueVM: {},
				__mostRecentValidationValueServer: {},
				__recentDBUpdates: {},
				__updatesToSkipDueToRelatedObjectUpdate: {},
			};
			if (options.collection instanceof Mongo.Collection) {
				threeWay.collection = options.collection;
			} else {
				threeWay.collection = new Mongo.Collection(options.collection);
			}

			var threeWayMethods = {};

			instance[THREE_WAY_NAMESPACE] = threeWay;
			instance[THREE_WAY_NAMESPACE_METHODS] = threeWayMethods;

			// Set up methods in threeWayMethods
			(function() {
				var __rootChanges = 0;
				threeWayMethods.setRoots = function(selectorString) {
					var nodes = instance.$(selectorString);
					__rootChanges += 1;
					threeWay.rootNodes = Array.prototype.map.call(nodes, x => x);
					threeWay._rootNodes.set(selectorString + "|" + __rootChanges);
				};
				threeWayMethods.setId = function(id) {
					threeWay.id.set(id);
				};
				threeWayMethods.getId = function() {
					return threeWay.id.get();
				};
				threeWayMethods.get3wInstanceId = function() {
					return threeWay.instanceId.get();
				};
				threeWayMethods.get = p => threeWay.data.get(p);
				threeWayMethods.set = function(p, v) {
					threeWay.data.set(p, v);
					updateRelatedFields(p, v);
				};
				threeWayMethods.get_NR = function(p) {
					var ret;
					Tracker.nonreactive(function() {
						ret = threeWayMethods.get(p);
					});
					return ret;
				};
				threeWayMethods.getAll = () => threeWay.data.all();
				threeWayMethods.getAll_NR = function() {
					var ret;
					Tracker.nonreactive(function() {
						ret = threeWayMethods.getAll();
					});
					return ret;
				};

				threeWayMethods.isPropVMOnly = function(p) {
					return matchParamStrings(options.fields, p).length === 0;
				};

				threeWayMethods.getAll_VMOnly_NR = function() {
					var vmData = threeWayMethods.getAll_NR();
					_.forEach(threeWay.fieldMatchParams, function(v, k) {
						if (!threeWayMethods.isPropVMOnly(k) && vmData.hasOwnProperty(k)) {
							delete vmData[k];
						}
					});
					return vmData;
				};

				threeWayMethods.focusedField = () => threeWay._focusedField.get();
				threeWayMethods.focusedFieldUpdatedOnServer = p => threeWay._focusedFieldUpdatedOnServer.get(p);

				threeWayMethods.isSyncedToServer = p => !!threeWay.__serverIsUpdated.get(p);
				threeWayMethods.allSyncedToServer = function() {
					return _.reduce(threeWay.__serverIsUpdated.all(), (m, v) => !!m && !!v, true);
				};
				threeWayMethods.isNotInvalid = p => !!threeWay.__dataIsNotInvalid.get(p);

				threeWayMethods.parentDataGet = (p, levelsUp) => threeWayMethods.__getNearestThreeWayAncestor(levelsUp)[THREE_WAY_NAMESPACE_METHODS].get(p);
				threeWayMethods.parentDataGetAll = (levelsUp) => threeWayMethods.__getNearestThreeWayAncestor(levelsUp)[THREE_WAY_NAMESPACE_METHODS].getAll();
				threeWayMethods.parentDataSet = (p, v, levelsUp) => threeWayMethods.__getNearestThreeWayAncestor(levelsUp)[THREE_WAY_NAMESPACE_METHODS].set(p, v);
				threeWayMethods.parentDataGet_NR = (p, levelsUp) => threeWayMethods.__getNearestThreeWayAncestor(levelsUp)[THREE_WAY_NAMESPACE_METHODS].get_NR(p);
				threeWayMethods.parentDataGetAll_NR = (levelsUp) => threeWayMethods.__getNearestThreeWayAncestor(levelsUp)[THREE_WAY_NAMESPACE_METHODS].getAll_NR();

				threeWayMethods.childDataGetId = function _3w_childDataGetId(childNameArray) {
					if (childNameArray instanceof Array) {
						if (childNameArray.length === 0) {
							return;
						}
						var hasChildData = !!threeWay.__hasChild.get(childNameArray[0]);
						if (!hasChildData) {
							return;
						}
						if (childNameArray.length === 1) {
							return threeWay.children[childNameArray[0]][THREE_WAY_NAMESPACE_METHODS].getId();
						} else {
							var cn = childNameArray.map(x => x);
							cn.shift();
							return threeWay.children[childNameArray[0]][THREE_WAY_NAMESPACE_METHODS].childDataGetId(cn);
						}
					} else {
						return threeWayMethods.childDataGetId([childNameArray]);
					}
				};
				threeWayMethods.childDataSetId = function _3w_childDataSetId(id, childNameArray) {
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
							threeWay.children[childNameArray[0]][THREE_WAY_NAMESPACE_METHODS].setId(id);
						} else {
							var cn = childNameArray.map(x => x);
							cn.shift();
							threeWay.children[childNameArray[0]][THREE_WAY_NAMESPACE_METHODS].childDataSetId(id, cn);
						}
					} else {
						threeWayMethods.childDataSetId(id, [childNameArray]);
					}
				};
				threeWayMethods.childDataGet = function _3w_childDataGet(p, childNameArray) {
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
							return threeWay.children[childNameArray[0]][THREE_WAY_NAMESPACE_METHODS].childDataGet(p, cn);
						}
					} else {
						return threeWayMethods.childDataGet(p, [childNameArray]);
					}
				};
				threeWayMethods.childDataGetAll = function _3w_childDataGetAll(childNameArray) {
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
							return threeWay.children[childNameArray[0]][THREE_WAY_NAMESPACE_METHODS].childDataGetAll(cn);
						}
					} else {
						return threeWayMethods.childDataGetAll([childNameArray]);
					}
				};
				threeWayMethods.childDataSet = function _3w_childDataSet(p, v, childNameArray) {
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
							return threeWay.children[childNameArray[0]][THREE_WAY_NAMESPACE_METHODS].childDataSet(p, v, cn);
						}
					} else {
						return threeWayMethods.childDataSet(p, v, [childNameArray]);
					}
				};
				threeWayMethods.childDataGet_NR = function _3w_childDataGet_NR(p, childNameArray) {
					var value;
					Tracker.nonreactive(function() {
						value = threeWayMethods.childDataGet(p, childNameArray);
					});
					return value;
				};
				threeWayMethods.childDataGetAll_NR = function _3w_childDataGetAll_NR(childNameArray) {
					var value;
					Tracker.nonreactive(function() {
						value = threeWayMethods.childDataGetAll(childNameArray);
					});
					return value;
				};

				threeWayMethods.__getNearestThreeWayAncestor = function _3w_getNearestThreeWayAncestor(levelsUp) {
					if (typeof levelsUp === "undefined") {
						levelsUp = 1;
					}
					var currentInstance = instance;
					while (!!currentInstance.parentTemplate()) {
						currentInstance = currentInstance.parentTemplate();
						if (!!currentInstance[THREE_WAY_NAMESPACE]) {
							levelsUp -= 1;
							if (levelsUp === 0) {
								return currentInstance;
							}
						}
					}
					return null;
				};

				threeWayMethods.__getUltimateThreeWayAncestorInTree = function _3w_getUltimateThreeWayAncestor() {
					var candidate = instance;
					var currentInstance = candidate;
					while (!!currentInstance.parentTemplate()) {
						currentInstance = currentInstance.parentTemplate();
						if (!!currentInstance[THREE_WAY_NAMESPACE]) {
							candidate = currentInstance;
						}
					}
					return candidate;
				};

				threeWayMethods.getAllDescendants_NR = function _3w_getAllDescendants_NR(levels, currDepth, path) {
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
							Array.prototype.push.apply(descendants, threeWay.children[id][THREE_WAY_NAMESPACE_METHODS].getAllDescendants_NR(levels - 1, currDepth + 1, thisPath));
						}
					});
					return descendants;
				};

				threeWayMethods.resetVMOnlyData = function _3w_resetVMOnlyData() {
					// Reset VM Only data to initial values
					// (including those from the optional field
					// `_3w_additionalViewModelOnlyData` of the data context)
					if (IN_DEBUG_MODE_FOR('vm-only')) {
						console.log("[vm-only] Resetting view model only values to initial values.", threeWay.vmOnlyData_Initial);
					}
					_.forEach(threeWay.vmOnlyData_Initial, function(value, field) {
						threeWayMethods.set(field, value);
					});
				};

				threeWayMethods.getInheritedHelper = function _3w_getInheritedHelper(h) {
					if (typeof options.helpers[h] !== "undefined") {
						return options.helpers[h];
					} else if (!!threeWayMethods.__getNearestThreeWayAncestor()) {
						return threeWayMethods.__getNearestThreeWayAncestor()[THREE_WAY_NAMESPACE_METHODS].getInheritedHelper(h);
					}
				};
				threeWayMethods.getInheritedEventHandler = function _3w_getInheritedEventHandler(evt) {
					if (options.eventHandlers[evt] instanceof Function) {
						return options.eventHandlers[evt];
					} else if (!!threeWayMethods.__getNearestThreeWayAncestor()) {
						return threeWayMethods.__getNearestThreeWayAncestor()[THREE_WAY_NAMESPACE_METHODS].getInheritedEventHandler(evt);
					}
				};
				threeWayMethods.getInheritedPreProcessor = function _3w_getInheritedPreProcessor(p) {
					if (options.preProcessors[p] instanceof Function) {
						return options.preProcessors[p];
					} else if (!!threeWayMethods.__getNearestThreeWayAncestor()) {
						return threeWayMethods.__getNearestThreeWayAncestor()[THREE_WAY_NAMESPACE_METHODS].getInheritedPreProcessor(p);
					}
				};

				threeWayMethods.__getFamilyHeritageHelperBundle = function _3w_getFamilyHeritageHelperBundle(bundle) {
					// Returns all helpers than can be accessed via getInheritedHelper (i.e.: own, and from ancestors)
					if (typeof bundle === "undefined") {
						bundle = {};
					}
					_.forEach(options.helpers, function(fn, h) {
						if (!bundle.hasOwnProperty(h)) {
							bundle[h] = fn;
						}
					});
					if (!!threeWayMethods.__getNearestThreeWayAncestor()) {
						bundle = threeWayMethods.__getNearestThreeWayAncestor()[THREE_WAY_NAMESPACE_METHODS].__getFamilyHeritageHelperBundle(bundle);
					}
					return bundle;
				};

				threeWayMethods.siblingDataGet = function _3w_siblingDataGet(p, siblingName) {
					return threeWayMethods.__getNearestThreeWayAncestor()[THREE_WAY_NAMESPACE_METHODS].childDataGet(p, siblingName);
				};
				threeWayMethods.siblingDataGetAll = function _3w_siblingDataGet(siblingName) {
					return threeWayMethods.__getNearestThreeWayAncestor()[THREE_WAY_NAMESPACE_METHODS].childDataGetAll(siblingName);
				};
				threeWayMethods.siblingDataSet = function _3w_siblingDataSet(p, v, siblingName) {
					return threeWayMethods.__getNearestThreeWayAncestor()[THREE_WAY_NAMESPACE_METHODS].childDataSet(p, v, siblingName);
				};
				threeWayMethods.siblingDataGet_NR = function _3w_siblingDataGet_NR(p, siblingName) {
					var value;
					Tracker.nonreactive(function() {
						value = threeWayMethods.siblingDataGet(p, siblingName);
					});
					return value;
				};
				threeWayMethods.siblingDataGetAll_NR = function _3w_siblingDataGetAll_NR(siblingName) {
					var value;
					Tracker.nonreactive(function() {
						value = threeWayMethods.siblingDataGetAll(siblingName);
					});
					return value;
				};
			})();

			////////////////////////////////////////////////////////////////
			// For VM-DB binding set-up
			//

			function updateRelatedFields(fieldName, value) {
				var childFields = _.filter(threeWay.fieldMatchParams, match => !!match && (match.fieldPath.length > fieldName.length) && (match.fieldPath.substr(0, fieldName.length) === fieldName));
				var parentFields = _.filter(threeWay.fieldMatchParams, match => !!match && (match.fieldPath.length < fieldName.length) && (fieldName.substr(0, match.fieldPath.length + 1) === match.fieldPath + '.'));
				var fieldSplit = fieldName.split('.');
				childFields.forEach(function(match) {
					var matchSplit = match.fieldPath.split('.');
					var curr_v = value;
					var noTraversalError = true;
					for (var k = fieldSplit.length; k < matchSplit.length; k++) {
						curr_v = curr_v[matchSplit[k]];
						if (typeof curr_v === "undefined") {
							noTraversalError = false;
							break;
						}
					}
					if (noTraversalError) {
						// Don't use threeWayMethods.set because it calls this method
						threeWay.data.set(match.fieldPath, curr_v);
						threeWay.__updatesToSkipDueToRelatedObjectUpdate[match.fieldPath] = true;
					}
				});
				parentFields.forEach(function(match) {
					var matchSplit = match.fieldPath.split('.');
					var parentValue = threeWayMethods.get_NR(match.fieldPath);
					var thisSubValue = parentValue;
					for (var k = matchSplit.length; k < fieldSplit.length - 1; k++) {
						thisSubValue = thisSubValue[fieldSplit[k]];
					}
					thisSubValue[fieldSplit[fieldSplit.length - 1]] = value;

					// Don't use threeWayMethods.set because it calls this method
					threeWay.data.set(match.fieldPath, parentValue);
					threeWay.__updatesToSkipDueToRelatedObjectUpdate[match.fieldPath] = true;
				});
			}


			function updateServerUpdatedStatus(fieldName) {
				if (!!threeWay.fieldMatchParams[fieldName]) {
					// invalidate only if linked to server
					// ... and different
					var isUpdated;
					Tracker.nonreactive(function() {
						// get current value by digging into document
						var doc = threeWay.collection.findOne(threeWay.id.get());
						var miniMongoValue = doc;
						var fieldNameSplit = fieldName.split('.');
						while (fieldNameSplit.length > 0) {
							miniMongoValue = miniMongoValue[fieldNameSplit.shift()];
						}
						var miniMongoValueTransformed = options.dataTransformFromServer[threeWay.fieldMatchParams[fieldName].match](miniMongoValue, doc);
						isUpdated = _.isEqual(miniMongoValueTransformed, threeWayMethods.get(fieldName));
					});
					threeWay.__serverIsUpdated.set(fieldName, isUpdated);
				}
			}


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

			// Set up binding
			function setUpBinding(curr_f) {
				if (typeof threeWay._dataUpdateComputations[curr_f] === "undefined") {
					threeWay._dataUpdateComputations[curr_f] = Tracker.autorun(function() {
						var value = threeWay.data.get(curr_f);

						var __id;
						Tracker.nonreactive(function() {
							__id = threeWay.id.get();
						});
						if (IN_DEBUG_MODE_FOR('bindings')) {
							console.log('[bindings] Field: ' + curr_f + "; id: " + __id + "; Value:", value);
						}

						// Skip update if subsidiary update
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
										console.log('[db|update] Performing update... ' + curr_f + ' -> ', v);
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
								var valueToSend = options.dataTransformToServer[matchFamily](value, vmData);

								if (IN_DEBUG_MODE_FOR('db')) {
									console.log('[db|update] Initiating update... ' + curr_f + ' -> ', value, ' (Value for server:', valueToSend, ')');
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
											removeOldItems(threeWay.__recentDBUpdates[f], AGE_THRESHOLD_OLD_ITEM);
											threeWay.__recentDBUpdates[f].push({
												valueOnClient: thisClientSideValue,
												ts: (new Date()).getTime(),
											});
											if (IN_DEBUG_MODE_FOR('db')) {
												console.log('[db|update-recents] Storing recent (client-side) value for ' + f + ':', thisClientSideValue, ' (Value for server:', valueToSend, ')');
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
								console.log('[db|update] No update for ' + curr_f + '; value:', value);
							}
						}
					});
				}
			}
			//
			// End VM-DB binding set-up
			////////////////////////////////////////////////////////////////


			instance.autorun(function() {
				threeWay.dataMirror = threeWay.data.all();
				if (IN_DEBUG_MODE_FOR('data-mirror')) {
					console.log('Updating data mirror...', threeWay.dataMirror);
				}
			});

			threeWay.vmOnlyData_Initial = _.extend({}, options.viewModelToViewOnly);
			if (!!instance.data && !!instance.data._3w_additionalViewModelOnlyData) {
				threeWay.vmOnlyData_Initial = _.extend(threeWay.vmOnlyData_Initial, instance.data._3w_additionalViewModelOnlyData);
			}
			if (IN_DEBUG_MODE_FOR('vm-only')) {
				console.log("[vm-only] Initial values for view model only data ready.", threeWay.vmOnlyData_Initial);
			}
			_.forEach(threeWay.vmOnlyData_Initial, function(value, field) {
				threeWayMethods.set(field, value);
				if (IN_DEBUG_MODE_FOR('vm-only')) {
					console.log("[vm-only] Setting up initial value for " + field + " to ", value, " using template-level options.");
				}
				// Check vmOnlyData for nonsense that matches fields. Don't set up computation if so
				if (!threeWayMethods.isPropVMOnly(field)) {
					// Do not set-up update computation (not an actual vm-only field)
					console.warn("[vm-only] Not an actual view model only field:", field);
					delete threeWay.vmOnlyData_Initial[field];
				}
			});

			// On Reload from Hot Code Push, Refresh View Model Only Data
			// ... but after name is acquired
			// ... so not here.

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
			instance.autorun(function() {
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

				// Store View Model Only Data
				var viewModelOnlyData = (function() {
					var data = threeWayMethods.getAll_NR();
					_.forEach(data, function (v, f) {
						if (!threeWayMethods.isPropVMOnly(f)) {
							delete data[f];
						}
					});
					return data;
				})();
				if (IN_DEBUG_MODE_FOR('vm-only')) {
					console.log("[vm-only] Storing current view model only data prior to clearing view model.", viewModelOnlyData);
				}

				// Clear data
				// TODO: Replace with .clear() when possible
				clearReactiveDictSafely(threeWay.data); // threeWay.data.clear();
				clearReactiveDictSafely(threeWay._focusedFieldUpdatedOnServer); // threeWay._focusedFieldUpdatedOnServer.clear();

				// Replace ViewModel only data
				if (IN_DEBUG_MODE_FOR('vm-only')) {
					console.log("[vm-only] Restoring current view model only data.", viewModelOnlyData);
				}
				_.forEach(viewModelOnlyData, function(value, field) {
					threeWayMethods.set(field, value);
				});

				// Check if focused field is data bound
				(function() {
					threeWay._focusedField.set(null);
					var elem = document.activeElement;
					pushToEndOfEventQueue(function forceFocusActiveElementJustInCase() {
						// Don't trigger synchronously to avoid flushes in a flush/computation
						$(elem).trigger('focus');
					}, instance);
				})();

				threeWay.__mostRecentDatabaseEntry = {};
				threeWay.__mostRecentValidationValueVM = {};
				threeWay.__mostRecentValidationValueServer = {};
				threeWay.__recentDBUpdates = {};
				threeWay.__updatesToSkipDueToRelatedObjectUpdate = {};

				// TODO: Replace with .clear() when possible
				clearReactiveDictSafely(threeWay.__serverIsUpdated); // threeWay.__serverIsUpdated.clear();
				clearReactiveDictSafely(threeWay.__dataIsNotInvalid); // threeWay.__dataIsNotInvalid.clear();

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
					var cursor = threeWay.collection.find(_id);

					//////////////////////////////////////////////////// 
					// Descend into objects and arrays
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
								var mostRecentValue = threeWay.__mostRecentDatabaseEntry[curr_f];
								var newValue = options.dataTransformFromServer[match.match](v, doc);
								if (_.isEqual(mostRecentValue, newValue)) {
									if (IN_DEBUG_MODE_FOR('db')) {
										console.log('[db|receive] Most recent value matches for ' + curr_f + '. No change to view model.');
									}
									threeWay._focusedFieldUpdatedOnServer.set(curr_f, false);
								} else {
									removeOldItems(threeWay.__recentDBUpdates[curr_f], AGE_THRESHOLD_OLD_ITEM);
									if (popItemWithValue(threeWay.__recentDBUpdates[curr_f], newValue, 'valueOnClient', true) > 0) {
										if (IN_DEBUG_MODE_FOR('db')) {
											console.log('[db|receive] Matches value from recent update for ' + curr_f + '. No change to view model.');
										}
									} else {

										if (IN_DEBUG_MODE_FOR('db')) {
											console.log('[db|receive] Updating view model value for ' + curr_f + ' to', newValue);
										}
										var focusedField;
										var currentValue;
										Tracker.nonreactive(function() {
											focusedField = threeWayMethods.focusedField();
											currentValue = threeWayMethods.get(focusedField);
										});
										if ((focusedField === curr_f) && !!options.updateOfFocusedFieldCallback) {
											threeWay._focusedFieldUpdatedOnServer.set(curr_f, true);
											options.updateOfFocusedFieldCallback(threeWay.fieldMatchParams[focusedField], newValue, currentValue);
										} else {
											// not using threeWayMethods.set to avoid redundancy
											threeWay.data.set(curr_f, newValue);
											threeWay._focusedFieldUpdatedOnServer.set(curr_f, false);
										}
										threeWay.__mostRecentDatabaseEntry[curr_f] = newValue;
									}
								}

								// Set Up binding here and so DOM can get fresh values
								setUpBinding(curr_f);

								// Figure out if server has been updated
								if (addedRun) {
									// First rcv
									threeWay.__serverIsUpdated.set(curr_f, true);
									threeWay.__dataIsNotInvalid.set(curr_f, true);
								} else {
									// get data directly direct and not from data mirror
									// not flushing yet...
									var curr_value;
									Tracker.nonreactive(function() {
										curr_value = threeWay.data.get(curr_f);
									});
									threeWay.__serverIsUpdated.set(curr_f, _.isEqual(newValue, curr_value));
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
					// End Descend Into
					//////////////////////////////////////////////////// 

					//////////////////////////////////////////////////// 
					// getFieldsWhereDefaultRequired: for figuring out if a default field is warranted 
					var getFieldsWhereDefaultRequired = function getFieldsWhereDefaultRequired(f) {
						var vmData = threeWayMethods.getAll_NR();
						if (f.indexOf("*") === -1) {
							return !vmData.hasOwnProperty(f) ? [f] : [];
						}
						var f_split = f.split(".");
						var f_last = f_split.pop();
						var matches = [];
						_.forEach(vmData, function(v_dm, f_dm) {
							var f_dm_split = f_dm.split(".");
							if (f_split.length + 1 > f_dm_split.length) {
								// length mismatch => cannot be a match
								return;
							}

							// reduce length to parity
							while (f_dm_split.length > f_split.length + 1) {
								f_dm_split.pop();
							}
							var f_dm_last = f_dm_split.pop();
							if (f_last === f_dm_last) {
								// last elem matches => unnecessary
								return;
							}

							for (var k = 0; k < f_split.length - 1; k++) {
								if ((f_split[k] !== f_dm_split[k]) && (f_split[k] !== "*")) {
									return;
								}
							}
							var new_field = f_dm_split.join('.') + '.' + f_last;
							if (!vmData.hasOwnProperty(new_field) && (matches.indexOf(new_field) === -1)) {
								matches.push(new_field);
							}
						});
						return matches;
					};
					// End getFieldsWhereDefaultRequired 
					//////////////////////////////////////////////////// 

					//////////////////////////////////////////////////// 
					// Setting Up Observers
					var injectDefaultValues = function injectDefaultValues() {
						// Inject default fields
						_.forEach(options.injectDefaultValues, function(v, f) {
							getFieldsWhereDefaultRequired(f).forEach(function(new_f) {
								if (IN_DEBUG_MODE_FOR('default-values')) {
									console.log("[default-values] Injecting " + new_f + " with value:", v);
								}
								doFieldMatch(new_f);
								setUpBinding(new_f);
								threeWayMethods.set(new_f, v);
							});
						});
					};
					// End Setting Up Observers
					//////////////////////////////////////////////////// 

					threeWay.observer = cursor.observeChanges({
						added: function(id, fields) {
							var doc = threeWay.collection.findOne(id, {
								reactive: false
							});
							if (IN_DEBUG_MODE_FOR('observer')) {
								console.log('[Observer] Added:', id, doc);
							}
							threeWay.hasData.set(true);
							threeWay.__idReady = true;
							descendInto(fields, doc, true);
							injectDefaultValues();
						},
						changed: function(id, fields) {
							var doc = threeWay.collection.findOne(id, {
								reactive: false
							});
							if (IN_DEBUG_MODE_FOR('observer')) {
								console.log('[Observer] Changed:', id, fields, doc);
							}
							descendInto(fields, doc, false);
							injectDefaultValues();
						},
						removed: function(id) {
							if (IN_DEBUG_MODE_FOR('observer')) {
								console.log('[Observer] Removed:', id);
							}
							threeWay.hasData.set(false);
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

			threeWay.validateInput = function validateVMThenServer(field, value, validateForServer) {
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
								console.log('[validation] Doing validation (VM)... Field: ' + field + '; Value:', value, '; Validation Info (VM):', threeWay.fieldMatchParamsForValidationVM[field]);
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
								console.log('[validation] Not doing validation (VM) due to repeat value... Field: ' + field + '; Value:', value, '; Validation Info (VM):', threeWay.fieldMatchParamsForValidationVM[field]);
							}
							passed = threeWay.__mostRecentValidationValueVM[field].outcome;
						}
					}
					if (passed && useValidatorForServer) {
						valueToUse = options.dataTransformToServer[matchFamily](value, vmData);
						validator = !!options.validatorsServer[matchFamilyServer].validator ? options.validatorsServer[matchFamilyServer].validator : () => true;
						successCB = !!options.validatorsServer[matchFamilyServer].success ? options.validatorsServer[matchFamilyServer].success : function() {};
						failureCB = !!options.validatorsServer[matchFamilyServer].failure ? options.validatorsServer[matchFamilyServer].failure : function() {};

						if (options.validateRepeats || (typeof threeWay.__mostRecentValidationValueServer[field] === "undefined") || !_.isEqual(threeWay.__mostRecentValidationValueServer[field].serverValue, valueToUse)) {
							// If successive repeat... don't repeat validation
							didValidationWork = true;

							if (IN_DEBUG_MODE_FOR('validation')) {
								console.log('[validation] Doing validation (Server)... Field: ' + field + '; Value:', value, '; Validation Info (Server):', threeWay.fieldMatchParamsForValidationServer[field]);
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
								console.log('[validation] Not doing validation (Server) due to repeat value... Field: ' + field + '; Value:', value, '; Validation Info (Server):', threeWay.fieldMatchParamsForValidationServer[field]);
							}
							passed = threeWay.__mostRecentValidationValueServer[field].outcome;
						}
					}
				}, this);

				if (didValidationWork && IN_DEBUG_MODE_FOR('validation')) {
					console.log('[validation] Validation result. Field: ' + field + '; Value:', value, '; Passed: ' + passed);
				}

				return passed;
			};



			////////////////////////////////////////////////////////////
			////////////////////////////////////////////////////////////
			// Prepare For Bindings!!!
			////////////////////////////////////////////////////////////
			////////////////////////////////////////////////////////////

			////////////////////////////////////////////////////////////
			// Call helpers and pre-processors in template context
			var processInTemplateContext = function processInTemplateContext(source, mappings, elem, useHelpers, processorsMutateValue, additionalFailureCondition) {
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

				var value;
				instance.callFunctionWithTemplateContext(function() {
					var dataSourceInfomation = [];
					var getFailed = false;
					var sourceElems = source.split("#").map(x => x.trim()).filter(x => x !== "");
					value = sourceElems.map(function(src) {
						var _value;
						if (useHelpers && (typeof options.helpers[src] !== "undefined")) {
							_value = (options.helpers[src] instanceof Function) ? options.helpers[src].call(instance) : options.helpers[src];
							dataSourceInfomation.push({
								type: 'helper',
								name: src
							});
						} else if (useHelpers && (typeof threeWayMethods.getInheritedHelper(src) !== "undefined")) {
							_value = (threeWayMethods.getInheritedHelper(src) instanceof Function) ? threeWayMethods.getInheritedHelper(src).call(instance) : threeWayMethods.getInheritedHelper(src);
							dataSourceInfomation.push({
								type: 'ancestor-helper',
								name: src
							});
						} else if (useHelpers && thisTemplate.__helpers.has(src)) {
							_value = (thisTemplate.__helpers.get(src) instanceof Function) ? thisTemplate.__helpers.get(src).call(instance) : thisTemplate.__helpers.get(src);
							dataSourceInfomation.push({
								type: 'blaze-helper',
								name: src
							});
						} else {
							_value = threeWay.data.get(src);
							dataSourceInfomation.push(_.extend({
								type: 'field',
								name: src
							}, threeWay.fieldMatchParams[src] || {}));
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
					if (value.length === 1) {
						dataSourceInfomation = dataSourceInfomation[0];
					}

					var mutatedValue;
					var firstRunArgs = value.map(x => x);
					if ((mappings.length === 0) && (value.length === 1)) {
						// if single valued and no mappings, "unbox"
						value = value[0];
					}

					_.forEach(mappings, function(m, idx) {
						var preProcessor = threeWayMethods.getInheritedPreProcessor(m);
						if (!(preProcessor instanceof Function)) {
							console.error('[ThreeWay] No such pre-processor: ' + m, elem);
							return;
						}

						var vmData = threeWayMethods.getAll_NR();

						if (idx === 0) {
							mutatedValue = preProcessor.apply(instance, firstRunArgs.concat([elem, vmData, dataSourceInfomation]));
						} else {
							mutatedValue = preProcessor.call(instance, mutatedValue, elem, vmData, dataSourceInfomation);
						}

						if (processorsMutateValue) {
							value = mutatedValue;
						}
					});

					if (!processorsMutateValue && (mappings.length > 0) && (value.length === 1)) {
						// if single valued and mappings do not mutate value, "unbox"
						value = value[0];
					}
				});

				return value;
			};
			threeWayMethods.__processInTemplateContext = processInTemplateContext;
			// End Call helpers and pre-processors in template context
			////////////////////////////////////////////////////////////


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
						var value = $(elem).val();
						var pipelineSplit = elemBindings.bindings.value.source.split('|').map(x => x.trim()).filter(x => x !== "");
						var fieldName = pipelineSplit[0];
						var curr_value = threeWayMethods.get(fieldName);

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
								updateRelatedFields(fieldName, value);
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
						var value = processInTemplateContext(source, pipeline, elem, false, false);
						// (..., false, false): helpers not used and pipelines do not manipulate value

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
						setTimeout(function delayedFocusChange() {
							var pipelineSplit = elemBindings.bindings.value.source.split('|').map(x => x.trim()).filter(x => x !== "");
							var source = pipelineSplit[0];
							threeWay._focusedField.set(source);
						}, 0);
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
								threeWayMethods.set(fieldName, new_value);
								updateRelatedFields(fieldName, new_value);
								updateServerUpdatedStatus(fieldName);
							} else {
								if (IN_DEBUG_MODE_FOR('checked')) {
									console.log('[.checked] Unchanged value: ' + fieldName + ';', curr_value, '(in mirror)');
								}
							}
						}
					};

					// Apply options to changeHandler
					_.forEach(elemBindings.bindings.checked.itemOptions, function(v, opt) {
						if (opt === "throttle") {
							if (IN_DEBUG_MODE_FOR('checked')) {
								console.log("[.checked] Binding with option " + opt + "=" + v + " for", elem);
							}
							checkedChangeHandler = _.throttle(checkedChangeHandler, v);
						}
						if (opt === "debounce") {
							if (IN_DEBUG_MODE_FOR('checked')) {
								console.log("[.checked] Binding with option " + opt + "=" + v + " for", elem);
							}
							checkedChangeHandler = _.debounce(checkedChangeHandler, v);
						}
					});

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
						var additionalFailureCondition = (elem.getAttribute('type').toLowerCase() === "radio") ? () => false : v => (typeof v !== "object") || (!(v instanceof Array));
						var value = processInTemplateContext(source, pipeline, elem, false, false, additionalFailureCondition);
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

					bindEventToThisElem('focus', function() {
						setTimeout(function delayedFocusChange() {
							var pipelineSplit = elemBindings.bindings.checked.source.split('|').map(x => x.trim()).filter(x => x !== "");
							var source = pipelineSplit[0];
							threeWay._focusedField.set(source);
						}, 0);
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
								updateRelatedFields(fieldName, focus);
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
						var focus = !!processInTemplateContext(source, pipeline, elem, false, false);
						// (..., false, false): helpers not used and pipelines do not manipulate value

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
								if (!(handler instanceof Function)) {
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
										bindEventToThisElem('keyup', ThreeWay.eventGenerators.keypressHandlerGenerator(function(event) {
											if (IN_DEBUG_MODE_FOR('event')) {
												console.log("[.event|keyup=" + _eventName + "] Firing " + m + " for", elem);
											}
											instance.callFunctionWithTemplateContext(function() {
												handler.call(this, event, instance, threeWayMethods.getAll_NR());
											}, this);
										}, [key]));
										compositeHandlerUsed = true;
									} else if (eventName.toLowerCase() === 'keydown_' + _eventName.toLowerCase()) {
										bindEventToThisElem('keydown', ThreeWay.eventGenerators.keypressHandlerGenerator(function(event) {
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


				var thisElemId = ThreeWay.utils.getNewId();
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


			//////////////////////////////////////////////////////////////////
			// Peek upwards to determine level
			//////////////////////////////////////////////////////////////////
			if (!!threeWayMethods.__getNearestThreeWayAncestor()) {
				threeWay.__level = threeWayMethods.__getNearestThreeWayAncestor()[THREE_WAY_NAMESPACE].__level + 1;
			}


			//////////////////////////////////////////////////////////////////
			// Pollute template helper namespace if there is space
			//////////////////////////////////////////////////////////////////
			_.forEach(threeWayMethods.__getFamilyHeritageHelperBundle(), function(fn, h) {
				var thisTemplate = instance && instance.view && instance.view.template;
				if (!!thisTemplate && !!thisTemplate.__helpers) {
					if (!thisTemplate.__helpers.has(h)) {
						thisTemplate.helpers(_.object([
							[h, fn]
						]));
					}
				}
			});
		});

		tmpl.onRendered(function() {
			var instance = this;
			var thisTemplateName = instance.view.name.split('.').pop().trim();
			var threeWay = instance[THREE_WAY_NAMESPACE];
			var threeWayMethods = instance[THREE_WAY_NAMESPACE_METHODS];

			//////////////////////////////////////////////////////////////////
			// Say hi to parent now that its rendered
			//////////////////////////////////////////////////////////////////
			var myId = instance && instance.data && instance.data._3w_name;
			var parentInstance = threeWayMethods.__getNearestThreeWayAncestor();
			var ultimateAncestor = threeWayMethods.__getUltimateThreeWayAncestorInTree();

			if (!ultimateAncestor[THREE_WAY_NAMESPACE].familyTreeMembers) {
				// A descendant will have to create this
				ultimateAncestor[THREE_WAY_NAMESPACE].familyTreeMembers = {};
			}

			var someToken = 1;
			if (!!parentInstance) {
				if (!!myId) {
					if (!!parentInstance[THREE_WAY_NAMESPACE].children[myId]) {
						throw new Meteor.Error('three-way-repeated-id', myId);
					}
					if (!!ultimateAncestor[THREE_WAY_NAMESPACE].familyTreeMembers[myId]) {
						console.warn('[ThreeWay] Repeated id: ' + myId + '; this may cause issues with data migration in reloads triggered by hot code pushes');
					}
				} else {
					myId = "_3wNode_" + thisTemplateName + '_' + someToken;
					while (!!ultimateAncestor[THREE_WAY_NAMESPACE].familyTreeMembers[myId]) {
						someToken += 1;
						myId = "_3wNode_" + thisTemplateName + '_' + someToken;
					}
				}
				parentInstance[THREE_WAY_NAMESPACE].__hasChild.set(myId, true);
				parentInstance[THREE_WAY_NAMESPACE].children[myId] = instance;
				ultimateAncestor[THREE_WAY_NAMESPACE].familyTreeMembers[myId] = instance;
			} else {
				myId = '_3wRootNode_' + thisTemplateName;
				while (!!threeWay.familyTreeMembers[myId]) {
					someToken += 1;
					myId = '_3wRootNode_' + thisTemplateName + '_' + someToken;
				}
				threeWay.familyTreeMembers[myId] = instance;
			}
			threeWay.instanceId.set(myId);

			// Set root node if not already set
			if (!!instance.data && !!instance.data._3w_rootElementSelector) {
				if (IN_DEBUG_MODE_FOR('bind')) {
					console.log("[bind] Setting root node for instance of " + thisTemplateName + " via selector " + instance.data._3w_rootElementSelector + ". (Prev: " + threeWay.rootNodes.toString().split('|')[0] + ")");
				}
				threeWayMethods.setRoots(instance.data._3w_rootElementSelector);
			} else {
				// Observe all the elements in the template
				// (if there is a wrapping element, good... otherwise...)
				threeWayMethods.setRoots("*");
			}

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
			instance.autorun(function() {
				threeWay._rootNodes.get();
				var rootNodes = threeWay.rootNodes;

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

					function processSoCalledBindAuction(node) {
						var eligibleLevel = node.getAttributeNS(THREE_WAY_ATTRIBUTE_NAMESPACE, THREE_WAY_DATA_BINDING_LEVEL);
						if (!!eligibleLevel) {
							if (threeWay.__level >= Number(eligibleLevel)) {
								threeWay.__bindElem(node);
								node.removeAttributeNS(THREE_WAY_ATTRIBUTE_NAMESPACE, THREE_WAY_DATA_BINDING_LEVEL);
							}
						}
					}

					mutations.forEach(function(mutation) {
						if (!!mutation.addedNodes) {
							Array.prototype.forEach.call(mutation.addedNodes, function(_node) {

								var currEligibleLevel;

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
												// don't bind now, instead state own level as a "bind auction bid"
												// this enables child templates created later to stake their legitimate claims on new nodes
												// threeWay.__bindElem(node);
												currEligibleLevel = node.getAttributeNS(THREE_WAY_ATTRIBUTE_NAMESPACE, THREE_WAY_DATA_BINDING_LEVEL);
												if (!currEligibleLevel || (Number(currEligibleLevel) < threeWay.__level)) {
													node.setAttributeNS(THREE_WAY_ATTRIBUTE_NAMESPACE, THREE_WAY_DATA_BINDING_LEVEL, threeWay.__level);
													setTimeout(function() {
														processSoCalledBindAuction(node);
													}, 0);
												}
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
									// don't bind now, instead state own level as a "bind auction bid"
									// this enables child templates created later to stake their legitimate claims on new nodes
									// threeWay.__bindElem(node);
									var currEligibleLevel = node.getAttributeNS(THREE_WAY_ATTRIBUTE_NAMESPACE, THREE_WAY_DATA_BINDING_LEVEL);
									if (!currEligibleLevel || (Number(currEligibleLevel) < threeWay.__level)) {
										node.setAttributeNS(THREE_WAY_ATTRIBUTE_NAMESPACE, THREE_WAY_DATA_BINDING_LEVEL, threeWay.__level);
										setTimeout(function() {
											processSoCalledBindAuction(node);
										}, 0);
									}
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
					console.log("[bind] Starting Mutation Observer for " + instanceId + " (" + thisTemplateName + ") on ", rootNodes);
				}
				rootNodes.forEach(function(rn) {
					threeWay.mutationObserver.observe(rn, {
						childList: true,
						subtree: true,
						attributes: true,
						characterData: false
					});
				});
			});

			//////////////////////////////////////////////////////////////////
			// Set initial data source
			//////////////////////////////////////////////////////////////////
			if (!!instance.data && (!!instance.data._3w_id || !!instance.data._id)) {
				var _id_fromDataContext = instance.data._3w_id || instance.data._id;
				if (IN_DEBUG_MODE_FOR('new-id')) {
					console.log("[new-id] Setting initial id for instance of " + thisTemplateName + " to " + _id_fromDataContext);
				}
				threeWayMethods.setId(_id_fromDataContext);
			}


			//////////////////////////////////////////////////////////////////
			// Restore VM-Only Data after Reload Triggered by Hot Code Push
			//////////////////////////////////////////////////////////////////
			var useReloadData = !instance.data || !instance.data._3w_ignoreReloadData;
			if (useReloadData && ThreeWay.reload._haveReloadPayload(myId)) {
				var reloadPayload = ThreeWay.reload._getReloadPayload(myId);
				if (!!reloadPayload) {
					_.forEach(reloadPayload, function(value, field) {
						threeWayMethods.set(field, value);
					});
				}
			}
			ThreeWay.reload._registerForReload(myId, instance);
		});

		tmpl.onDestroyed(function() {
			var instance = this;
			var threeWay = instance[THREE_WAY_NAMESPACE];
			var threeWayMethods = instance[THREE_WAY_NAMESPACE_METHODS];

			if (IN_DEBUG_MODE_FOR('observer')) {
				console.log('[ThreeWay] onDestroy: Stopping current observer', instance);
			}
			if (!!threeWay.observer) {
				threeWay.observer.stop();
			}

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

			// Say bye to parent and ultimate ancestor?
			var myId;
			Tracker.nonreactive(function() {
				myId = threeWayMethods.get3wInstanceId();
			});
			var parentInstance = threeWayMethods.__getNearestThreeWayAncestor();
			var ultimateAncestor = threeWayMethods.__getUltimateThreeWayAncestorInTree();
			if (!!myId) {
				if (!!parentInstance) {
					delete parentInstance[THREE_WAY_NAMESPACE].children[myId];
					parentInstance[THREE_WAY_NAMESPACE].__hasChild.set(myId, false);
				}
				delete ultimateAncestor[THREE_WAY_NAMESPACE].familyTreeMembers[myId];
			}

			ThreeWay.reload._deregisterForReload(myId, instance);
		});

		tmpl.helpers({
			_3w_id: () => Template.instance()[THREE_WAY_NAMESPACE_METHODS].getId(),
			_3w_3wInstanceId: () => Template.instance()[THREE_WAY_NAMESPACE_METHODS].get3wInstanceId(),
			_3w_hasData: () => Template.instance()[THREE_WAY_NAMESPACE].hasData.get(),
			_3w_get: (propName) => Template.instance()[THREE_WAY_NAMESPACE_METHODS].get(propName),
			_3w_getAll: () => Template.instance()[THREE_WAY_NAMESPACE_METHODS].getAll(),

			_3w_display: function _3w_display(displayDescription) {
				var pipelineSplit = displayDescription.split('|').map(x => x.trim()).filter(x => x !== "");
				var source = pipelineSplit[0];
				var mappings = pipelineSplit.splice(1);
				return Template.instance()[THREE_WAY_NAMESPACE_METHODS].__processInTemplateContext(source, mappings, null);
			},

			_3w_focusedField: () => Template.instance()[THREE_WAY_NAMESPACE_METHODS].focusedField(),
			_3w_focusedFieldUpdatedOnServer: p => Template.instance()[THREE_WAY_NAMESPACE_METHODS].focusedFieldUpdatedOnServer(p),

			_3w_isSyncedToServer: (propName) => Template.instance()[THREE_WAY_NAMESPACE_METHODS].isSyncedToServer(propName),
			_3w_notSyncedToServer: (propName) => !Template.instance()[THREE_WAY_NAMESPACE_METHODS].isSyncedToServer(propName),
			_3w_allSyncedToServer: () => Template.instance()[THREE_WAY_NAMESPACE_METHODS].allSyncedToServer(),
			_3w_isNotInvalid: (propName) => Template.instance()[THREE_WAY_NAMESPACE_METHODS].isNotInvalid(propName),
			_3w_isInvalid: (propName) => !Template.instance()[THREE_WAY_NAMESPACE_METHODS].isNotInvalid(propName),
			_3w_validValuesSynced: (propName) => Template.instance()[THREE_WAY_NAMESPACE_METHODS].isSyncedToServer(propName) || (!Template.instance()[THREE_WAY_NAMESPACE_METHODS].isNotInvalid(propName)),
			_3w_validValuesNotSynced: (propName) => (!Template.instance()[THREE_WAY_NAMESPACE_METHODS].isSyncedToServer(propName)) && Template.instance()[THREE_WAY_NAMESPACE_METHODS].isNotInvalid(propName),
			_3w_expandParams: ThreeWay.utils.expandParams,

			_3w_parentDataGet: (p, levelsUp) => Template.instance()[THREE_WAY_NAMESPACE_METHODS].parentDataGet(p, levelsUp),
			_3w_parentDataGetAll: (levelsUp) => Template.instance()[THREE_WAY_NAMESPACE_METHODS].parentDataGetAll(levelsUp),

			_3w_childDataGetId: (childNameArray) => Template.instance()[THREE_WAY_NAMESPACE_METHODS].childDataGetId(childNameArray),
			_3w_childDataGet: (p, childNameArray) => Template.instance()[THREE_WAY_NAMESPACE_METHODS].childDataGet(p, childNameArray),
			_3w_childDataGetAll: (childNameArray) => Template.instance()[THREE_WAY_NAMESPACE_METHODS].childDataGetAll(childNameArray),

			_3w_siblingDataGet: (p, siblingName) => Template.instance()[THREE_WAY_NAMESPACE_METHODS].siblingDataGet(p, siblingName),
			_3w_siblingDataGetAll: (siblingName) => Template.instance()[THREE_WAY_NAMESPACE_METHODS].siblingDataGetAll(siblingName),
		});
	});

	//////////////////////////////////////////////////////////////////////
	// Reload Stuff
	//////////////////////////////////////////////////////////////////////
	var ThreeWayReload = {};
	var _reloadRegistration = {};
	PackageUtilities.addMutablePropertyObject(ThreeWayReload, '_reloadRegistration', _reloadRegistration);
	PackageUtilities.addImmutablePropertyFunction(ThreeWayReload, '_registerForReload', function _registerForReload(reloadId, instance) {
		_reloadRegistration[reloadId] = instance;
	});
	PackageUtilities.addImmutablePropertyFunction(ThreeWayReload, '_deregisterForReload', function _deregisterForReload(reloadId) {
		delete _reloadRegistration[reloadId];
	});
	var _reloadStatus = {
		ready: false
	};
	var threeWayMigrationData = Reload._migrationData(THREE_WAY_MIGRATION_NAME) || null;
	if (!!threeWayMigrationData && !!threeWayMigrationData.data) {
		threeWayMigrationData._unreadData = _.extend({}, threeWayMigrationData.data);
	}
	PackageUtilities.addImmutablePropertyObject(ThreeWayReload, '_migrationData', threeWayMigrationData);
	PackageUtilities.addMutablePropertyObject(ThreeWayReload, '_reloadStatus', _reloadStatus);
	PackageUtilities.addImmutablePropertyFunction(ThreeWayReload, '_haveReloadPayload', function _haveReloadPayload(reloadId) {
		return threeWayMigrationData && threeWayMigrationData._unreadData && (typeof threeWayMigrationData._unreadData[reloadId] !== "undefined");
	});
	PackageUtilities.addImmutablePropertyFunction(ThreeWayReload, '_getReloadPayload', function _getReloadPayload(reloadId) {
		if (IN_DEBUG_MODE_FOR('reload')) {
			console.info('[ThreeWay|Reload] Getting payload for ' + reloadId + '.');
		}
		var ret;
		if (!!threeWayMigrationData && !!threeWayMigrationData._unreadData && !!threeWayMigrationData._unreadData[reloadId]) {
			ret = threeWayMigrationData._unreadData[reloadId];
			delete threeWayMigrationData._unreadData[reloadId];
		}
		return ret;
	});

	var _newThreeWayMigrationData;
	Reload._onMigrate(THREE_WAY_MIGRATION_NAME, function(retry) {
		if (_reloadStatus.ready) {
			if (IN_DEBUG_MODE_FOR('reload')) {
				console.info('[ThreeWay|Reload] Storing migration data and reloading...');
			}

			var now = new Date();
			var history = threeWayMigrationData && threeWayMigrationData.history || [];
			history.unshift({
				time: now,
				autoupdateVersion: __meteor_runtime_config__.autoupdateVersion,
				autoupdateVersionCordova: __meteor_runtime_config__.autoupdateVersionCordova,
				autoupdateVersionRefreshable: __meteor_runtime_config__.autoupdateVersionRefreshable,
				meteorRelease: __meteor_runtime_config__.meteorRelease,
			});

			return [true, {
				time: now,
				history: history,
				meteorRuntimeConfig: __meteor_runtime_config__,
				data: _newThreeWayMigrationData,
			}];
		} else {
			if (IN_DEBUG_MODE_FOR('reload')) {
				console.info('[ThreeWay|Reload] Reload triggered. Preparing...');
			}
			_reloadStatus.ready = true;
			_reloadStatus.reloadRetry = retry;

			setTimeout(function() {
				// Flush and then do things
				// Done here so things don't happen within a computation/flush
				if (IN_DEBUG_MODE_FOR('reload')) {
					console.info('[ThreeWay|Reload] Flushing...');
				}
				Tracker.flush();

				// Populate Migration Data
				if (IN_DEBUG_MODE_FOR('reload')) {
					console.info('[ThreeWay|Reload] Preparing migration data...');
				}
				_newThreeWayMigrationData = _.object(_.map(_reloadRegistration, (instance, id) => [id, instance[THREE_WAY_NAMESPACE_METHODS].getAll_NR()]));

				// Retry reload
				if (IN_DEBUG_MODE_FOR('reload')) {
					console.info('[ThreeWay|Reload] Ready to reload...');
				}

				if (IN_DEBUG_MODE_FOR('reload')) {
					console.info('[ThreeWay|Reload] Waiting 5 sec...');
					setTimeout(_reloadStatus.reloadRetry, 5000);
				} else {
					_reloadStatus.reloadRetry();
				}
			}, 0);
			return false;
		}
	});

	PackageUtilities.addMutablePropertyObject(ThreeWay, 'reload', ThreeWayReload);

	//////////////////////////////////////////////////////////////////////
	// Extra Content
	//////////////////////////////////////////////////////////////////////
	PackageUtilities.addImmutablePropertyObject(ThreeWay, 'preProcessorGenerators', {
		undefinedFilterGenerator: function undefinedFilterGenerator(defaultValue) {
			return x => (typeof x === "undefined") ? defaultValue : x;
		},
		nullOrUndefinedFilterGenerator: function nullOrUndefinedFilterGenerator(defaultValue) {
			return x => ((typeof x === "undefined") || (x === null)) ? defaultValue : x;
		},
		makeMap: function makeMap(map, defaultValue) {
			return k => map.hasOwnProperty(k) ? map[k] : defaultValue;
		},
	});

	PackageUtilities.addImmutablePropertyObject(ThreeWay, 'preProcessors', {
		not: x => !x,
		truthy: x => !!x,
		isNonEmptyString: x => (typeof x === "string") && x.length > 0,
		isNonEmptyArray: x => (x instanceof Array) && x.length > 0,
		toUpperCase: x => ((typeof x === "undefined") || (x === null)) ? "" : x.toString().toUpperCase(),
		toLowerCase: x => ((typeof x === "undefined") || (x === null)) ? "" : x.toString().toLowerCase(),
		updateSemanticUIDropdown: function updateSemanticUIDropdown(x, elem) {
			if ((typeof x !== "undefined") && (x !== null)) {

				// check for correct element
				var validElement = !!elem && !!elem.parentElement && !!elem.parentElement.tagName && (elem.parentElement.tagName.toUpperCase() === "DIV");
				var parentElementClassList;
				if (validElement) {
					parentElementClassList = Array.prototype.map.call(elem.parentElement.classList, x => x.toLowerCase());
					['ui', 'dropdown'].forEach(function(tag) {
						if (parentElementClassList.indexOf(tag) === -1) {
							validElement = false;
						}
					});
				}
				if (!validElement) {
					console.warn('Unable to find Semantic UI dropdown element.', elem, elem.parentElement);
					return x;
				}

				var isMultipleSelectDropdown = parentElementClassList.indexOf('multiple') !== -1;
				var dropdown = $(elem.parentElement);
				var dropdownObject = $(elem.parentElement).dropdown('get');
				var selectedItems;

				if (isMultipleSelectDropdown) {
					// Multi-select dropdown
					var selection = (x.toString().trim() === "") ? [] : x.toString().trim().split(',').map(x => x.trim());
					var theIcon = dropdown.find('i.dropdown.icon');
					// Remove labels
					dropdown.find('a.ui.label').remove();
					// Reset selection status
					dropdown.find('div.item').removeClass("selected active filtered");
					var items = "";
					var genLabel = (id, label) => "<a class=\"ui label transition visible\" data-value=\"" + id + "\" style=\"display: inline-block !important;\">" + label + "<i class=\"delete icon\"></i></a>\n";
					selectedItems = selection.map(id => [id, Array.prototype.filter.call(dropdown.find('div.item'), elem => ((elem.getAttribute('data-value') || "").trim() === id))]);
					selectedItems.forEach(function(item) {
						var id = item[0];
						var elems = item[1];
						elems.forEach(function(elem) {
							// Set selection status
							$(elem).addClass("active filtered");
							// Prepare to create labels
							items += genLabel(id, elem.getAttribute('data-text') || elem.innerText);
						});

						if (elems.length === 0) {
							if ((!!dropdownObject.userValues()) && (dropdownObject.userValues().indexOf(id) !== -1)) {
								items += genLabel(id, id);
							}
						}
					});
					// Create labels
					theIcon.after(items);
				} else {
					// Single selection dropdown
					var selectedItem = x.toString().trim();
					// Reset selection status
					dropdown.find('div.item').removeClass("selected active");
					var textValue;
					selectedItems = Array.prototype.filter.call(dropdown.find('div.item'), elem => ((elem.getAttribute('data-value') || "").trim() === selectedItem));
					selectedItems.forEach(function(elem) {
						// Set selection status
						$(elem).addClass("selected active");
						// Get label text
						textValue = elem.innerText;
					});
					// Update value
					if (!!textValue) {
						dropdown
							.find('div.text')
							.removeClass('default')
							.text(textValue);
					} else {
						if (!!dropdownObject.defaultText()) {
							dropdown
								.find('div.text')
								.addClass('default')
								.text(dropdownObject.defaultText());
						}
					}
				}
			}
			$(elem.parentElement)
				.dropdown('refresh');
			return x;
		},
		undefinedToEmptyStringFilter: ThreeWay.preProcessorGenerators.undefinedFilterGenerator(""),
		nullOrUndefinedToEmptyStringFilter: ThreeWay.preProcessorGenerators.nullOrUndefinedFilterGenerator(""),
	});

	PackageUtilities.addImmutablePropertyObject(ThreeWay, 'transformationGenerators', {
		arrayFromIdKeyDictionary: idField => function arrayFromIdKeyDictionary(dict) {
			return (!!dict) ? _.map(dict, function(v, id) {
				var o = _.extend({}, v);
				o[idField] = id;
				return o;
			}) : [];
		},
		arrayToIdKeyDictionary: idField => function arrayToIdKeyDictionary(arr) {
			return (!!arr) ? _.object(arr.map(x => [x[idField], x])) : {};
		},
		arrayFromDelimitedString: function arrayFromDelimitedString(delimiter) {
			return function arrayFromDelimitedString(x) {
				if ((typeof x === "undefined") || (x === null)) {
					return [];
				}
				var outcome;
				if (x.toString().trim() === '') {
					outcome = [];
				} else {
					outcome = x.toString().split(delimiter).map(y => y.trim());
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
				return !(arr instanceof Array) ? false : (((arr.length === 1) && (arr[0] === trueIndicator)) ? true : false);
			};
		},
		booleanToArray: function booleanToArray(trueIndicator) {
			return function booleanToArray(x) {
				return !!x ? [trueIndicator] : [];
			};
		},
		numberFromString: (defaultValue) => function numberFromString(num) {
			var _num = Number(num);
			return Number.isNaN(_num) ? defaultValue : _num;
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

	PackageUtilities.addImmutablePropertyObject(ThreeWay, 'eventGenerators', {
		keypressHandlerGenerator: function keypressHandlerGenerator(handler, keyCodes, specialKeys) {
			specialKeys = specialKeys || {};
			return function keypressHandler(event, template, vmData) {
				var specialKeysMatch = true;
				['altKey', 'ctrlKey', 'shiftKey'].forEach(function(k) {
					if (typeof specialKeys[k] !== "undefined") {
						specialKeysMatch = specialKeysMatch && (specialKeys[k] === event[k]);
					}
				});
				if (specialKeysMatch && (keyCodes.indexOf(event.keyCode) !== -1)) {
					return handler(event, template, vmData);
				}
			};
		},
		keypressHandlerGeneratorFromChars: function keypressHandlerGeneratorFromChars(handler, chars, specialKeys) {
			specialKeys = specialKeys || {};
			return function keypressHandler(event, template, vmData) {
				var specialKeysMatch = true;
				['altKey', 'ctrlKey', 'shiftKey'].forEach(function(k) {
					if (typeof specialKeys[k] !== "undefined") {
						specialKeysMatch = specialKeysMatch && (specialKeys[k] === event[k]);
					}
				});
				if (specialKeysMatch && (Array.prototype.map.call(chars.toUpperCase(), x => x.charCodeAt(0)).indexOf(event.keyCode) !== -1)) {
					return handler(event, template, vmData);
				}
			};
		},
		returnKeyHandlerGenerator: function returnKeyHandlerGenerator(handler, specialKeys) {
			specialKeys = specialKeys || {};
			return function returnKeypressHandler(event, template, vmData) {
				var specialKeysMatch = true;
				['altKey', 'ctrlKey', 'shiftKey'].forEach(function(k) {
					if (typeof specialKeys[k] !== "undefined") {
						specialKeysMatch = specialKeysMatch && (specialKeys[k] === event[k]);
					}
				});
				if (specialKeysMatch && (event.keyCode === 13)) {
					return handler(event, template, vmData);
				}
			};
		},
	});

}
import { Meteor } from 'meteor/meteor';
import { Tracker } from 'meteor/tracker';
const _ = require('underscore');

/* global ThreeWayDependencies: true */
if (typeof ThreeWayDependencies === "undefined") {
	ThreeWayDependencies = {};
}

ThreeWayDependencies.createMethods = function(options, instance) {
	var threeWay = instance[THREE_WAY_NAMESPACE];
	var threeWayMethods = {};
	instance[THREE_WAY_NAMESPACE_METHODS] = threeWayMethods;

	var updateRelatedFields = ThreeWayDependencies.instanceUtils.generateUpdateRelatedFieldsFunction(options, instance);

	var __rootChanges = 0;
	threeWayMethods.setRoots = function setRoots(selectorString) {
		var nodes = instance.$(selectorString);
		__rootChanges += 1;
		threeWay.rootNodes = Array.prototype.map.call(nodes, x => x);
		threeWay._rootNodes.set(selectorString + "|" + __rootChanges);
	};
	threeWayMethods.setId = function setId(id) {
		if (typeof id !== "string") {
			// I don't know why I need this error check
			throw new Meteor.Error("id-should-be-a-string");
		}
		threeWay.id.set(id);
	};
	threeWayMethods.getId = function getId() {
		return threeWay.id.get();
	};
	threeWayMethods.get3wInstanceId = function get3wInstanceId() {
		return threeWay.instanceId.get();
	};
	threeWayMethods.get = function get(p) {
		return threeWay.data.get(p);
	};
	threeWayMethods.getWithDefault = function getWithDefault(p, defaultValue) {
		var v = threeWay.data.get(p);
		if (typeof v === "undefined") {
			return defaultValue;
		}
		return v;
	};
	threeWayMethods.set = function set(p, v) {
		threeWay.data.set(p, v);
		threeWay._focusedFieldUpdatedOnServer.set(p, false);
		updateRelatedFields(p, v);
	};
	threeWayMethods.get_NR = function get_NR(p) {
		var ret;
		Tracker.nonreactive(function() {
			ret = threeWayMethods.get(p);
		});
		return ret;
	};
	threeWayMethods.getAll = function getAll() {
		return threeWay.data.all();
	};
	threeWayMethods.getAll_NR = function getAll_NR() {
		var ret;
		Tracker.nonreactive(function() {
			ret = threeWayMethods.getAll();
		});
		return ret;
	};

	threeWayMethods.withArray = function withArray(p, methodName, ...args) {
		var item = threeWayMethods.get_NR(p);
		if (!_.isArray(item)) {
			throw new Meteor.Error("not-array");
		}
		var ret = Array.prototype[methodName].apply(item, args);
		threeWayMethods.set(p, item);
		return ret;
	};

	threeWayMethods.mapData = function mapData(p, mapFunction, ...additionalArgs) {
		var item = threeWayMethods.get_NR(p);
		var ret = mapFunction.apply(null, [item].concat(additionalArgs));
		threeWayMethods.set(p, ret);
		return ret;
	};

	threeWayMethods.isPropVMOnly = function isPropVMOnly(p) {
		var pSplit = p.split('.');
		var q = '';

		// VM only if all parent fields are not DB fields
		while (pSplit.length > 0) {
			q = q ? (q + '.' + pSplit.shift()) : pSplit.shift();
			if (ThreeWayDependencies.utils.matchParamStrings(options.fields, q).length > 0) {
				return false;
			}
		}
		return true;
	};

	threeWayMethods.getAll_VMOnly_NR = function getAll_VMOnly_NR() {
		var vmData = threeWayMethods.getAll_NR();
		_.forEach(threeWay.fieldMatchParams, function(v, k) {
			if (!threeWayMethods.isPropVMOnly(k) && vmData.hasOwnProperty(k)) {
				delete vmData[k];
			}
		});
		return vmData;
	};

	threeWayMethods.getTemplateByPath = function getTemplateByPath(path = []) {
		if (_.isArray(path)) {
			if (path.length > 0) {
				var item = path.shift();
				if (item === "..") {
					// parent
					var parentInstance = threeWayMethods.__getNearestThreeWayAncestor(1);
					if (!!parentInstance) {
						return parentInstance[THREE_WAY_NAMESPACE_METHODS].getTemplateByPath(path);
					}
				} else {
					// child
					var hasChildData;
					Tracker.nonreactive(function() {
						hasChildData = !!threeWay.__hasChild.get(item);
					});
					if (hasChildData) {
						return threeWay.children[item][THREE_WAY_NAMESPACE_METHODS].getTemplateByPath(path);
					}
				}
			} else {
				return instance;
			}
		}
	};

	threeWayMethods.callOnTemplateByPath = function callOnTemplateByPath(path, methodName, ...args) {
		var instance = threeWayMethods.getTemplateByPath(path);
		if (!!instance) {
			return instance[THREE_WAY_NAMESPACE_METHODS][methodName].apply(instance, args);
		} else {
			throw new Meteor.Error('invalid-path');
		}
	};

	threeWayMethods.applyOnTemplateByPath = function applyOnTemplateByPath(path, methodName, args) {
		var instance = threeWayMethods.getTemplateByPath(path);
		if (!!instance) {
			return instance[THREE_WAY_NAMESPACE_METHODS][methodName].apply(instance, args);
		} else {
			throw new Meteor.Error('invalid-path');
		}
	};

	threeWayMethods.focusedField = function focusedField() {
		return threeWay._focusedField.get();
	};
	threeWayMethods.focusedFieldUpdatedOnServer = function focusedFieldUpdatedOnServer(p) {
		return threeWay._focusedFieldUpdatedOnServer.get(p);
	};

	threeWayMethods.isSyncedToServer = function isSyncedToServer(p) {
		return !!threeWay.__serverIsUpdated.get(p);
	};
	threeWayMethods.allSyncedToServer = function allSyncedToServer() {
		return _.reduce(threeWay.__serverIsUpdated.all(), (m, v) => !!m && !!v, true);
	};
	threeWayMethods.isNotInvalid = function isNotInvalid(p) {
		return !!threeWay.__dataIsNotInvalid.get(p);
	};

	threeWayMethods.parentDataGet = function parentDataGet(p, levelsUp) {
		return threeWayMethods.__getNearestThreeWayAncestor(levelsUp)[THREE_WAY_NAMESPACE_METHODS].get(p);
	};
	threeWayMethods.parentDataGetAll = function parentDataGetAll(levelsUp) {
		return threeWayMethods.__getNearestThreeWayAncestor(levelsUp)[THREE_WAY_NAMESPACE_METHODS].getAll();
	};
	threeWayMethods.parentDataSet = function parentDataSet(p, v, levelsUp) {
		return threeWayMethods.__getNearestThreeWayAncestor(levelsUp)[THREE_WAY_NAMESPACE_METHODS].set(p, v);
	};
	threeWayMethods.parentDataGet_NR = function parentDataGet_NR(p, levelsUp) {
		return threeWayMethods.__getNearestThreeWayAncestor(levelsUp)[THREE_WAY_NAMESPACE_METHODS].get_NR(p);
	};
	threeWayMethods.parentDataGetAll_NR = function parentDataGetAll_NR(levelsUp) {
		return threeWayMethods.__getNearestThreeWayAncestor(levelsUp)[THREE_WAY_NAMESPACE_METHODS].getAll_NR();
	};

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

	threeWayMethods.__getNearestThreeWayAncestor = function _3w_getNearestThreeWayAncestor(levelsUp = 1) {
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
			console.log("[vm-only] [" + Tracker.nonreactive(threeWayMethods.get3wInstanceId) + "] Resetting view model only values to initial values.", threeWay.vmOnlyData_Initial);
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
		if (_.isFunction(options.eventHandlers[evt])) {
			return options.eventHandlers[evt];
		} else if (!!threeWayMethods.__getNearestThreeWayAncestor()) {
			return threeWayMethods.__getNearestThreeWayAncestor()[THREE_WAY_NAMESPACE_METHODS].getInheritedEventHandler(evt);
		}
	};
	threeWayMethods.getInheritedPreProcessor = function _3w_getInheritedPreProcessor(p) {
		if (_.isFunction(options.preProcessors[p])) {
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

	////////////////////////////////////////////////////////////
	// Call helpers and pre-processors in template context
	threeWayMethods._processInTemplateContext = function processInTemplateContext(source, mappings = [], elem = null, {
		useHelpers = true,
		processorsMutateValue = true,
		additionalFailureCondition = () => false,
		allowWholeDocumentAsSource = false
	} = {}) {
		var thisTemplate = instance.view.template;

		if (!_.isFunction(additionalFailureCondition)) {
			throw new Meteor.Error("invalid-input", "additionalFailureCondition should be a function");
		}

		var value;
		instance.callFunctionWithTemplateContext({
			elemOrSelector: elem,
			func: function() {
				var dataSourceInfomation = [];
				var getFailed = false;
				var sourceElems = source.split("#").map(x => x.trim()).filter(x => x !== "");
				value = sourceElems.map(function(src) {
					var _value;
					if (useHelpers && (typeof options.helpers[src] !== "undefined")) {
						_value = _.isFunction(options.helpers[src]) ? options.helpers[src].call(instance) : options.helpers[src];
						dataSourceInfomation.push({
							type: 'helper',
							name: src
						});
					} else if (useHelpers && (typeof threeWayMethods.getInheritedHelper(src) !== "undefined")) {
						_value = _.isFunction(threeWayMethods.getInheritedHelper(src)) ? threeWayMethods.getInheritedHelper(src).call(instance) : threeWayMethods.getInheritedHelper(src);
						dataSourceInfomation.push({
							type: 'ancestor-helper',
							name: src
						});
					} else if (useHelpers && thisTemplate.__helpers.has(src)) {
						_value = _.isFunction(thisTemplate.__helpers.get(src)) ? thisTemplate.__helpers.get(src).call(instance) : thisTemplate.__helpers.get(src);
						dataSourceInfomation.push({
							type: 'blaze-helper',
							name: src
						});
					} else if (allowWholeDocumentAsSource && (src === "*")) {
						_value = threeWay.collection.findOne({
							_id: threeWay.id.get()
						});
						dataSourceInfomation.push({
							type: 'document',
							name: src
						});
					} else if (allowWholeDocumentAsSource && (src === "@")) {
						_value = threeWayMethods.getAll();
						dataSourceInfomation.push({
							type: 'view-model',
							name: src
						});
					} else {
						_value = threeWay.data.get(src);
						dataSourceInfomation.push(_.extend({
							type: 'field',
							name: src
						}, threeWay.fieldMatchParams[src] || {}));
					}
	
					if (typeof _value === "undefined") {
						// try document...
						_value = threeWay.collection.findOne({
							_id: threeWay.id.get()
						});
						if (!!_value) {
							var srcPath = src.split('.');
							while (srcPath.length > 0) {
								var thisPathElem = srcPath.shift();
								if (typeof _value[thisPathElem] !== "undefined") {
									_value = _value[thisPathElem];
								} else {
									_value = void 0;
									break;
								}
							}
							dataSourceInfomation.push({
								type: 'document-field',
								name: src
							});
						}
					}
	
					if ((typeof _value === "undefined") || additionalFailureCondition(_value)) {
						getFailed = true;
					} else {
						return _value;
					}
				});
				if (getFailed) {
					if (value.length === 1) {
						value = value[0];
					}
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
					if (!_.isFunction(preProcessor)) {
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
			}
		});

		return value;
	};

	threeWayMethods.fetch = function fetch(src) {
		return threeWayMethods._processInTemplateContext(src, [], null, {
			useHelpers: false,
			allowWholeDocumentAsSource: false,
		});
	};

	threeWayMethods.fetchExtended = function fetchExtended(src) {
		return threeWayMethods._processInTemplateContext(src, [], null, {
			useHelpers: true,
			allowWholeDocumentAsSource: true,
		});
	};
	// End Call helpers and pre-processors in template context
	////////////////////////////////////////////////////////////


	return threeWayMethods;
};
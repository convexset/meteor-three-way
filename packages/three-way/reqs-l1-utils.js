/* global ThreeWayDependencies: true */

const PackageUtilities = require('package-utils');
const _ = require('underscore');


if (typeof ThreeWayDependencies === "undefined") {
	ThreeWayDependencies = {};
}
ThreeWayDependencies.utils = {};

//////////////////////////////////////////////////////////////////////
// All Instances
//////////////////////////////////////////////////////////////////////
ThreeWayDependencies._allThreeWayInstances = [];
PackageUtilities.addPropertyGetter(ThreeWayDependencies.utils, 'allInstances', () => ThreeWayDependencies._allThreeWayInstances.map(function(instance) {
	if (_allowInstanceEnumeration) {
		var instanceId, dataId, doc;
		Tracker.nonreactive(function() {
			instanceId = instance._3w_.get3wInstanceId();
			dataId = instance._3w_.getId();
			doc = instance[THREE_WAY_NAMESPACE].collection.findOne({
				_id: dataId
			});
		});
		return {
			instanceId: instanceId,
			dataId: dataId,
			data: instance._3w_.getAll_NR(),
			document: doc,
			template: instance,
			templateType: instance.view.name,
		};
	} else {
		throw new Meteor.Error("instance-enumeration-forbidden");
	}
}));

PackageUtilities.addPropertyGetter(ThreeWayDependencies.utils, 'allInstancesByTemplateType', () => _.groupBy(ThreeWayDependencies.utils.allInstances, item => item.templateType));

var _allowInstanceEnumeration = true;
var _preventInstanceEnumeration_called = false;
PackageUtilities.addImmutablePropertyFunction(ThreeWayDependencies.utils, '_preventInstanceEnumeration', function _preventInstanceEnumeration(prevent = true) {
	_preventInstanceEnumeration_called = true;
	if (_.isFunction(prevent) ? !!prevent() : !!prevent) {
		_allowInstanceEnumeration = false;
	}
});

Meteor.startup(function() {
	setTimeout(function() {
		if (!_preventInstanceEnumeration_called) {
			console.warn('[ThreeWay] ThreeWay.utils._preventInstanceEnumeration was not called. This is recommended when going into production.\n\nDo: ThreeWay.utils._preventInstanceEnumeration() or ThreeWay.utils._preventInstanceEnumeration(true) to prevent direct access to template instances via ThreeWay.\nDo: ThreeWay.utils._preventInstanceEnumeration(false) to allow direct access to template instances via ThreeWay.\n\nSee the documentation (Usage > Going Into Production) for more details.');
		}
	}, 10000);
});


//////////////////////////////////////////////////////////////////////
// Various Utilities
//////////////////////////////////////////////////////////////////////
PackageUtilities.addImmutablePropertyFunction(ThreeWayDependencies.utils, 'parseOptions', function parseOptions(tmpl, options) {
	if (typeof tmpl === "undefined") {
		throw new Meteor.Error('missing-argument', 'template required');
	}
	if (Object.getPrototypeOf(tmpl) !== Blaze.Template.prototype) {
		throw new Meteor.Error('invalid-argument', 'template required');
	}
	if (typeof options === "undefined") {
		throw new Meteor.Error('missing-argument', 'options required');
	}
	if (typeof options !== "object") {
		throw new Meteor.Error('invalid-argument', 'options object required');
	}
	_.forEach({
		collection: null,
		useTransformedData: true,
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
		eventHandlers: {},
		helpers: {},
		updateOfFocusedFieldCallback: null,
		validateRepeats: false,
	}, function(v, k) {
		if (!options.hasOwnProperty(k)) {
			options[k] = v;
		}
	});

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

	// Default Values
	_.forEach(options.injectDefaultValues, function(v, f) {
		// Check that default values are valid fields
		if (options.fields.indexOf(f) === -1) {
			throw new Meteor.Error('no-such-field', '[Inject Default Values] No such field: ' + f);
		}

		// Wildcards at last item of fields rejected
		if (f.split('.').pop() === "*") {
			throw new Meteor.Error('invalid-field', '[Inject Default Values] Field specifier cannot be terminated with a wild card: ' + f);
		}
	});

	// Adding Pre-Processors
	_.forEach(ThreeWayDependencies.extras.preProcessors, function(fn, p) {
		if (typeof options.preProcessors[p] === "undefined") {
			options.preProcessors[p] = fn;
		}
	});

	// "" as field forbidden
	if (typeof options.updatersForServer[''] !== "undefined") {
		throw new Meteor.Error("empty-field-forbidden", "\"\" is not a valid field name");
	}
});

PackageUtilities.addImmutablePropertyFunction(ThreeWayDependencies.utils, 'generateExtendedFieldList', function generateExtendedFieldList(options) {
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

	return {
		extendedFields: extendedFields,
		pseudoFields: pseudoFields,
	};
});

PackageUtilities.addImmutablePropertyFunction(ThreeWayDependencies.utils, 'threeWayDefaultItem', function threeWayDefaultItem(options) {
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
	return threeWay;
});

PackageUtilities.addImmutablePropertyFunction(ThreeWayDependencies.utils, 'expandParams', function expandParams(fieldSpec, params) {
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
PackageUtilities.addImmutablePropertyFunction(ThreeWayDependencies.utils, 'getNewId', function getNewId() {
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

PackageUtilities.addImmutablePropertyFunction(ThreeWayDependencies.utils, 'removeOldItems', function removeOldItems(arr, threshold) {
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
});

PackageUtilities.addImmutablePropertyFunction(ThreeWayDependencies.utils, 'popItemWithValue', function popItemWithValue(arr, value, item, popOne) {
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
});

PackageUtilities.addImmutablePropertyFunction(ThreeWayDependencies.utils, 'matchParamStrings', function matchParamStrings(templateStrings, itemString, matchOne) {
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
			return x.params.length < y.params.length ? -1 : 1;
		}
		// later occurrence of "*" wins
		return x.match.indexOf('*') > y.match.indexOf('*') ? -1 : 1;
	});
});

// TODO: Remove this when appropriate
PackageUtilities.addImmutablePropertyFunction(ThreeWayDependencies.utils, 'clearReactiveDictSafely', function clearReactiveDictSafely(rd) {
	_.forEach(rd.keys, function(v, k) {
		rd.delete(k);
	});
});

// Created to extricate event handlers that flush from computations
PackageUtilities.addImmutablePropertyFunction(ThreeWayDependencies.utils, 'pushToEndOfEventQueue', function pushToEndOfEventQueue(fn, context, dt = 0) {
	setTimeout(() => fn.apply(context), dt);
});

// Filter dictionary of methods and keep only some keys
PackageUtilities.addImmutablePropertyFunction(ThreeWayDependencies.utils, 'filterForKeys', function filterForKeys(o, keys) {
	return _.object(_.map(o, function(v, k) {
		return [k, v];
	}).filter(function(kvp) {
		return keys.indexOf(kvp[0]) !== -1;
	}));
});

// Filter dictionary of methods and keep only some keys
PackageUtilities.addImmutablePropertyFunction(ThreeWayDependencies.utils, 'generateDoNothingMethods', function generateDoNothingMethods(fieldList) {
	return _.object(
		fieldList.map(function(f) {
			return [
				f,
				function doNothing() {}
			];
		})
	);
});
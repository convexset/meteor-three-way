/* global ThreeWayDependencies: true */
/* global ThreeWayDependencies: true */
if (typeof ThreeWayDependencies === "undefined") {
	ThreeWayDependencies = {};
}


ThreeWayDependencies.templateOnCreated = function(options) {
	var {
		extendedFields: extendedFields,
		pseudoFields: pseudoFields
	} = ThreeWayDependencies.utils.generateExtendedFieldList(options);

	return function() {
		var instance = this;
		instance[THREE_WAY_NAMESPACE] = ThreeWayDependencies.utils.threeWayDefaultItem(options);
		ThreeWayDependencies.createMethods(options, instance);

		// Register on ThreeWayDependencies._allThreeWayInstances
		ThreeWayDependencies._allThreeWayInstances.push(instance);

		var threeWay = instance[THREE_WAY_NAMESPACE];
		var threeWayMethods = instance[THREE_WAY_NAMESPACE_METHODS];

		// Set up VM to Database binding
		var setUpVMToDBBinding = ThreeWayDependencies.instanceUtils.generateSetUpVMToDBBindingFunction(options, instance);

		// Set up data mirror
		instance.autorun(function() {
			threeWay.dataMirror = threeWay.data.all();
			if (IN_DEBUG_MODE_FOR('data-mirror')) {
				console.log('Updating data mirror...', threeWay.dataMirror);
			}
		});

		//////////////////////////////////////////////////////////////////////
		// Set up VM-Only Data
		//////////////////////////////////////////////////////////////////////
		(function __Setup_VM_Only_Data__() {
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
		})();


		//////////////////////////////////////////////////////////////////////
		// On Reload from Hot Code Push, Refresh View Model Only Data
		// ... but after name is acquired
		// ... so not here.
		//////////////////////////////////////////////////////////////////////


		// For matching fields
		// item.subitem --> (item.subitem, [])
		// item.subitem --> (item.*, ['subitem'])
		function doFieldMatch(curr_f, isObserver) {
			if (typeof isObserver === "undefined") {
				isObserver = true;
			}
			if (threeWay._fieldsTested.indexOf(curr_f) === -1) {
				var matches = ThreeWayDependencies.utils.matchParamStrings(options.fields, curr_f); // Match all (single run)
				if (matches.length > 1) {
					if (isObserver && IN_DEBUG_MODE_FOR('observer')) {
						console.warn('[Observer] Ambiguous matches for ' + curr_f, ' (will use most specific):', matches);
					}
				}
				threeWay.fieldMatchParams[curr_f] = (matches.length > 0) ? matches[0] : null;
				threeWay._fieldPseudoMatched[curr_f] = (!!threeWay.fieldMatchParams[curr_f]) ? true : ((extendedFields.indexOf(curr_f) === -1) || (ThreeWayDependencies.utils.matchParamStrings(pseudoFields, curr_f, true).length > 0));
				threeWay._fieldsTested.push(curr_f);
			}
		}
		threeWayMethods._doFieldMatch = doFieldMatch;


		//////////////////////////////////////////////////////////////////
		// The big set-up
		//////////////////////////////////////////////////////////////////
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
				_.forEach(data, function(v, f) {
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
			ThreeWayDependencies.utils.clearReactiveDictSafely(threeWay.data); // threeWay.data.clear();
			ThreeWayDependencies.utils.clearReactiveDictSafely(threeWay._focusedFieldUpdatedOnServer); // threeWay._focusedFieldUpdatedOnServer.clear();

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
				ThreeWayDependencies.utils.pushToEndOfEventQueue(function forceFocusActiveElementJustInCase() {
					// Don't trigger synchronously to avoid flushes in a flush/computation
					$(elem).trigger('focus');
				}, {});
			})();

			threeWay.__mostRecentDatabaseEntry = {};
			threeWay.__mostRecentValidationValueVM = {};
			threeWay.__mostRecentValidationValueServer = {};
			threeWay.__recentDBUpdates = {};
			threeWay.__updatesToSkipDueToRelatedObjectUpdate = {};

			// TODO: Replace with .clear() when possible
			ThreeWayDependencies.utils.clearReactiveDictSafely(threeWay.__serverIsUpdated); // threeWay.__serverIsUpdated.clear();
			ThreeWayDependencies.utils.clearReactiveDictSafely(threeWay.__dataIsNotInvalid); // threeWay.__dataIsNotInvalid.clear();

			// Set Up Observer
			ThreeWayDependencies.dataObserver(options, instance, {
				_id: _id,
				setUpVMToDBBinding: setUpVMToDBBinding,
				doFieldMatch: doFieldMatch
			});
		});


		//////////////////////////////////////////////////////////////////
		// Set up data validation
		//////////////////////////////////////////////////////////////////
		threeWay.validateInput = ThreeWayDependencies.instanceUtils.generateValidationFunction(options, instance);


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
	};
};
/* global ThreeWayDependencies: true */
if (typeof ThreeWayDependencies === "undefined") {
	ThreeWayDependencies = {};
}

//////////////////////////////////////////////////////////////////////
// For Observing the DOM
//////////////////////////////////////////////////////////////////////
ThreeWayDependencies.dataObserver = function(options, instance, {
	_id, setUpVMToDBBinding, doFieldMatch
}) {
	var threeWay = instance[THREE_WAY_NAMESPACE];
	var threeWayMethods = instance[THREE_WAY_NAMESPACE_METHODS];
	var updateRelatedFields = ThreeWayDependencies.instanceUtils.generateUpdateRelatedFieldsFunction(options, instance);

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
						ThreeWayDependencies.utils.removeOldItems(threeWay.__recentDBUpdates[curr_f], AGE_THRESHOLD_OLD_ITEM);
						if (ThreeWayDependencies.utils.popItemWithValue(threeWay.__recentDBUpdates[curr_f], newValue, 'valueOnClient', true) > 0) {
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
								threeWay.data.set(curr_f, newValue);
								updateRelatedFields(curr_f, newValue, true);
								threeWay._focusedFieldUpdatedOnServer.set(curr_f, false);
							}
							threeWay.__mostRecentDatabaseEntry[curr_f] = newValue;
						}
					}

					// Set Up binding here and so DOM can get fresh values
					setUpVMToDBBinding(curr_f);

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
		// Prepare for default value injection 
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

		var injectDefaultValues = function injectDefaultValues() {
			// Inject default fields
			_.forEach(options.injectDefaultValues, function(v, f) {
				getFieldsWhereDefaultRequired(f).forEach(function(new_f) {
					if (IN_DEBUG_MODE_FOR('default-values')) {
						console.log("[default-values] Injecting " + new_f + " with value:", v);
					}
					doFieldMatch(new_f);
					setUpVMToDBBinding(new_f);
					threeWayMethods.set(new_f, v);
				});
			});
		};
		// End default value injection 
		//////////////////////////////////////////////////// 

		//////////////////////////////////////////////////// 
		// Setting Up Observers
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

				// This field should be cleared because updateRelatedFields
				// will mark certain fields as having "related updates"
				// spuriously when threeWayMethods.set is used with overlapping
				// field definitions; But we can conclude that at this point
				// no updates are pending
				threeWay.__updatesToSkipDueToRelatedObjectUpdate = {};
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

				// See similar comment above in "added" hook
				threeWay.__updatesToSkipDueToRelatedObjectUpdate = {};
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
		// End Setting Up Observers
		//////////////////////////////////////////////////// 
	}
};
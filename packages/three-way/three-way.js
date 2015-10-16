/* global ThreeWay: true */
/* global PackageUtilities: true */

var __tw = function ThreeWay() {};
ThreeWay = new __tw();

var THREE_WAY_NAMESPACE = "__three_way__";
var DEBOUNCE_INTERVAL = 400;

var DEBUG_MODE = false;
var DEBUG_MODE_ALL = false;
var DEBUG_MESSAGES = {
	'bindings': false,
	'data_mirror': false,
	'observer': false,
	'tracker': false,
	'new_id': false,
	'db': false,
	'value': false,
	'checked': false,
	'html': false,
	'visible': false,
};

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
			debounceInterval: DEBOUNCE_INTERVAL
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

		tmpl.onCreated(function() {
			var instance = this;

			var threeWay = {
				data: new ReactiveDict(),
				dataMirror: {},
				haveData: new ReactiveVar(false),
				id: new ReactiveVar(null),
				observer: null,
				bindings: [],
				computations: [],
				_updateComputations: null
			};

			instance[THREE_WAY_NAMESPACE] = threeWay;
			instance._3w_SetId = function(id) {
				threeWay.id.set(id);
			};
			instance._3w_Get = p => threeWay.data.get(p);
			instance._3w_Set = (p, v) => threeWay.data.set(p, v);
			instance._3w_Get_NR = p => threeWay.dataMirror[p];
			instance._3w_GetAll_NR = () => _.extend({}, threeWay.dataMirror);

			Tracker.autorun(function() {
				threeWay.dataMirror = instance[THREE_WAY_NAMESPACE].data.all();
				if (DEBUG_MODE && (DEBUG_MODE_ALL || DEBUG_MESSAGES['data_mirror'])) {
					console.log('Updating data mirror...', threeWay.dataMirror);
				}
			});
			Tracker.autorun(function() {
				if (!!threeWay.observer) {
					if (DEBUG_MODE && (DEBUG_MODE_ALL || DEBUG_MESSAGES['observer'])) {
						console.log('[Observer] Stopping existing observer...');
					}
					threeWay.observer.stop();
				}
				if (!!threeWay._updateComputations) {
					if (DEBUG_MODE && (DEBUG_MODE_ALL || DEBUG_MESSAGES['tracker'])) {
						console.log('[ThreeWay] Stopping existing update autoruns...');
					}
					threeWay._updateComputations.forEach(function(c) {
						c.stop();
					});
				}

				var _id = threeWay.id.get();
				threeWay.__idReadyFor = _.object(options.fields, options.fields.map(() => false));

				var mostRecentDatabaseEntry = {};

				if (!!_id) {
					if (DEBUG_MODE && (DEBUG_MODE_ALL || DEBUG_MESSAGES['new_id'])) {
						console.log('Current id: ' + _id);
					}
					if (DEBUG_MODE && (DEBUG_MODE_ALL || DEBUG_MESSAGES['observer'])) {
						console.log('[Observer] Creating new cursor: ' + _id);
					}

					var cursor = options.collection.find(_id, {
						fields: _.object(options.fields, options.fields.map(() => 1))
					});

					// Setting Up Observers
					threeWay.observer = cursor.observeChanges({
						added: function(id, fields) {
							if (DEBUG_MODE && (DEBUG_MODE_ALL || DEBUG_MESSAGES['observer'])) {
								console.log('[Observer] Added:', id, fields);
							}
							if (id === _id) {
								threeWay.haveData.set(true);
								_.forEach(fields, function(v, f) {
									if (options.fields.indexOf(f) !== -1) {
										threeWay.data.set(f, options.dataTransformFromServer[f](v));
										mostRecentDatabaseEntry[f] = options.dataTransformFromServer[f](v);
										threeWay.__idReadyFor[f] = true;
									}
								});
							}
						},
						changed: function(id, fields) {
							if (DEBUG_MODE && (DEBUG_MODE_ALL || DEBUG_MESSAGES['observer'])) {
								console.log('[Observer] Changes:', id, fields);
							}
							if (id === _id) {
								_.forEach(fields, function(v, f) {
									threeWay.data.set(f, options.dataTransformFromServer[f](v));
									mostRecentDatabaseEntry[f] = options.dataTransformFromServer[f](v);
									threeWay.__idReadyFor[f] = true;
								});
							}
						},
						removed: function(id) {
							if (DEBUG_MODE && (DEBUG_MODE_ALL || DEBUG_MESSAGES['observer'])) {
								console.log('[Observer] Removed:', id);
							}
							if (id === _id) {
								threeWay.haveData.set(false);
								threeWay.id.set(null);
								threeWay.__idReadyFor = _.object(options.fields, options.fields.map(() => false));
							}
						}
					});

					// Setting Up Debounced Updaters
					// Old ones will trigger even if id changes since
					// new functions are created when id changes
					threeWay.debouncedUpdaters = _.object(options.fields,
						options.fields.map(function(f) {
							return _.debounce(function updateServer(v) {
								Meteor.call(options.updatersForServer[f], _id, v);
							}, options.debounceInterval);
						}));

					threeWay._updateComputations = [];
					options.fields.forEach(function(f) {
						threeWay._updateComputations.push(Tracker.autorun(function() {
							var value = threeWay.data.get(f);

							var __id;
							Tracker.nonreactive(function() {
								__id = threeWay.id.get();
							});
							if (DEBUG_MODE && (DEBUG_MODE_ALL || DEBUG_MESSAGES['db'])) {
								console.log('[DB Update] Field: ' + f + "; id: " + __id + "; isReady[f]: " + threeWay.__idReadyFor[f]);
								console.log("\tValue:", value);
								console.log("\tMost Recent DB entry: ", mostRecentDatabaseEntry[f]);
							}
							if ((!!__id) && threeWay.__idReadyFor[f] && (!_.isEqual(value, mostRecentDatabaseEntry[f]))) {
								if (DEBUG_MODE && (DEBUG_MODE_ALL || DEBUG_MESSAGES['db'])) {
									console.log('[DB] Updating... ' + f + ' -> ', value);
								}
								mostRecentDatabaseEntry[f] = value;
								threeWay.debouncedUpdaters[f](options.dataTransformToServer[f](value));
							}
						}));
					});
				}
			});
		});

		tmpl.onRendered(function() {
			var instance = this;
			var threeWay = instance[THREE_WAY_NAMESPACE];

			Array.prototype.forEach.call(instance.$("[data-bind]"), function(elem) {
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
				if (DEBUG_MODE && (DEBUG_MODE_ALL || DEBUG_MESSAGES['bindings'])) {
					console.log("Creating Bindings for ", elem, elemBindings.bindings);
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

						if (DEBUG_MODE && (DEBUG_MODE_ALL || DEBUG_MESSAGES['value'])) {
							console.log('[.value] Change', elem);
							console.log('[.value] data-bind | ' + dataBind);
							console.log('[.value] Field: ' + fieldName);
						}

						if (elemGlobals.suppressChange) {
							if (DEBUG_MODE && (DEBUG_MODE_ALL || DEBUG_MESSAGES['value'])) {
								console.log('[.value] Change Suppressed | ' + fieldName + ':', curr_value, ' (in mirror); Current:', value);
							}
						} else {
							if (value !== curr_value) {
								if (DEBUG_MODE && (DEBUG_MODE_ALL || DEBUG_MESSAGES['value'])) {
									console.log('[.value] Updating ' + fieldName + ':', curr_value, ' (in mirror); Current:', value);
								}
								threeWay.data.set(fieldName, value);
							} else {
								if (DEBUG_MODE && (DEBUG_MODE_ALL || DEBUG_MESSAGES['value'])) {
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
							if (DEBUG_MODE && (DEBUG_MODE_ALL || DEBUG_MESSAGES['value'])) {
								console.log("[.value] Preparing .value update for", elem);
								console.log("[.value] " + source + "; Pipeline: ", pipeline);
							}
							if (typeof value === "undefined") {
								return;
							}
						}

						elemGlobals.suppressChange = true;
						pipeline.forEach(function(m) {
							value = options.preProcessors[m](value, elem);
						});

						if (elem.value !== value) {
							elem.value = value;
							if (DEBUG_MODE && (DEBUG_MODE_ALL || DEBUG_MESSAGES['value'])) {
								console.log('[.value] Setting .value to \"' + value + '\" for', elem);
							}
						} else {
							if (DEBUG_MODE && (DEBUG_MODE_ALL || DEBUG_MESSAGES['value'])) {
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

						if (DEBUG_MODE && (DEBUG_MODE_ALL || DEBUG_MESSAGES['checked'])) {
							console.log('[.checked] Change', elem);
							console.log('[.checked] data-bind | ' + dataBind);
							console.log('[.checked] Field: ' + fieldName);
						}

						if (elemGlobals.suppressChange) {
							if (DEBUG_MODE && (DEBUG_MODE_ALL || DEBUG_MESSAGES['checked'])) {
								console.log('[.checked] Change Suppressed | ' + fieldName + ':', curr_value, ' (in mirror); Current:', new_value);
							}
						} else {
							if (!_.isEqual(new_value, curr_value)) {
								if (DEBUG_MODE && (DEBUG_MODE_ALL || DEBUG_MESSAGES['checked'])) {
									console.log('[.checked] Updating ' + fieldName + ':', curr_value, ' (in mirror); Current:', new_value);
								}
								threeWay.data.set(fieldName, new_value);
							} else {
								if (DEBUG_MODE && (DEBUG_MODE_ALL || DEBUG_MESSAGES['checked'])) {
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
							if (DEBUG_MODE && (DEBUG_MODE_ALL || DEBUG_MESSAGES['checked'])) {
								console.log("[.checked] Preparing .checked update for", source, elem);
							}
							return;
						}
						elemGlobals.suppressChange = true;

						if (elem.getAttribute('type').toLowerCase() === "radio") {
							// Radio Button
							if (_.isEqual(elem.value, value)) {
								// Should be checked now
								if (!elem.checked) {
									elem.checked = true;
									if (DEBUG_MODE && (DEBUG_MODE_ALL || DEBUG_MESSAGES['checked'])) {
										console.log('[.checked] Setting .checked to ' + elem.checked + ' for', elem);
									}
								} else {
									if (DEBUG_MODE && (DEBUG_MODE_ALL || DEBUG_MESSAGES['checked'])) {
										console.log('[.checked] Not updating .checked of', elem);
									}
								}
							} else {
								// Should be unchecked now
								if (elem.checked) {
									elem.checked = false;
									if (DEBUG_MODE && (DEBUG_MODE_ALL || DEBUG_MESSAGES['checked'])) {
										console.log('[.checked] Setting .checked to ' + elem.checked + ' for', elem);
									}
								} else {
									if (DEBUG_MODE && (DEBUG_MODE_ALL || DEBUG_MESSAGES['checked'])) {
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
									if (DEBUG_MODE && (DEBUG_MODE_ALL || DEBUG_MESSAGES['checked'])) {
										console.log('[.checked] Setting .checked to ' + elem.checked + ' for', elem);
									}
								} else {
									if (DEBUG_MODE && (DEBUG_MODE_ALL || DEBUG_MESSAGES['checked'])) {
										console.log('[.checked] Not updating .checked of', elem);
									}
								}
							} else {
								// Should be unchecked now
								if (elem.checked) {
									elem.checked = false;
									if (DEBUG_MODE && (DEBUG_MODE_ALL || DEBUG_MESSAGES['checked'])) {
										console.log('[.checked] Setting .checked to ' + elem.checked + ' for', elem);
									}
								} else {
									if (DEBUG_MODE && (DEBUG_MODE_ALL || DEBUG_MESSAGES['checked'])) {
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
							if (DEBUG_MODE && (DEBUG_MODE_ALL || DEBUG_MESSAGES['html'])) {
								console.log("[.html] Preparing .html update for", elem);
								console.log("[.html] Field: " + source + "; Mappings: ", mappings);
							}
							if (typeof html === "undefined") {
								return;
							}
						}

						mappings.forEach(function(m) {
							html = options.preProcessors[m](html, elem);
						});

						if (elem.innerHTML !== html) {
							if (DEBUG_MODE && (DEBUG_MODE_ALL || DEBUG_MESSAGES['html'])) {
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
							if (DEBUG_MODE && (DEBUG_MODE_ALL || DEBUG_MESSAGES['visible'])) {
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
								visible = options.preProcessors[m](visible, elem);
							});
						}

						if (elem.style.display !== visible) {
							if (DEBUG_MODE && (DEBUG_MODE_ALL || DEBUG_MESSAGES['visible'])) {
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


			});

			Array.prototype.forEach.call(instance.$("data[field]"), function(elem) {
				var field = elem.getAttribute('field');
				var initValue = elem.getAttribute('initial-value') || null;
				threeWay.data.set(field, initValue);
			});
		});

		tmpl.onDestroyed(function() {
			var instance = this;
			var threeWay = instance[THREE_WAY_NAMESPACE];

			if (DEBUG_MODE && (DEBUG_MODE_ALL || DEBUG_MESSAGES['tracker'])) {
				console.log('[ThreeWay] onDestroy: Stopping computations', instance);
			}
			threeWay.computations.forEach(function(c) {
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
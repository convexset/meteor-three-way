/* global ThreeWayDependencies: true */
/* global PackageUtilities: true */
if (typeof ThreeWayDependencies === "undefined") {
	ThreeWayDependencies = {};
}
ThreeWayDependencies.extras = {};

//////////////////////////////////////////////////////////////////////
// Extra Content
//////////////////////////////////////////////////////////////////////
PackageUtilities.addImmutablePropertyObject(ThreeWayDependencies.extras, 'preProcessorGenerators', {
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

PackageUtilities.addImmutablePropertyObject(ThreeWayDependencies.extras, 'preProcessors', {
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

			var isChrome = /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor);

			var doDirectDOMManipulation = isChrome;

			if (doDirectDOMManipulation) {
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
			} else {
				if (x.toString().trim() === "") {
					$(elem.parentElement)
						.dropdown('set exactly', []);
				} else {
					$(elem.parentElement)
						.dropdown('set exactly', x.toString().split(',').map(x => x.trim()));
				}
			}

		}
		$(elem.parentElement)
			.dropdown('refresh');
		return x;
	},
	undefinedToEmptyStringFilter: ThreeWayDependencies.extras.preProcessorGenerators.undefinedFilterGenerator(""),
	nullOrUndefinedToEmptyStringFilter: ThreeWayDependencies.extras.preProcessorGenerators.nullOrUndefinedFilterGenerator(""),
});

PackageUtilities.addImmutablePropertyObject(ThreeWayDependencies.extras, 'transformationGenerators', {
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

PackageUtilities.addImmutablePropertyObject(ThreeWayDependencies.extras, 'transformations', {
	datetimeFromString: function datetimeFromString(dts) {
		if (typeof dts !== "string") {
			dts = "";
		}
		var dt = new Date();
		var spltDT = dts.split('T');
		if (spltDT.length === 2) {
			var spltD = spltDT[0].split('-');
			var spltT = spltDT[1].split(':');
			if ((spltD.length === 3) && (spltT.length === 2)) {
				var day = Number(spltD[2]);
				var mth = Number(spltD[1]);
				var yr = Number(spltD[0]);
				var hr = Number(spltT[0]);
				var min = Number(spltT[1]);
				if (!Number.isNaN(day) && !Number.isNaN(mth) && !Number.isNaN(yr) && !Number.isNaN(hr) && !Number.isNaN(min)) {
					dt = new Date(yr, mth - 1, day, hr, min);
				}
			}
		}
		return dt;
	},
	datetimeToString: function datetimeToString(dt) {
		if (!(dt instanceof Date)) {
			dt = new Date();
		}
		var mm = dt.getMonth() + 1;
		var dd = dt.getDate();
		mm = mm < 10 ? '0' + mm : mm;
		dd = dd < 10 ? '0' + dd : dd;

		var hrs = dt.getHours() < 10 ? '0' + dt.getHours() : dt.getHours();
		var mins = dt.getMinutes() < 10 ? '0' + dt.getMinutes() : dt.getMinutes();

		var ds = dt.getFullYear() + '-' + mm + '-' + dd + 'T' + hrs + ":" + mins;
		return ds;
	},
	dateFromString: function dateFromString(ds) {
		if (typeof ds !== "string") {
			ds = "";
		}
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
	monthFromString: function monthFromString(ds) {
		return ThreeWayDependencies.extras.transformations.dateFromString(ds + '-01');
	},
	monthToString: function monthToString(dt) {
		return ThreeWayDependencies.extras.transformations.dateToString(dt).split('-').splice(0, 2).join('-');
	},
	arrayFromCommaDelimitedString: ThreeWayDependencies.extras.transformationGenerators.arrayFromDelimitedString(","),
	arrayToCommaDelimitedString: ThreeWayDependencies.extras.transformationGenerators.arrayToDelimitedString(","),
});

PackageUtilities.addImmutablePropertyObject(ThreeWayDependencies.extras, 'eventGenerators', {
	keypressHandlerGenerator: function keypressHandlerGenerator(handler, keyCodes, specialKeys = {}) {
		return function keypressHandler(event, template, vmData) {
			var specialKeysMatch = true;
			['altKey', 'ctrlKey', 'shiftKey'].forEach(function(k) {
				if (typeof specialKeys[k] !== "undefined") {
					specialKeysMatch = specialKeysMatch && (specialKeys[k] === event[k]);
				}
			});
			if (specialKeysMatch && (keyCodes.indexOf(event.which) !== -1)) {
				handler.call(this, event, template, vmData);
			}
		};
	},
	keypressHandlerGeneratorFromChars: function keypressHandlerGeneratorFromChars(handler, chars, specialKeys = {}) {
		return function keypressHandler(event, template, vmData) {
			var specialKeysMatch = true;
			['altKey', 'ctrlKey', 'shiftKey'].forEach(function(k) {
				if (typeof specialKeys[k] !== "undefined") {
					specialKeysMatch = specialKeysMatch && (specialKeys[k] === event[k]);
				}
			});
			if (specialKeysMatch && (Array.prototype.map.call(chars, x => x.toUpperCase().charCodeAt(0)).indexOf(event.which) !== -1)) {
				handler.call(this, event, template, vmData);
			}
		};
	},
	returnKeyHandlerGenerator: function returnKeyHandlerGenerator(handler, specialKeys = {}) {
		return function returnKeypressHandler(event, template, vmData) {
			var specialKeysMatch = true;
			['altKey', 'ctrlKey', 'shiftKey'].forEach(function(k) {
				if (typeof specialKeys[k] !== "undefined") {
					specialKeysMatch = specialKeysMatch && (specialKeys[k] === event[k]);
				}
			});
			if (specialKeysMatch && (event.which === 13)) {
				handler.call(this, event, template, vmData);
			}
		};
	},
});
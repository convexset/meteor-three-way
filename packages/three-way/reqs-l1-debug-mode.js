/* global ThreeWayDependencies: true */
if (typeof ThreeWayDependencies === "undefined") {
	ThreeWayDependencies = {};
}
ThreeWayDependencies.debugMode = {};

const PackageUtilities = require('package-utils');
const _ = require('underscore');


//////////////////////////////////////////////////////////////////////
// Debug Mode
//////////////////////////////////////////////////////////////////////
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
	'process': false,
};

IN_DEBUG_MODE_FOR = function IN_DEBUG_MODE_FOR(message_class) {
	return DEBUG_MODE && (DEBUG_MODE_ALL || DEBUG_MESSAGES[message_class]);
};

PackageUtilities.addImmutablePropertyArray(ThreeWayDependencies.debugMode, 'MESSAGE_HEADINGS', _.map(DEBUG_MESSAGES, (v, k) => k));
PackageUtilities.addImmutablePropertyFunction(ThreeWayDependencies.debugMode, 'setOn', function debugModeSetOn() {
	DEBUG_MODE = true;
});
PackageUtilities.addImmutablePropertyFunction(ThreeWayDependencies.debugMode, 'setOff', function debugModeSetOff() {
	DEBUG_MODE = false;
});
PackageUtilities.addPropertyGetter(ThreeWayDependencies.debugMode, 'isOn', function debugModeStatus() {
	return DEBUG_MODE;
});
PackageUtilities.addImmutablePropertyFunction(ThreeWayDependencies.debugMode, 'selectAll', function debugModeSelectAll() {
	DEBUG_MODE = true;
	for (var k in DEBUG_MESSAGES) {
		if (DEBUG_MESSAGES.hasOwnProperty(k)) {
			DEBUG_MESSAGES[k] = true;
		}
	}
});
PackageUtilities.addImmutablePropertyFunction(ThreeWayDependencies.debugMode, 'selectNone', function debugModeSelectNone() {
	for (var k in DEBUG_MESSAGES) {
		if (DEBUG_MESSAGES.hasOwnProperty(k)) {
			DEBUG_MESSAGES[k] = false;
		}
	}
});
PackageUtilities.addImmutablePropertyFunction(ThreeWayDependencies.debugMode, 'select', function debugModeSelect(k) {
	if (DEBUG_MESSAGES.hasOwnProperty(k)) {
		DEBUG_MODE = true;
		DEBUG_MESSAGES[k] = true;
	}
});
/* global PackageUtilities: true */
/* global ThreeWay: true */
/* global ThreeWayDependencies: true */

var __tw = function ThreeWay() {};
ThreeWay = new __tw();

// Debug Mode
PackageUtilities.addImmutablePropertyObject(ThreeWay, 'DEBUG_MODE', ThreeWayDependencies.debugMode);

//////////////////////////////////////////////////////////////////////
// Utilities
//////////////////////////////////////////////////////////////////////
PackageUtilities.addImmutablePropertyObject(ThreeWay, 'utils', ThreeWayDependencies.utils);

//////////////////////////////////////////////////////////////////////
// Stuff Proper
//////////////////////////////////////////////////////////////////////
PackageUtilities.addImmutablePropertyFunction(ThreeWay, 'prepare', function prepare(tmpl, options = {}) {
	// Parse Options
	options = PackageUtilities.shallowCopy(options);
	ThreeWayDependencies.utils.parseOptions(tmpl, options);

	// Set Up Template
	tmpl.onCreated(ThreeWayDependencies.templateOnCreated(options));
	tmpl.onRendered(ThreeWayDependencies.templateOnRendered(options));
	tmpl.onDestroyed(ThreeWayDependencies.templateOnDestroyed(options));
	tmpl.helpers(ThreeWayDependencies.templateHelpers(options));
});

//////////////////////////////////////////////////////////////////////
// Reload Stuff
//////////////////////////////////////////////////////////////////////
PackageUtilities.addMutablePropertyObject(ThreeWay, 'reload', ThreeWayDependencies.reload);

//////////////////////////////////////////////////////////////////////
// Extra Content
//////////////////////////////////////////////////////////////////////
_.forEach(ThreeWayDependencies.extras, function(o, key) {
	PackageUtilities.addImmutablePropertyObject(ThreeWay, key, o);
});
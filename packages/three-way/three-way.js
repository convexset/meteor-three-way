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
	if (_allowSubsequentPrepareCalls) {
		// Parse Options
		options = PackageUtilities.shallowCopy(options);
		ThreeWayDependencies.utils.parseOptions(tmpl, options);

		// Set Up Template
		tmpl.onCreated(ThreeWayDependencies.templateOnCreated(options));
		tmpl.onRendered(ThreeWayDependencies.templateOnRendered(options));
		tmpl.onDestroyed(ThreeWayDependencies.templateOnDestroyed(options));
		tmpl.helpers(ThreeWayDependencies.templateHelpers(options));
	} else {
		throw new Meteor.Error("subsequent-prepare-calls-forbidden");
	}
});

var _allowSubsequentPrepareCalls = true;
var _preventSubsequentPrepareCalls_called = false;
PackageUtilities.addImmutablePropertyFunction(ThreeWay, '_preventSubsequentPrepareCalls', function _preventSubsequentPrepareCalls(prevent) {
	_preventSubsequentPrepareCalls_called = true;
	if (_.isFunction(prevent) ? !!prevent() : !!prevent) {
		_allowSubsequentPrepareCalls = false;
	}
});

Meteor.startup(function() {
	setTimeout(function() {
		if (!_preventSubsequentPrepareCalls_called) {
			console.warn('[ThreeWay] ThreeWay._preventSubsequentPrepareCalls was not called. This is recommended when going into production. See the documentation (Usage > Going Into Production) for more details.');
		}
	}, 10000);
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
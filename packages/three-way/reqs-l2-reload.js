/* global PackageUtilities: true */
/* global Reload: true */
/* global __meteor_runtime_config__: true */
/* global ThreeWayDependencies: true */

if (typeof ThreeWayDependencies === "undefined") {
	ThreeWayDependencies = {};
}
var ThreeWayReload = {};

//////////////////////////////////////////////////////////////////////
// Reload Stuff
//////////////////////////////////////////////////////////////////////
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

		ThreeWayDependencies.utils.pushToEndOfEventQueue(function() {
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
		}, {});
		return false;
	}
});

ThreeWayDependencies.reload = ThreeWayReload;
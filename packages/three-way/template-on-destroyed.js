/* global ThreeWayDependencies: true */
if (typeof ThreeWayDependencies === "undefined") {
	ThreeWayDependencies = {};
}

ThreeWayDependencies.templateOnDestroyed = function(options) {
	return function() {
		var instance = this;
		var threeWay = instance[THREE_WAY_NAMESPACE];
		var threeWayMethods = instance[THREE_WAY_NAMESPACE_METHODS];

		if (IN_DEBUG_MODE_FOR('observer')) {
			console.log('[ThreeWay] [' + Tracker.nonreactive(threeWayMethods.get3wInstanceId) + '] onDestroy: Stopping current observer', instance);
		}
		if (!!threeWay.observer) {
			threeWay.observer.stop();
		}

		if (IN_DEBUG_MODE_FOR('tracker')) {
			console.log('[ThreeWay] [' + Tracker.nonreactive(threeWayMethods.get3wInstanceId) + '] onDestroy: Stopping computations', instance);
		}
		_.forEach(threeWay.computations, function(c) {
			c.stop();
		});
		if (IN_DEBUG_MODE_FOR('tracker')) {
			console.log('[ThreeWay] [' + Tracker.nonreactive(threeWayMethods.get3wInstanceId) + '] onDestroy: Stopping data-update computations', instance);
		}
		_.forEach(threeWay._dataUpdateComputations, function(c) {
			c.stop();
		});

		if (!!threeWay.mutationObserver) {
			threeWay.mutationObserver.disconnect();
		}

		// Say bye to parent and ultimate ancestor?
		var myId;
		Tracker.nonreactive(function() {
			myId = threeWayMethods.get3wInstanceId();
		});
		var parentInstance = threeWayMethods.__getNearestThreeWayAncestor();
		var ultimateAncestor = threeWayMethods.__getUltimateThreeWayAncestorInTree();
		if (!!myId) {
			if (!!parentInstance) {
				delete parentInstance[THREE_WAY_NAMESPACE].children[myId];
				parentInstance[THREE_WAY_NAMESPACE].__hasChild.set(myId, false);
			}
			delete ultimateAncestor[THREE_WAY_NAMESPACE].familyTreeMembers[myId];
		}

		// Remove from ThreeWayDependencies._allThreeWayInstances
		var instanceIdx = ThreeWayDependencies._allThreeWayInstances.indexOf(instance);
		if (instanceIdx !== -1) {
			ThreeWayDependencies._allThreeWayInstances.splice(instanceIdx, 1);
		}

		ThreeWayDependencies.reload._deregisterForReload(myId, instance);
	};
};
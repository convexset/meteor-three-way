/* global ThreeWayDependencies: true */
if (typeof ThreeWayDependencies === "undefined") {
	ThreeWayDependencies = {};
}

//////////////////////////////////////////////////////////////////////
// For Observing the DOM
//////////////////////////////////////////////////////////////////////
ThreeWayDependencies.domObserver = function(options, instance) {
	var threeWay = instance[THREE_WAY_NAMESPACE];
	var lastGCOfComputations = 0;

	var bindElem = ThreeWayDependencies.createBindElementFunction(options, instance);

	return function() {
		threeWay._rootNodes.get();
		var rootNodes = threeWay.rootNodes;

		if (!!threeWay.mutationObserver) {
			threeWay.mutationObserver.disconnect();
		}

		threeWay.mutationObserver = new MutationObserver(function respondToMutation(mutations) { // (mutations, mutationObserverInstance)
			var instanceId;
			var thisTemplateName = instance.view.name.split('.').pop().trim();

			Tracker.nonreactive(function() {
				instanceId = threeWay.instanceId.get();
			});
			if (!instanceId) {
				instanceId = "~~id-unassigned~~";
			}

			function processSoCalledBindAuction(node) {
				var eligibleLevel = node.getAttributeNS(THREE_WAY_ATTRIBUTE_NAMESPACE, THREE_WAY_DATA_BINDING_LEVEL);
				if (!!eligibleLevel) {
					if (threeWay.__level >= Number(eligibleLevel)) {
						bindElem(node);
						node.removeAttributeNS(THREE_WAY_ATTRIBUTE_NAMESPACE, THREE_WAY_DATA_BINDING_LEVEL);
					}
				}
			}

			mutations.forEach(function(mutation) {
				if (!!mutation.addedNodes) {
					Array.prototype.forEach.call(mutation.addedNodes, function(_node) {

						var currEligibleLevel;

						if (!!_node.getAttribute) {
							// For each node, look for sub nodes
							// Make sure to check both node and children
							var node_arr = Array.prototype.concat.apply((!!_node.getAttribute(DATA_BIND_ATTRIBUTE)) ? [_node] : [], $(_node).find('[' + DATA_BIND_ATTRIBUTE + ']'));
							node_arr.forEach(function(node) {
								if (!node.getAttributeNS(THREE_WAY_ATTRIBUTE_NAMESPACE, THREE_WAY_DATA_BINDING_ID)) {
									if (IN_DEBUG_MODE_FOR('bind')) {
										console.log("[bind] Node added on " + instanceId, node);
									}
									var templateRestrictionsAttr = node.getAttribute(RESTRICT_TEMPLATE_TYPE_ATTRIBUTE);
									var templateRestrictions = templateRestrictionsAttr && templateRestrictionsAttr.split(',').map(x => x.trim()).filter(x => x !== "") || [];
									if (templateRestrictions.indexOf(thisTemplateName) === -1) {
										// don't bind now, instead state own level as a "bind auction bid"
										// this enables child templates created later to stake their legitimate claims on new nodes
										currEligibleLevel = node.getAttributeNS(THREE_WAY_ATTRIBUTE_NAMESPACE, THREE_WAY_DATA_BINDING_LEVEL);
										if (!currEligibleLevel || (Number(currEligibleLevel) < threeWay.__level)) {
											node.setAttributeNS(THREE_WAY_ATTRIBUTE_NAMESPACE, THREE_WAY_DATA_BINDING_LEVEL, threeWay.__level);

											// push onto event queue
											ThreeWayDependencies.utils.pushToEndOfEventQueue(() => processSoCalledBindAuction(node), {});
										}
									}
								}
							});
						}
					});
				}

				function stopBindingToNode(node) {
					var thisElemId = node.getAttributeNS(THREE_WAY_ATTRIBUTE_NAMESPACE, THREE_WAY_DATA_BINDING_ID);
					if (!!thisElemId) {
						// Clear computations
						if (!!threeWay.boundElemComputations[thisElemId]) {
							threeWay.boundElemComputations[thisElemId].forEach(function(c) {
								c.stop();
							});
							delete threeWay.boundElemComputations[thisElemId];
						}

						// Clear event handlers
						if (!!threeWay.boundElemEventHandlers[thisElemId]) {
							threeWay.boundElemEventHandlers[thisElemId].forEach(function(handlerInfo) {
								$(node).unbind(handlerInfo.eventName, handlerInfo.handler);
							});
							delete threeWay.boundElemEventHandlers[thisElemId];
						}

						// If 1min has passed since the last culling of stopped computations, ...
						// ... and 10% of the time otherwise... cull stopped computations
						var timeDelta = (new Date()).getTime() - lastGCOfComputations;
						if ((timeDelta > 60000) || (Math.random() < Math.min(0.1, timeDelta * 1e-4))) {
							var numComputationsStart = threeWay.computations.length;
							threeWay.computations = threeWay.computations.filter(c => !c.stopped);
							var numComputationsEnd = threeWay.computations.length;
							lastGCOfComputations = (new Date()).getTime();
							if (IN_DEBUG_MODE_FOR('bind')) {
								console.log("[bind] GC. # active computations: " + numComputationsEnd + " (# removed: " + (numComputationsStart - numComputationsEnd) + ")");
							}
						}
					}

					$(node).removeAttr(THREE_WAY_DATA_BINDING_ID);
					// $(node).removeAttr(THREE_WAY_DATA_BINDING_INSTANCE);
				}

				if (!!mutation.removedNodes) {
					Array.prototype.forEach.call(mutation.removedNodes, function(node) {
						if ((!!node.getAttribute) && !!node.getAttribute(DATA_BIND_ATTRIBUTE)) {
							if (node.getAttributeNS(THREE_WAY_ATTRIBUTE_NAMESPACE, THREE_WAY_DATA_BINDING_INSTANCE) === instanceId) {
								var thisElemId = node.getAttributeNS(THREE_WAY_ATTRIBUTE_NAMESPACE, THREE_WAY_DATA_BINDING_ID);
								if (IN_DEBUG_MODE_FOR('bind')) {
									console.log("[bind] Node removed on " + instanceId + " (twbId: " + thisElemId + ")", node);
								}
								stopBindingToNode(node);
							}
						}
					});
				}

				if (!!mutation.target && !!mutation.target.getAttribute) {
					if (mutation.attributeName === DATA_BIND_ATTRIBUTE) {
						var node = mutation.target;
						if (node.getAttributeNS(THREE_WAY_ATTRIBUTE_NAMESPACE, THREE_WAY_DATA_BINDING_INSTANCE) === instanceId) {
							if (IN_DEBUG_MODE_FOR('bind')) {
								console.log("[bind] " + DATA_BIND_ATTRIBUTE + " attribute changed (bound to: " + instanceId + ")", node);
							}
							stopBindingToNode(node);
							bindElem(node);
						} else if (!node.getAttributeNS(THREE_WAY_ATTRIBUTE_NAMESPACE, THREE_WAY_DATA_BINDING_INSTANCE)) {
							// don't bind now, instead state own level as a "bind auction bid"
							// this enables child templates created later to stake their legitimate claims on new nodes
							var currEligibleLevel = node.getAttributeNS(THREE_WAY_ATTRIBUTE_NAMESPACE, THREE_WAY_DATA_BINDING_LEVEL);
							if (!currEligibleLevel || (Number(currEligibleLevel) < threeWay.__level)) {
								node.setAttributeNS(THREE_WAY_ATTRIBUTE_NAMESPACE, THREE_WAY_DATA_BINDING_LEVEL, threeWay.__level);

								// push onto event queue
								ThreeWayDependencies.utils.pushToEndOfEventQueue(() => processSoCalledBindAuction(node), {});
							}
						}
					}
				}
			});
		});

		if (IN_DEBUG_MODE_FOR('bind')) {
			var instanceId;
			var thisTemplateName = instance.view.name.split('.').pop().trim();

			Tracker.nonreactive(function() {
				instanceId = threeWay.instanceId.get();
			});
			if (!instanceId) {
				instanceId = "~~id-unassigned~~";
			}
			console.log("[bind] Starting Mutation Observer for " + instanceId + " (" + thisTemplateName + ") on ", rootNodes);
		}
		rootNodes.forEach(function(rn) {
			threeWay.mutationObserver.observe(rn, {
				childList: true,
				subtree: true,
				attributes: true,
				characterData: false
			});
		});
	};
};
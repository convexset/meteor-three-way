import { Meteor } from 'meteor/meteor';
import { Tracker } from 'meteor/tracker';
const _ = require('underscore');

/* global ThreeWayDependencies: true */
if (typeof ThreeWayDependencies === "undefined") {
	ThreeWayDependencies = {};
}

ThreeWayDependencies.templateOnRendered = function(options) {
	return function() {
		var instance = this;
		var thisTemplateName = instance.view.name.split('.').pop().trim();
		var threeWay = instance[THREE_WAY_NAMESPACE];
		var threeWayMethods = instance[THREE_WAY_NAMESPACE_METHODS];

		//////////////////////////////////////////////////////////////////
		// Say hi to parent now that its rendered
		//////////////////////////////////////////////////////////////////
		var myId = instance && instance.data && instance.data._3w_name;
		var parentInstance = threeWayMethods.__getNearestThreeWayAncestor();
		var ultimateAncestor = threeWayMethods.__getUltimateThreeWayAncestorInTree();

		if (!ultimateAncestor[THREE_WAY_NAMESPACE].familyTreeMembers) {
			// A descendant will have to create this
			ultimateAncestor[THREE_WAY_NAMESPACE].familyTreeMembers = {};
		}

		var someToken = 1;
		if (!!parentInstance) {
			if (!!myId) {
				if (!!parentInstance[THREE_WAY_NAMESPACE].children[myId]) {
					throw new Meteor.Error('three-way-repeated-id', myId);
				}
				if (!!ultimateAncestor[THREE_WAY_NAMESPACE].familyTreeMembers[myId]) {
					console.warn('[ThreeWay] Repeated id: ' + myId + '; this may cause issues with data migration in reloads triggered by hot code pushes');
				}
			} else {
				myId = "_3wNode_" + thisTemplateName + '_' + someToken;
				while (!!ultimateAncestor[THREE_WAY_NAMESPACE].familyTreeMembers[myId]) {
					someToken += 1;
					myId = "_3wNode_" + thisTemplateName + '_' + someToken;
				}
			}
			parentInstance[THREE_WAY_NAMESPACE].__hasChild.set(myId, true);
			parentInstance[THREE_WAY_NAMESPACE].children[myId] = instance;
			ultimateAncestor[THREE_WAY_NAMESPACE].familyTreeMembers[myId] = instance;
		} else {
			myId = '_3wRootNode_' + thisTemplateName;
			while (!!threeWay.familyTreeMembers[myId]) {
				someToken += 1;
				myId = '_3wRootNode_' + thisTemplateName + '_' + someToken;
			}
			threeWay.familyTreeMembers[myId] = instance;
		}
		threeWay.instanceId.set(myId);

		// Set root node if not already set
		if (!!instance.data && !!instance.data._3w_rootElementSelector) {
			if (IN_DEBUG_MODE_FOR('bind')) {
				console.log('[bind] [' + Tracker.nonreactive(threeWayMethods.get3wInstanceId) + '] Setting root node for instance of ' + thisTemplateName + ' via selector ' + instance.data._3w_rootElementSelector + '. (Prev: ' + threeWay.rootNodes.toString().split('|')[0] + ')');
			}
			threeWayMethods.setRoots(instance.data._3w_rootElementSelector);
		} else {
			// Observe all the elements in the template
			// (if there is a wrapping element, good... otherwise...)
			threeWayMethods.setRoots("*");
		}

		//////////////////////////////////////////////////////////////////
		// Initial Node Binding
		//  - Template lifecycle:
		//    Parent Create, Child Create, Child Rendered, Parent Rendered
		//  - Nodes of children get bound first
		//  - Parent gets the rest
		//////////////////////////////////////////////////////////////////
		if (IN_DEBUG_MODE_FOR('bind')) {
			console.log("[bind] [" + Tracker.nonreactive(threeWayMethods.get3wInstanceId) + "] Init on " + myId + ": Checking for new elements to bind.");
		}
		Array.prototype.forEach.call(instance.$("[data-bind]"), ThreeWayDependencies.createBindElementFunction(options, instance));


		//////////////////////////////////////////////////////////////////
		// Setup binding and re-binding
		//////////////////////////////////////////////////////////////////
		instance.autorun(ThreeWayDependencies.domObserver(options, instance));

		//////////////////////////////////////////////////////////////////
		// Set initial data source
		//////////////////////////////////////////////////////////////////
		if (!!instance.data && (!!instance.data._3w_id || !!instance.data._id)) {
			var _id_fromDataContext = instance.data._3w_id || instance.data._id;
			if (IN_DEBUG_MODE_FOR('new-id')) {
				console.log("[new-id] [" + Tracker.nonreactive(threeWayMethods.get3wInstanceId) + "] Setting initial id for instance of " + thisTemplateName + " to " + _id_fromDataContext);
			}
			threeWayMethods.setId(_id_fromDataContext);
		}


		//////////////////////////////////////////////////////////////////
		// Restore VM-Only Data after Reload Triggered by Hot Code Push
		//////////////////////////////////////////////////////////////////
		var useReloadData = !instance.data || !instance.data._3w_ignoreReloadData;
		if (useReloadData && ThreeWayDependencies.reload._haveReloadPayload(myId)) {
			var reloadPayload = ThreeWayDependencies.reload._getReloadPayload(myId);
			if (!!reloadPayload) {
				_.forEach(reloadPayload, function(value, field) {
					threeWayMethods.set(field, value);
				});
			}
		}
		ThreeWayDependencies.reload._registerForReload(myId, instance);

		//////////////////////////////////////////////////////////////////
		// Set Up Id Getter
		//////////////////////////////////////////////////////////////////
		instance.autorun(function reactivelyUpdateId(c) {
			if (!!_.isFunction(options.idGetter)) {
				const _id = options.idGetter(c);
				if (typeof _id === 'string') {
					threeWayMethods.setId(_id);
				}
			}
		});
		//////////////////////////////////////////////////////////////////
	};
};

/* global ThreeWayDependencies: true */
if (typeof ThreeWayDependencies === "undefined") {
	ThreeWayDependencies = {};
}

ThreeWayDependencies.templateHelpers = function(options) {
	return {
		_3w_id: () => Template.instance()[THREE_WAY_NAMESPACE_METHODS].getId(),
		_3w_3wInstanceId: () => Template.instance()[THREE_WAY_NAMESPACE_METHODS].get3wInstanceId(),
		_3w_hasData: () => Template.instance()[THREE_WAY_NAMESPACE].hasData.get(),
		_3w_get: (propName) => Template.instance()[THREE_WAY_NAMESPACE_METHODS].get(propName),
		_3w_getWithDefault: (propName, defaultValue) => Template.instance()[THREE_WAY_NAMESPACE_METHODS].getWithDefault(propName, defaultValue),
		_3w_getAll: () => Template.instance()[THREE_WAY_NAMESPACE_METHODS].getAll(),

		_3w_display: function _3w_display(displayDescription) {
			var pipelineSplit = displayDescription.split('|').map(x => x.trim()).filter(x => x !== "");
			var source = pipelineSplit[0];
			var mappings = pipelineSplit.splice(1);
			return Template.instance()[THREE_WAY_NAMESPACE_METHODS]._processInTemplateContext(source, mappings, null);
		},

		_3w_focusedField: () => Template.instance()[THREE_WAY_NAMESPACE_METHODS].focusedField(),
		_3w_focusedFieldUpdatedOnServer: p => Template.instance()[THREE_WAY_NAMESPACE_METHODS].focusedFieldUpdatedOnServer(p),

		_3w_isSyncedToServer: (propName) => Template.instance()[THREE_WAY_NAMESPACE_METHODS].isSyncedToServer(propName),
		_3w_notSyncedToServer: (propName) => !Template.instance()[THREE_WAY_NAMESPACE_METHODS].isSyncedToServer(propName),
		_3w_allSyncedToServer: () => Template.instance()[THREE_WAY_NAMESPACE_METHODS].allSyncedToServer(),
		_3w_isNotInvalid: (propName) => Template.instance()[THREE_WAY_NAMESPACE_METHODS].isNotInvalid(propName),
		_3w_isInvalid: (propName) => !Template.instance()[THREE_WAY_NAMESPACE_METHODS].isNotInvalid(propName),
		_3w_validValuesSynced: (propName) => (Template.instance()[THREE_WAY_NAMESPACE_METHODS].isSyncedToServer(propName) || (!Template.instance()[THREE_WAY_NAMESPACE_METHODS].isNotInvalid(propName))),
		_3w_validValuesNotSynced: (propName) => ((!Template.instance()[THREE_WAY_NAMESPACE_METHODS].isSyncedToServer(propName)) && Template.instance()[THREE_WAY_NAMESPACE_METHODS].isNotInvalid(propName)),
		_3w_expandParams: ThreeWayDependencies.utils.expandParams,

		_3w_parentDataGet: (p, levelsUp) => Template.instance()[THREE_WAY_NAMESPACE_METHODS].parentDataGet(p, levelsUp),
		_3w_parentDataGetAll: (levelsUp) => Template.instance()[THREE_WAY_NAMESPACE_METHODS].parentDataGetAll(levelsUp),

		_3w_childDataGetId: (childNameArray) => Template.instance()[THREE_WAY_NAMESPACE_METHODS].childDataGetId(childNameArray),
		_3w_childDataGet: (p, childNameArray) => Template.instance()[THREE_WAY_NAMESPACE_METHODS].childDataGet(p, childNameArray),
		_3w_childDataGetAll: (childNameArray) => Template.instance()[THREE_WAY_NAMESPACE_METHODS].childDataGetAll(childNameArray),

		_3w_siblingDataGet: (p, siblingName) => Template.instance()[THREE_WAY_NAMESPACE_METHODS].siblingDataGet(p, siblingName),
		_3w_siblingDataGetAll: (siblingName) => Template.instance()[THREE_WAY_NAMESPACE_METHODS].siblingDataGetAll(siblingName),
	};
};
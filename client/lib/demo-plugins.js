/* global Plugins: true */
/* global listThreeWayExamples: true */

var _filteredPlugins;
listThreeWayExamples = function() {
	if (typeof _filteredPlugins === "undefined") {
		_filteredPlugins = [];

		var allRouteNames = [];
		var allTemplateNames = [];

		Plugins.listPluginsNS('ThreeWay Examples Namespace')
			.map(x => x.methods.info())
			.sort(function(x, y) {
				if ((x.order || Infinity) !== (y.order || Infinity)) {
					return (x.order || Infinity) - (y.order || Infinity);
				}
				return (x.name || "") > (y.name || "");
			})
			.forEach(function(plugin) {
				if (allRouteNames.indexOf(plugin.routeName) !== -1) {
					console.error('Duplicate plug-in template name: ' + plugin.routeName + ' (skipping)', plugin);
					return;
				} else {
					allRouteNames.push(plugin.routeName);
				}
				if (allTemplateNames.indexOf(plugin.templateName) !== -1) {
					console.error('Duplicate plug-in template name: ' + plugin.routeName + ' (skipping)', plugin);
					return;
				} else {
					allTemplateNames.push(plugin.templateName);
				}
				_filteredPlugins.push(plugin);
			});
	}
	return _filteredPlugins;
};
Template.registerHelper('listThreeWayExamples', listThreeWayExamples);
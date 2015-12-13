/* global Plugins: true */
/* global listThreeWayGuideItems: true */
/* global listThreeWayExamples: true */

function generateListingFunction(ns) {
	var _filteredPlugins;
	return function() {
		if (typeof _filteredPlugins === "undefined") {
			_filteredPlugins = [];

			var allRouteNames = [];
			var allTemplateNames = [];

			Plugins.listPluginsNS(ns)
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
}

listThreeWayGuideItems = generateListingFunction('ThreeWay Guide Namespace');
listThreeWayExamples = generateListingFunction('ThreeWay Examples Namespace');
Template.registerHelper('listThreeWayGuideItems', listThreeWayGuideItems);
Template.registerHelper('listThreeWayExamples', listThreeWayExamples);
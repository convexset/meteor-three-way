/* global FlowRouterTree: true */
/* global listThreeWayExamples: true */

var root = FlowRouterTree.createNode({
	name: 'rootNode',
	path: '',
	params: {
		layout: 'MainLayout',
		header: 'Header',
		content: 'Home',
		footer: 'Footer'
	},
	actionFactory: FlowRouterTree.SampleParameterizedActions.blazeLayoutRenderThreeComponent,
	makeRoute: false
});

FlowRouterTree.createNode({
	parent: root,
	name: 'Home',
	description: 'The Home Screen',
	path: '/',
	params: {
		content: 'Home'
	}
});

///////////////////////////////////////////////////////////////////////////////
// Docs
///////////////////////////////////////////////////////////////////////////////
var docs = FlowRouterTree.createNode({
	parent: root,
	name: 'Docs',
	description: 'The documentation',
	path: 'docs',
	params: {
		content: 'Docs'
	},
	providesParentRoutePrefix: true
});

FlowRouterTree.createNode({
	parent: docs,
	name: 'ContributingExamples',
	description: 'How to create your own examples',
	path: 'contributing-examples',
	params: {
		content: 'ExamplesViaPlugins'
	}
});

///////////////////////////////////////////////////////////////////////////////
// Examples
///////////////////////////////////////////////////////////////////////////////
var examples = FlowRouterTree.createNode({
	parent: root,
	name: 'examplesListing',
	description: 'A Listing of Examples',
	path: 'examples',
	params: {
		content: 'ExamplesListing'
	},
	providesParentRoutePrefix: true
});

// Create routes from plugins
listThreeWayExamples()
	.forEach(function(pluginInfo) {
		FlowRouterTree.createNode({
			parent: examples,
			name: pluginInfo.routeName,
			description: pluginInfo.name,
			path: pluginInfo.routeName,
			params: {
				content: pluginInfo.templateName
			},
		});
	});
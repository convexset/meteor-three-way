/* global FlowRouterTree: true */
/* global listThreeWayExamples: true */
/* global listThreeWayGuideItems: true */
/* global hljsProcessPreBlocks: true */

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
	makeRoute: false,
	triggersEnter: {
		hljsProcessPreBlocks: function() {
			setTimeout(hljsProcessPreBlocks, 250);
		}
	}
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
var guideAndExamplesListing = FlowRouterTree.createNode({
	parent: root,
	name: 'guideAndExamplesListing',
	description: 'A Listing of Guide Items and Examples',
	path: 'guide-and-examples-listing',
	params: {
		content: 'guideAndExamplesListing'
	},
});

var guide = FlowRouterTree.createNode({
	parent: guideAndExamplesListing,
	name: 'guide',
	description: 'A Listing of Guide Items and Examples',
	path: 'guide',
	providesParentRoutePrefix: true
});
var examples = FlowRouterTree.createNode({
	parent: guideAndExamplesListing,
	name: 'examples',
	description: 'A Listing of Guide Items and Examples',
	path: 'examples',
	providesParentRoutePrefix: true
});

// Create routes from plugins
listThreeWayGuideItems()
	.forEach(function(pluginInfo) {
		FlowRouterTree.createNode({
			parent: guide,
			name: pluginInfo.routeName,
			description: pluginInfo.name,
			path: pluginInfo.routeName,
			params: {
				content: pluginInfo.templateName
			},
		});
	});
	
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
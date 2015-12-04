/* global FlowRouterTree: true */

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


function trackRouteMovementFactory(logEntry, movementType) {
	return function trackRouteMovement(context) {
		var contextInfo = {
			path: context.path,
			params: context.params,
			queryParams: context.queryParams,
		};
		if (logEntry) {
			Meteor.call('requestLog', 'comment', movementType, contextInfo);
		}
	};
}


///////////////////////////////////////////////////////////////////////////////
// Exposed Routes: No Login Needed
///////////////////////////////////////////////////////////////////////////////

var home = FlowRouterTree.createNode({
	parent: root,
	name: 'Home',
	description: 'The Home Screen',
	path: '/',
	params: {
		content: 'Home'
	}
});

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
	name: 'CreateDemo',
	description: 'The documentation on how to create your own demo',
	path: 'createDemo',
	params: {
		content: 'CreateOwnDemo'
	}
});

///////////////////////////////////////////////////////////////////////////////
// DEMO
///////////////////////////////////////////////////////////////////////////////
var demo = FlowRouterTree.createNode({
	parent: root,
	name: 'DemoList',
	description: 'The Demo Section',
	path: 'demo',
	params: {
		content: 'Home'
	},
	providesParentRoutePrefix: true
});

FlowRouterTree.createNode({
	parent: demo,
	name: 'DemoOriginal',
	description: 'Original Demo',
	path: 'original',
	params: {
		content: 'OriginalDemo'
	},
});

FlowRouterTree.createNode({
	parent: demo,
	name: 'DemoAni1',
	description: 'Basic Demo',
	path: 'Ani1',
	params: {
		content: 'Demo_Ani_1'
	},
});

FlowRouterTree.createNode({
	parent: demo,
	name: 'DemoAni2',
	description: 'Basic modal Demo',
	path: 'Ani2',
	params: {
		content: 'Demo_Ani_2'
	},
});



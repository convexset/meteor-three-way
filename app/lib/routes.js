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
		content: 'ani1'
	},
});



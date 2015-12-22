Package.describe({
	name: 'convexset:three-way',
	version: '0.2.18',
	summary: 'Flexible and Blaze-friendly three-way data-binding (V-VM-DB) for Meteor',
	git: 'https://github.com/convexset/meteor-three-way',
	documentation: '../../README.md'
});

Package.onUse(function(api) {
	api.versionsFrom('1.2.0.2');
	api.use(['ecmascript', 'underscore', 'mongo', 'convexset:package-utils@0.1.9']);
	api.use([
		'blaze', 'tracker',
		'reactive-var', 'reactive-dict',
		'reload',
		'convexset:template-helpers@0.1.15'
	], 'client');

	api.addFiles([
		'reqs-l1-constants.js',
		'reqs-l1-debug-mode.js',
		'reqs-l1-utils.js',
		'reqs-l1-instance-utils.js',
		'reqs-l1-extras.js',
	], 'client');

	api.addFiles([
		'reqs-l2-element-bindings.js',
		'reqs-l2-data-observer.js',
		'reqs-l2-dom-observer.js',
		'reqs-l2-reload.js',
		'reqs-l2-three-way-methods.js',
	], 'client');

	api.addFiles([
		'template-on-created.js',
		'template-on-rendered.js',
		'template-on-destroyed.js',
		'template-helpers.js',
	], 'client');

	api.addFiles('three-way.js', 'client');

	api.export('ThreeWay');
});

Package.onTest(function(api) {
	api.use('tinytest');
	api.use(['ecmascript', 'underscore', 'mongo', 'tracker', 'convexset:three-way']);
	api.addFiles(['tests.js']);
});
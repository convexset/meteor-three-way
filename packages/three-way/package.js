Package.describe({
	name: 'convexset:three-way',
	version: '0.2.11',
	summary: 'Flexible and Blaze-friendly three-way data-binding (V-VM-DB) for Meteor',
	git: 'https://github.com/convexset/meteor-three-way',
	documentation: '../../README.md'
});

Package.onUse(function(api) {
	api.versionsFrom('1.2.0.2');
	api.use(['ecmascript', 'underscore', 'mongo', 'convexset:package-utils@0.1.8']);
	api.use([
		'blaze', 'tracker',
		'reactive-var', 'reactive-dict',
		'reload',
		'convexset:template-helpers@0.1.13'
	], 'client');
	api.addFiles(['three-way.js']);
	api.export('ThreeWay');
});

Package.onTest(function(api) {
	api.use('tinytest');
	api.use(['ecmascript', 'underscore', 'mongo', 'tracker', 'convexset:three-way']);
	api.addFiles(['tests.js']);
});
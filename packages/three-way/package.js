Package.describe({
	name: 'convexset:three-way',
	version: '0.1.4',
	summary: 'Flexible and straightforward three-way data-binding for Meteor (y\'know, db-MVVM; Or db-M-VM-V)',
	git: 'https://github.com/convexset/meteor-three-way',
	documentation: '../../README.md'
});

Package.onUse(function(api) {
	api.versionsFrom('1.2.0.2');
	api.use(['ecmascript', 'underscore', 'mongo', 'convexset:package-utils@0.1.0']);
	api.use([
		'blaze', 'tracker',
		'reactive-var', 'reactive-dict',
		'convexset:template-helpers@0.1.9'
	], 'client');
	api.addFiles(['three-way.js']);
	api.export('ThreeWay');
});

Package.onTest(function(api) {
	api.use('tinytest');
	api.use(['ecmascript', 'underscore', 'mongo', 'tracker', 'convexset:three-way']);
	api.addFiles(['tests.js']);
});
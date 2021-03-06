Package.describe({
	// [validatis:stack]
	name: 'convexset:three-way',
	version: '0.2.31_4',
	summary: 'Flexible and Blaze-friendly three-way (declarative) data-binding for Meteor',
	git: 'https://github.com/convexset/meteor-three-way',
	documentation: '../../README.md'
});

Package.onUse(function pkgSetup(api) {
	api.versionsFrom('1.3.1');
	api.use([
		'ecmascript', 'mongo',
		'templating',
		'tracker', 'reactive-var', 'reactive-dict',
		'reload',
		'convexset:template-helpers@0.1.19_1',
		'tmeasday:check-npm-versions@0.3.1'
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

Package.describe({
	name: 'anima-t3d:3w-ui-modal',
	version: '1.0.0',
	// Brief, one-line summary of the package.
	summary: 'Provides a modal template to be used with convexset:three-way',
	// URL to the Git repository containing the source code for this package.
	git: '',
	// By default, Meteor will default to using README.md for documentation.
	// To avoid submitting documentation, set this field to null.
	documentation: 'README.md'
});

Package.onUse(function(api) {
	api.versionsFrom('1.2.1');
	api.use([
		'ecmascript',
		'templating',
		'underscore',
		'jquery'
	]);
	api.use([
		'convexset:three-way@0.2.9',
		'semantic:ui@2.1.6',
		'flemay:less-autoprefixer@1.2.0'
	]);

	api.addFiles([
		'lib/templates/_Modal.html',
		'lib/templates/_Modal.js'
	],
	'client'
	);
});

Package.onTest(function(api) {
	api.use([
		'ecmascript',
		'templating',
		'tinytest',
		'anima-t3d:3w-ui-modal'
	]);
	api.addFiles([
		'tests/client/client-tests.js'
	],
	[
		'client'
	]);
});

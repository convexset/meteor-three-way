Package.describe({
	name: 'anima-t3d:3w-demo-ani-1',
	version: '1.0.0',
	// Brief, one-line summary of the package.
	summary: 'Contains the code for demo 1',
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
		'jquery',
		'mongo'
	]);
	api.use([
		'convexset:three-way@0.2.9',
		'semantic:ui@2.1.6',
		'flemay:less-autoprefixer@1.2.0',
		'anti:fake',
		'anima-t3d:3w-ui-modal'
	]);
	api.addFiles([
		'lib/threeway.js',
		'lib/threeway.html',
		'lib/threeway.css',
		'lib/lib/data.js'
	],
	[
		'client',
		'server'
	]);

	api.addFiles([
		'lib/templates/TagsManager.html',
		'lib/templates/TagsManager.js',
		'lib/templates/UsersTable.html',
		'lib/templates/UsersTable.js'
	],
	'client'
	);
});

Package.onTest(function(api) {
	api.use([
		'ecmascript',
		'templating',
		'tinytest',
		'anima-t3d:3w-demo-ani-1'
	]);
	api.addFiles([
		'tests/client/client-tests.js'
	],
	[
		'client'
	]);
});

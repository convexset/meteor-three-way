Package.describe({
	name: 'convexset:three-way--guide',
	version: '0.0.1',
	summary: 'three-way--guide',
});


Package.onUse(function(api) {
	api.versionsFrom('1.2.0.2');

	api.use([
		'ecmascript',
		'es5-shim',
		'underscore',
		'ejson',
		'mongo',
		'anti:fake@0.4.1',
        'convexset:collection-tools@0.0.6',
	]);
	api.use(
		[
			'reactive-var',
			'blaze-html-templates',
			'convexset:three-way@0.2.15',
			'convexset:template-helpers@0.1.15',
			'convexset:plugins@0.1.0',
			'convexset:highlight-js-themes@0.1.0',
		],
		'client'
	);

	api.addFiles([
			'data-with-collection-tools.js',
			'data.js',
		], ['client', 'server']);
	api.addFiles('server-side.js', 'server');

	api.addFiles([
		'preliminary-administration.js',

		'guide.css',
		'guide-random-id.js',

		'guide-basics.html',
		'guide-basics.js',
		'guide-three-way-proper.html',
		'guide-three-way-proper.js',
		'guide-pre-processors-and-more-bindings.html',
		'guide-pre-processors-and-more-bindings.js',
		'guide-pure-side-effects.html',
		'guide-pure-side-effects.js',
		'guide-events-data-validation.html',
		'guide-events-data-validation.js',
		'guide-family-data-access.html',
		'guide-family-data-access.js',
		'guide-dynamic-data-binding.html',
		'guide-dynamic-data-binding.js',
		'guide-customizing-vm-db-updates.html',
		'guide-customizing-vm-db-updates.js',
		'guide-data-sync-feedback.html',
		'guide-data-sync-feedback.js',
		'guide-reload.html',
		'guide-reload.js',

		'guide-three-way-with-collection-tools.html',
		'guide-three-way-with-collection-tools.js',
	], 'client');

	api.addFiles('plugin-setup.js', 'client');

	api.export('hljsProcessPreBlocks', 'client');

	api.export('DataRecord');
});
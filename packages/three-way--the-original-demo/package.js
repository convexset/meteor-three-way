Package.describe({
	name: 'convexset:three-way--the-original-demo',
	version: '0.0.1',
	summary: 'three-way--the-original-demo',
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
	]);
	api.use(
		[
			'reactive-var',
			'blaze-html-templates',
			'convexset:three-way@0.2.29_8',
			'convexset:template-helpers@0.1.18_1',
			'convexset:plugins@0.1.0_3',
		],
		'client'
	);

	api.addFiles('data.js', ['client', 'server']);
	api.addFiles([
		'demo-server-side.js'
	], 'server');
	api.addFiles([
		'plugin-setup.js',
		'demo.css',
		'demo.html',
		'demo-templates.js',
		'demo-three-way-setup.js',
	], 'client');
});
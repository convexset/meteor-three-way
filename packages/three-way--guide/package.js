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
    ]);
    api.use(
        [
            'reactive-var',
            'blaze-html-templates',
            'convexset:three-way@0.2.15',
            'convexset:template-helpers@0.1.15',
            'convexset:plugins@0.1.0',
        ],
        'client'
    );

    api.addFiles('data.js', ['client', 'server']);
    api.addFiles('server-side.js', 'server');

    api.addFiles([
        'guide-generate-toc.js',
        'guide-random-id.js',
        'guide.css',
        'guide-basics.html',
        'guide-basics.js',
        'guide-three-way-proper.html',
        'guide-three-way-proper.js',
        'guide-pre-processors-and-more-bindings.html',
        'guide-pre-processors-and-more-bindings.js',
        'guide-events-data-validation.html',
        'guide-events-data-validation.js',
        'guide-family-data-access.html',
        'guide-family-data-access.js',
        'guide-dynamic-data-binding.html',
        'guide-dynamic-data-binding.js',
        'guide-reload.html',
        'guide-reload.js',
        'guide-data-sync-feedback.html',
        'guide-data-sync-feedback.js',
        'guide-pure-side-effects.html',
        'guide-pure-side-effects.js',
        'guide-customizing-vm-updates.html',
        'guide-customizing-vm-updates.js',
    ], 'client');

    api.addFiles('plugin-setup.js', 'client');

});
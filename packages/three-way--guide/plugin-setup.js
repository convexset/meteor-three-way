/* global Plugins: true */

var THREEWAY_GUIDE_NAMESPACE = "ThreeWay Guide Namespace";

Plugins.register(THREEWAY_GUIDE_NAMESPACE, {
    methods: {
        info: function() {
            return {
                name: 'Basics (View Model Only)',
                description: 'View to view model (two-way) data binding. Bindings: value, checked, text, html',
                routeName: 'basics',
                templateName: 'ThreeWayGuide_BasicsVMOnly_Wrapper',
                order: 1,
            };
        },
    },
});

Plugins.register(THREEWAY_GUIDE_NAMESPACE, {
    methods: {
        info: function() {
            return {
                name: '(Coming Soon) Three-Way Data-Binding Proper',
                description: 'View to view model to database (three-way) data binding. Bindings via wild-cards.',
                routeName: 'three-way-proper',
                templateName: 'ThreeWayGuide_ThreeWay_Wrapper',
                order: 2,
            };
        },
    },
});

Plugins.register(THREEWAY_GUIDE_NAMESPACE, {
    methods: {
        info: function() {
            return {
                name: '(Coming Soon) A Few More Bindings',
                description: 'More Bindings: style, class, attr, visible, disabled, focus, event; Multivariate bindings.',
                routeName: 'more-bindings',
                templateName: 'ThreeWayGuide_MoreBindings_Wrapper',
                order: 3,
            };
        },
    },
});

Plugins.register(THREEWAY_GUIDE_NAMESPACE, {
    methods: {
        info: function() {
            return {
                name: '(Coming Soon) Data Validation',
                description: 'More Bindings: style, class, attr, visible, disabled, focus, event',
                routeName: 'data-validation',
                templateName: 'ThreeWayGuide_DataValidation_Wrapper',
                order: 4,
            };
        },
    },
});

Plugins.register(THREEWAY_GUIDE_NAMESPACE, {
    methods: {
        info: function() {
            return {
                name: '(Coming Soon) Declarative Data Display: Pre-Processors',
                description: 'Pre-processors for displaying data and (necessary evil) side-effects for HTML components that require it',
                routeName: 'pre-processors',
                templateName: 'ThreeWayGuide_PreProcessors_Wrapper',
                order: 5,
            };
        },
    },
});

Plugins.register(THREEWAY_GUIDE_NAMESPACE, {
    methods: {
        info: function() {
            return {
                name: '(Coming Soon) Family Data Access',
                description: 'ThreeWay instances are connected in family trees and can access each others\' data',
                routeName: 'family-data-access',
                templateName: 'ThreeWayGuide_FamilyDataAccess_Wrapper',
                order: 6,
            };
        },
    },
});

Plugins.register(THREEWAY_GUIDE_NAMESPACE, {
    methods: {
        info: function() {
            return {
                name: '(Coming Soon) Dynamic Data-binding',
                description: 'Dynamic Data-binding and Usage with Family Trees',
                routeName: 'dynamic-data-binding',
                templateName: 'ThreeWayGuide_DynamicDataBinding_Wrapper',
                order: 7,
            };
        },
    },
});

Plugins.register(THREEWAY_GUIDE_NAMESPACE, {
    methods: {
        info: function() {
            return {
                name: '(Coming Soon) Reload and Migration',
                description: 'Reload and View Model Data Persistence',
                routeName: 'reload',
                templateName: 'ThreeWayGuide_Reload_Wrapper',
                order: 8,
            };
        },
    },
});

Plugins.register(THREEWAY_GUIDE_NAMESPACE, {
    methods: {
        info: function() {
            return {
                name: '(Coming Soon) Data Synchronization Feedback',
                description: 'Data Synchronization Feedback: Fields updated on server, Updates made to a focused field',
                routeName: 'data-sync-feedback',
                templateName: 'ThreeWayGuide_DataSyncFeedback_Wrapper',
                order: 9,
            };
        },
    },
});

Plugins.register(THREEWAY_GUIDE_NAMESPACE, {
    methods: {
        info: function() {
            return {
                name: 'Declarative Data Display with Process',
                description: 'A Pure Side-effects (Using the process Binding) Pre-Processor Example: Rotate a Canvas Plot',
                routeName: 'pure-side-effects',
                templateName: 'ThreeWayGuide_PureSideEffects_Wrapper',
                order: 10,
            };
        },
    },
});
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
                name: 'Three-Way Data-Binding Proper',
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
                name: 'Declarative Data Display and More Bindings',
                description: 'Pre-processors for displaying data and (necessary evil) side-effects for HTML components that require it. More Bindings: style, class, attr, visible, disabled; Multivariate bindings.',
                routeName: 'declarative-data-display',
                templateName: 'ThreeWayGuide_PreProcessorsMoreBindings_Wrapper',
                order: 3,
            };
        },
    },
});

Plugins.register(THREEWAY_GUIDE_NAMESPACE, {
    methods: {
        info: function() {
            return {
                name: 'Taking Declarative Data Display Further',
                description: 'One cannot do justice to the idea of declarative data display by just adding a few items to a list. Here, we present a pure side-effects pre-processor example (using the process binding) with a little more visual appeal and interactivity',
                routeName: 'pure-side-effects',
                templateName: 'ThreeWayGuide_PureSideEffects_Wrapper',
                order: 4,
            };
        },
    },
});

Plugins.register(THREEWAY_GUIDE_NAMESPACE, {
    methods: {
        info: function() {
            return {
                name: 'Events and Data Validation',
                description: 'Events and the data validation flow',
                routeName: 'events-data-validation',
                templateName: 'ThreeWayGuide_EventsDataValidation_Wrapper',
                order: 5,
            };
        },
    },
});

Plugins.register(THREEWAY_GUIDE_NAMESPACE, {
    methods: {
        info: function() {
            return {
                name: 'Family Data Access',
                description: 'ThreeWay instances are connected in family trees and can access each others\' data. Here is how things work.',
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
                name: 'Dynamic Data-binding: Reactivity and a Nice Dev. Experience',
                description: 'Dynamic Data-binding and how it works with Blaze. Combined with Dev. Tools, leads to a wonderful developer experience. Pointers on usage within Family Trees.',
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
                name: 'Customizing UI→VM Updates and VM→DB Updates',
                description: 'Customizing How the UI Updates the View Model: Applying throttling, debouncing or choosing whether or not to update the view model on an input event. Customizing updates from the View Model to the database.',
                routeName: 'customizing-vm-db-updates',
                templateName: 'ThreeWayGuide_CustomizingVMDBUpdates_Wrapper',
                order: 8,
            };
        },
    },
});

Plugins.register(THREEWAY_GUIDE_NAMESPACE, {
    methods: {
        info: function() {
            return {
                name: 'More Feedback: Data Synchronization, Focus, Focused Field Updates',
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
                name: 'Reload and Migration',
                description: 'Reload and View Model Data Persistence. A really short demo.',
                routeName: 'reload',
                templateName: 'ThreeWayGuide_Reload_Wrapper',
                order: 10,
            };
        },
    },
});

Plugins.register(THREEWAY_GUIDE_NAMESPACE, {
    methods: {
        info: function() {
            return {
                name: 'Usage with convexset:collection-tools',
                description: 'Usage with convexset:collection-tools for reduced boilerplate and increased developer productivity.',
                routeName: 'with-collection-tools',
                templateName: 'ThreeWayGuide_ThreeWayCT_Wrapper',
                order: 11,
            };
        },
    },
});

Plugins.register(THREEWAY_GUIDE_NAMESPACE, {
    methods: {
        info: function() {
            return {
                name: 'Bulk Bindings: styles, classes and attributes',
                description: 'Bulk Bindings (styles, classes and attrs) allow one to work with styles, classes and attrs by binding each to a single object.',
                routeName: 'styles-classes-attributes',
                templateName: 'ThreeWayGuide_StylesClassesAttributes_Wrapper',
                order: 3.5,
            };
        },
    },
});
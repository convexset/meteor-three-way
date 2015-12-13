/* global Plugins: true */

Plugins.register('ThreeWay Examples Namespace', {
    methods: {
        info: function() {
            return {
                name: 'Guide: Basics (View Model Only)',
                description: 'View to view model (two-way) data binding. Bindings: value, checked, text, html',
                routeName: 'guide-basics',
                templateName: 'ThreeWayGuide_BasicsVMOnly_Wrapper',
                order: 1,
            };
        },
    },
});

Plugins.register('ThreeWay Examples Namespace', {
    methods: {
        info: function() {
            return {
                name: 'Guide: Three-Way Data-Binding Proper',
                description: 'View to view model to database (three-way) data binding. Bindings via wild-cards.',
                routeName: 'guide-three-way-proper',
                templateName: 'ThreeWayGuide_ThreeWay_Wrapper',
                order: 2,
            };
        },
    },
});

Plugins.register('ThreeWay Examples Namespace', {
    methods: {
        info: function() {
            return {
                name: 'Guide: A Few More Bindings',
                description: 'More Bindings: style, class, attr, visible, disabled, focus, event',
                routeName: 'guide-more-bindings',
                templateName: 'ThreeWayGuide_MoreBindings_Wrapper',
                order: 3,
            };
        },
    },
});

Plugins.register('ThreeWay Examples Namespace', {
    methods: {
        info: function() {
            return {
                name: 'Guide: Data Validation',
                description: 'More Bindings: style, class, attr, visible, disabled, focus, event',
                routeName: 'guide-data-validation',
                templateName: 'ThreeWayGuide_DataValidation_Wrapper',
                order: 4,
            };
        },
    },
});

Plugins.register('ThreeWay Examples Namespace', {
    methods: {
        info: function() {
            return {
                name: 'Guide: Using Pre-Processors',
                description: 'Pre-processors for displaying data and (necessary evil) side-effects for HTML components that require it',
                routeName: 'guide-pre-processors',
                templateName: 'ThreeWayGuide_PreProcessors_Wrapper',
                order: 5,
            };
        },
    },
});

Plugins.register('ThreeWay Examples Namespace', {
    methods: {
        info: function() {
            return {
                name: 'Guide: Family Data Access',
                description: 'ThreeWay instances are connected in family trees and can access each others\' data',
                routeName: 'guide-family-data-access',
                templateName: 'ThreeWayGuide_FamilyDataAccess_Wrapper',
                order: 6,
            };
        },
    },
});

Plugins.register('ThreeWay Examples Namespace', {
    methods: {
        info: function() {
            return {
                name: 'Guide: Dynamic Data-binding',
                description: 'Dynamic Data-binding and Usage with Family Trees',
                routeName: 'guide-dynamic-data-binding',
                templateName: 'ThreeWayGuide_DynamicDataBinding_Wrapper',
                order: 7,
            };
        },
    },
});

Plugins.register('ThreeWay Examples Namespace', {
    methods: {
        info: function() {
            return {
                name: 'Guide: Reload and Migration',
                description: 'Reload and View Model Data Persistence',
                routeName: 'guide-reload',
                templateName: 'ThreeWayGuide_Reload_Wrapper',
                order: 8,
            };
        },
    },
});

Plugins.register('ThreeWay Examples Namespace', {
    methods: {
        info: function() {
            return {
                name: 'Guide: Data Synchronization Feedback',
                description: 'Data Synchronization Feedback: Fields updated on server, Updates made to a focused field',
                routeName: 'guide-data-sync-feedback',
                templateName: 'ThreeWayGuide_DataSyncFeedback_Wrapper',
                order: 9,
            };
        },
    },
});

Plugins.register('ThreeWay Examples Namespace', {
    methods: {
        info: function() {
            return {
                name: 'Guide: Pure Side-Effects with Process',
                description: 'A Pure Side-effects Pre-Processor Example: Rotate a Canvas Plot',
                routeName: 'guide-pure-side-effects',
                templateName: 'ThreeWayGuide_PureSideEffects_Wrapper',
                order: 10,
            };
        },
    },
});
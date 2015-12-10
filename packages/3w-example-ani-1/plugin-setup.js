/* global Plugins: true */

Plugins.register('ThreeWay Examples Namespace', {
	methods: {
		info: function() {
			return {
				name: 'Basic Demo',
                description: 'Basic Demo',
				routeName: 'ani1',
				templateName: 'Demo_Ani_1',
				order: 101,
			};
		},
	},
});
/* global Plugins: true */

Plugins.register('ThreeWay Examples Namespace', {
	methods: {
		info: function() {
			return {
				name: 'The Original Demo',
				description: 'A reasonably fully featured demo of ThreeWay. Actually this was original demo. But it is kind of a mess since it was made as the package was developed. Features being plastered on in an ad hoc manner and all.',
				routeName: 'original',
				templateName: 'ThreeWayOriginalDemo_Wrapper',
				order: 0,
			};
		},
	},
});
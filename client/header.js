/* global ThreeWay: true */
/* global HighlightJSThemes: true */
/* global webshim: true */

ThreeWay.prepare(Template.Header, {
	viewModelToViewOnly: {
		theme: HighlightJSThemes.defaultTheme,
	}
});

Template.Header.onRendered(function() {
	var instance = this;
	instance.autorun(function() {
		var themeId = instance._3w_.get('theme');
		HighlightJSThemes.setTheme(themeId);
	});
});

Template.Header.helpers({
	themes: () => _.map(HighlightJSThemes.allThemes, (v, k) => ({
		id: k,
		name: v
	})).sort((x, y) => (x.id > y.id))
});

webshim.polyfill('forms forms-ext');
webshim.createMutationObserverToUpdatePolyfills();
/* global PackageUtilities: true */
/* global HighlightJSThemes: true */

var _hjs = function HighlightJSThemes() {};
HighlightJSThemes = new _hjs();

var allThemes = [
	"agate",
	"androidstudio",
	"arta",
	"ascetic",
	"atelier-cave-dark",
	"atelier-cave-light",
	"atelier-dune-dark",
	"atelier-dune-light",
	"atelier-estuary-dark",
	"atelier-estuary-light",
	"atelier-forest-dark",
	"atelier-forest-light",
	"atelier-heath-dark",
	"atelier-heath-light",
	"atelier-lakeside-dark",
	"atelier-lakeside-light",
	"atelier-plateau-dark",
	"atelier-plateau-light",
	"atelier-savanna-dark",
	"atelier-savanna-light",
	"atelier-seaside-dark",
	"atelier-seaside-light",
	"atelier-sulphurpool-dark",
	"atelier-sulphurpool-light",
	"brown-paper",
	// "brown-papersq.png",
	"codepen-embed",
	"color-brewer",
	"dark",
	"darkula",
	"default",
	"docco",
	"far",
	"foundation",
	"github-gist",
	"github",
	"googlecode",
	"grayscale",
	"hopscotch",
	"hybrid",
	"idea",
	"ir-black",
	"kimbie.dark",
	"kimbie.light",
	"magula",
	"mono-blue",
	"monokai-sublime",
	"monokai",
	"obsidian",
	"paraiso-dark",
	"paraiso-light",
	"pojoaque",
	// "pojoaque.jpg",
	"railscasts",
	"rainbow",
	"school-book",
	// "school-book.png",
	"solarized-dark",
	"solarized-light",
	"sunburst",
	"tomorrow-night-blue",
	"tomorrow-night-bright",
	"tomorrow-night-eighties",
	"tomorrow-night",
	"tomorrow",
	"vs",
	"xcode",
	"zenburn",
];

var themeNames = _.object(
	allThemes.map(t => [
		t,
		t.replace('.', '-').split('-')
		.map(s => s.charAt(0).toUpperCase() + s.substr(1)).join(' ')
		.replace("Github", "GitHub")
		.replace("Ir", "IR")
		.replace("Androidstudio", "Android Studio")
	])
);


function loadJsCssFile(link) {
	var fileref;
	var fileExt = link.toString().split('.').pop().toLowerCase();
	if (fileExt === "js") {
		fileref = document.createElement('script');
		fileref.setAttribute("type", "text/javascript");
		fileref.setAttribute("src", link);
	} else if (fileExt === "css") {
		fileref = document.createElement("link");
		fileref.setAttribute("rel", "stylesheet");
		fileref.setAttribute("type", "text");
		fileref.setAttribute("href", link);
	}
	if (typeof fileref !== "undefined") {
		return document.getElementsByTagName("head")[0].appendChild(fileref);
	}
}

function getLink(themeName) {
	return "/packages/convexset_highlight-js-themes/styles/" + themeName + ".css";
	// return "https://rawgit.com/isagalaev/highlight.js/master/src/styles/" + themeName + ".css";
}

var _defaultTheme = "monokai-sublime";
var defaultTheme = _defaultTheme;
PackageUtilities.addPropertyGetterAndSetter(HighlightJSThemes, 'defaultTheme', {
	get: () => defaultTheme,
	set: function(themeName) {
		if (allThemes.indexOf(themeName) === -1) {
			throw new Meteor.Error('no-such-theme');
		} else {
			defaultTheme = themeName;	
		}
	}
});
PackageUtilities.addImmutablePropertyObject(HighlightJSThemes, 'allThemes', themeNames);


var currTheme;
var cssElement;
PackageUtilities.addImmutablePropertyFunction(HighlightJSThemes, 'setTheme', function setTheme(themeName) {
	if (currTheme === themeName) {
		return;
	}

	if (allThemes.indexOf(themeName) === -1) {
		themeName = HighlightJSThemes.defaultTheme;
	}

	var link = getLink(themeName);
	if (!!cssElement) {
		cssElement.setAttribute('href', link);
	} else {
		cssElement = loadJsCssFile(link);
	}
	currTheme = themeName;
});
PackageUtilities.addImmutablePropertyFunction(HighlightJSThemes, 'setRandomTheme', function setRandomTheme() {
	var themeName = allThemes[Math.floor(allThemes.length * Math.random())];
	HighlightJSThemes.setTheme(themeName);
	return themeName;
});
PackageUtilities.addPropertyGetter(HighlightJSThemes, 'currentTheme', () => currTheme);

Meteor.startup(function() {
	if (!currTheme) {
		HighlightJSThemes.setTheme(HighlightJSThemes.defaultTheme);
	}
});
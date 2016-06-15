/* global HighlightJSThemes: true */

import { checkNpmVersions } from 'meteor/tmeasday:check-npm-versions';
checkNpmVersions({
  'package-utils': '^0.2.1',
  'underscore' : '^1.8.3',
});
const PackageUtilities = require('package-utils');
const _ = require('underscore');

var _hjs = function HighlightJSThemes() {};
HighlightJSThemes = new _hjs();

var allThemes = [
	"agate",
	"androidstudio",
	"arduino-light",
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


function loadJsCssFile_ScriptOrLinkTag(link) {
	// creates SCRIPT or LINK elements in HEAD
	// does not work in FireFox, unfortunately
	var scriptOrLinkElement;
	var fileExt = link.toString().split('.').pop().toLowerCase();
	if (fileExt === "js") {
		scriptOrLinkElement = document.createElement('script');
		scriptOrLinkElement.setAttribute("type", "text/javascript");
		scriptOrLinkElement.setAttribute("src", link);
	} else if (fileExt === "css") {
		scriptOrLinkElement = document.createElement("link");
		scriptOrLinkElement.setAttribute("rel", "stylesheet");
		scriptOrLinkElement.setAttribute("type", "text");
		scriptOrLinkElement.setAttribute("href", link);
	}
	if (typeof scriptOrLinkElement !== "undefined") {
		return document.getElementsByTagName("head")[0].appendChild(scriptOrLinkElement);
	}
}

function loadCssFile_StyleBlock(link) {
	var styleElement;
	var fileExt = link.toString().split('.').pop().toLowerCase();
	if (fileExt === "css") {
		styleElement = document.createElement("style");
		styleElement.textContent = '@import "' + link + '"';
	}
	if (typeof styleElement !== "undefined") {
		return document.getElementsByTagName("head")[0].appendChild(styleElement);
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

	// Replace element
	// if (!!cssElement) {
	// 	cssElement.setAttribute('href', link);
	// } else {
	// 	cssElement = loadJsCssFile_ScriptOrLinkTag(link);
	// }

	// Remove and add new STYLE element
	if (!!cssElement) {
		document.getElementsByTagName("head")[0].removeChild(cssElement);
	}
	cssElement = loadCssFile_StyleBlock(link);

	currTheme = themeName;
});
PackageUtilities.addImmutablePropertyFunction(HighlightJSThemes, 'setRandomTheme', function setRandomTheme() {
	var themeName = allThemes[Math.floor(allThemes.length * Math.random())];
	HighlightJSThemes.setTheme(themeName);
	return themeName;
});
PackageUtilities.addPropertyGetter(HighlightJSThemes, 'currentTheme', () => currTheme);

PackageUtilities.addImmutablePropertyFunction(HighlightJSThemes, "highlightWithWorker", function highlightWithWorker(elem) {
	$(elem).each(function() {
		var el = this;
		var languageSubset = Array.prototype.slice.call(el.classList);
		var worker = new Worker("/packages/convexset_highlight-js-themes/worker.js");
		worker.onmessage = function workerOnMessage(event) {
			var payload = JSON.parse(event.data);
			// console.log(payload);
			el.innerHTML = payload.value;
			$(el).addClass("hljs");
			worker.terminate();
		};
		worker.postMessage({
			textContent: el.textContent,
			languageSubset: languageSubset
		});
	});
});

Meteor.startup(function() {
	if (!currTheme) {
		HighlightJSThemes.setTheme(HighlightJSThemes.defaultTheme);
	}
});
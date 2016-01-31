Package.describe({
	name: 'convexset:webshim',
	version: '1.15.10',
	summary: 'The Webshim polyfill library for using HTML5 features across browsers',
	documentation: 'README.md'
});

Package.onUse(function(api) {
	api.versionsFrom('1.2.1');
	api.use([
		'ecmascript',
		'underscore',
		'jquery',
		'convexset:package-utils@0.1.9',
	], 'client');

	api.addAssets([
		"shims/canvas-blob.js",
		"shims/color-picker.js",
		"shims/details.js",
		"shims/dom-extend.js",
		"shims/es5.js",
		"shims/es6.js",
		"shims/excanvas.js",
		"shims/filereader-xhr.js",
		"shims/form-combat.js",
		"shims/form-core.js",
		"shims/form-datalist-lazy.js",
		"shims/form-datalist.js",
		"shims/form-fixrangechange.js",
		"shims/form-inputmode.js",
		"shims/form-message.js",
		"shims/form-native-extend.js",
		"shims/form-number-date-api.js",
		"shims/form-number-date-ui.js",
		"shims/form-shim-extend.js",
		"shims/form-shim-extend2.js",
		"shims/form-validation.js",
		"shims/form-validators.js",
		"shims/forms-picker.js",
		"shims/geolocation.js",
		"shims/matchMedia.js",
		"shims/mediacapture-picker.js",
		"shims/mediacapture.js",
		"shims/mediaelement-core.js",
		"shims/mediaelement-debug.js",
		"shims/mediaelement-jaris.js",
		"shims/mediaelement-native-fix.js",
		"shims/mediaelement-yt.js",
		"shims/picture.js",
		"shims/range-ui.js",
		"shims/sizzle.js",
		"shims/sticky.js",
		"shims/swfmini-embed.js",
		"shims/swfmini.js",
		"shims/track-ui.js",
		"shims/track.js",
		"shims/url.js",
		"shims/usermedia-core.js",
		"shims/usermedia-shim.js",
		"shims/combos/1.js",
		"shims/combos/10.js",
		"shims/combos/11.js",
		"shims/combos/12.js",
		"shims/combos/13.js",
		"shims/combos/14.js",
		"shims/combos/15.js",
		"shims/combos/16.js",
		"shims/combos/17.js",
		"shims/combos/18.js",
		"shims/combos/2.js",
		"shims/combos/21.js",
		"shims/combos/22.js",
		"shims/combos/23.js",
		"shims/combos/25.js",
		"shims/combos/27.js",
		"shims/combos/28.js",
		"shims/combos/29.js",
		"shims/combos/3.js",
		"shims/combos/30.js",
		"shims/combos/31.js",
		"shims/combos/33.js",
		"shims/combos/34.js",
		"shims/combos/4.js",
		"shims/combos/5.js",
		"shims/combos/6.js",
		"shims/combos/7.js",
		"shims/combos/8.js",
		"shims/combos/9.js",
		"shims/combos/97.js",
		"shims/combos/98.js",
		"shims/combos/99.js",
		"shims/FlashCanvas/canvas2png.js",
		"shims/FlashCanvas/flashcanvas.js",
		"shims/FlashCanvas/flashcanvas.swf",
		"shims/FlashCanvasPro/canvas2png.js",
		"shims/FlashCanvasPro/flash10canvas.swf",
		"shims/FlashCanvasPro/flash9canvas.swf",
		"shims/FlashCanvasPro/flashcanvas.js",
		"shims/i18n/formcfg-ar.js",
		"shims/i18n/formcfg-bg.js",
		"shims/i18n/formcfg-ca.js",
		"shims/i18n/formcfg-ch-CN.js",
		"shims/i18n/formcfg-cs.js",
		"shims/i18n/formcfg-de.js",
		"shims/i18n/formcfg-el.js",
		"shims/i18n/formcfg-en.js",
		"shims/i18n/formcfg-es.js",
		"shims/i18n/formcfg-fa.js",
		"shims/i18n/formcfg-fi.js",
		"shims/i18n/formcfg-fr.js",
		"shims/i18n/formcfg-he.js",
		"shims/i18n/formcfg-hi.js",
		"shims/i18n/formcfg-hu.js",
		"shims/i18n/formcfg-it.js",
		"shims/i18n/formcfg-ja.js",
		"shims/i18n/formcfg-lt.js",
		"shims/i18n/formcfg-nl.js",
		"shims/i18n/formcfg-no.js",
		"shims/i18n/formcfg-pl.js",
		"shims/i18n/formcfg-pt-BR.js",
		"shims/i18n/formcfg-pt-PT.js",
		"shims/i18n/formcfg-pt.js",
		"shims/i18n/formcfg-ru.js",
		"shims/i18n/formcfg-sv.js",
		"shims/i18n/formcfg-zh-CN.js",
		"shims/i18n/formcfg-zh-TW.js",
		"shims/jme/alternate-media.js",
		"shims/jme/base.js",
		"shims/jme/controls.css",
		"shims/jme/jme.eot",
		"shims/jme/jme.svg",
		"shims/jme/jme.ttf",
		"shims/jme/jme.woff",
		"shims/jme/mediacontrols-lazy.js",
		"shims/jme/mediacontrols.js",
		"shims/jme/playlist.js",
		"shims/jpicker/jpicker.css",
		"shims/jpicker/images/AlphaBar.png",
		"shims/jpicker/images/bar-opacity.png",
		"shims/jpicker/images/Bars.png",
		"shims/jpicker/images/map-opacity.png",
		"shims/jpicker/images/mappoint.gif",
		"shims/jpicker/images/Maps.png",
		"shims/jpicker/images/NoColor.png",
		"shims/jpicker/images/picker.gif",
		"shims/jpicker/images/preview-opacity.png",
		"shims/jpicker/images/rangearrows.gif",
		"shims/moxie/flash/Moxie.cdn.swf",
		"shims/moxie/flash/Moxie.min.swf",
		"shims/moxie/js/moxie-html4.js",
		"shims/moxie/js/moxie-swf.js",
		"shims/plugins/jquery.ui.position.js",
		"shims/styles/color-picker.png",
		"shims/styles/forms-ext.css",
		"shims/styles/forms-picker.css",
		"shims/styles/progress.gif",
		"shims/styles/progress.png",
		"shims/styles/shim-ext.css",
		"shims/styles/shim.css",
		"shims/styles/transparent.png",
		"shims/styles/widget.eot",
		"shims/styles/widget.svg",
		"shims/styles/widget.ttf",
		"shims/styles/widget.woff",
		"shims/swf/JarisFLVPlayer.swf",
	], 'client');

	api.addFiles('polyfiller.js', 'client');
	api.addFiles('set-path.js', 'client');
});
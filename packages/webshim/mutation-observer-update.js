/* global webshim: true */

import { checkNpmVersions } from 'meteor/tmeasday:check-npm-versions';
checkNpmVersions({
	'underscore': '^1.8.3',
});
const _ = require('underscore');


webshim.createMutationObserverToUpdatePolyfills = function createMutationObserverToUpdatePolyfills(qs = "html") {
	// create an observer instance to update polyfills
	var observer = new MutationObserver(function(mutations) {
		mutations.forEach(function(mutation) {
			_.toArray(mutation.addedNodes).forEach(function(elem) {
				if (elem.nodeType === 1) {
					setTimeout(function updatePolyfill() {
						$(elem).updatePolyfill();
					}, 0);
				}
			});
		});
	});

	observer.observe(document.querySelector(qs), {
		childList: true,
		subtree: true,
	});

	return observer;
};
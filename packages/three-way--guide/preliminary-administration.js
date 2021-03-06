/* global hljs: true */
/* global hljsProcessPreBlocks: true */

function numLeadingSpaces(s) {
	if (s.trim() === "") {
		return Infinity;
	}
	return s.length - s.trimLeft().length;
}

function lessLeadingCharacters(s, n) {
	return s.substr(n);
}


hljsProcessPreBlocks = function hljsProcessPreBlocks() {
	$('pre').each(function(i, elem) {
		if (Array.prototype.indexOf.call(elem.classList, 'hljs') !== -1) {
			return;
		}

		var textBlocks = $(elem).text().split('\n').map(x => x.trimRight());
		while (textBlocks[0] === "") {
			textBlocks.shift();
		}
		while (textBlocks[textBlocks.length - 1] === "") {
			textBlocks.pop();
		}
		textBlocks.forEach(function(v, idx) {
			while (textBlocks[idx].indexOf('\t') !== -1) {
				textBlocks[idx] = textBlocks[idx].replace('\t', '    ');
			}
		});
		var minLeadingSpaces = Math.min.apply({}, textBlocks.map(numLeadingSpaces));

		$(elem).text(textBlocks.map(s => lessLeadingCharacters(s, minLeadingSpaces)).join('\n'));
		hljs.highlightBlock(elem);
		// HighlightJSThemes.highlightWithWorker(elem);
	});
};

Meteor.startup(function() {
	function generateTOC() {
		var instance = this;
		var allIds = [];
		Array.prototype.forEach.call(instance.$("h3"), function(elem) {
			var sectionName = $(elem).text().trim();

			var sectionHash = '';
			for (var i = 0; i < sectionName.length; i++) {
				sectionHash += ((sectionName[i].toLowerCase() >= 'a') && (sectionName[i].toLowerCase() <= 'z')) ? sectionName[i].toLowerCase() : '-';
			}
			while (allIds.indexOf(sectionHash) !== -1) {
				sectionHash += '-';
			}
			allIds.push(sectionHash);

			instance.$("#toc").append("<li><a href=\"#" + sectionHash + "\" class=\"three-way-toc\">" + sectionName + "</a></li>");
			$(elem.parentElement).attr('id', sectionHash);
		});
	}

	function gotoHash() {
		var instance = this;
		setTimeout(function() {
			if ((!!location.hash) && $(location.hash).length) {
				$('html, body').animate({
					scrollTop: Math.max(0, instance.$(location.hash).offset().top - 120)
				}, 500);
			} else {
				$('html, body').scrollTop(0);
			}
		}, 50);
	}

	Object.keys(Template)
		.filter(function(x) {
			var xs = x.split('_');
			if (xs.length < 2) {
				return false;
			}
			return (xs[0] === "ThreeWayGuide") && (xs[xs.length - 1] === "Wrapper");
		})
		.forEach(function(templateName) {
			Template[templateName].onRendered(generateTOC);
			Template[templateName].onRendered(gotoHash);

			Template[templateName].events({
				'click a.three-way-toc': function(event, instance) {
					var href = event.target.getAttribute('href');
					var hash = href && href.split('#').pop();
					if (!!hash) {
						event.preventDefault();
						$('html, body').animate({
							scrollTop: Math.max(0, instance.$('#' + hash).offset().top - 120)
						}, 500);
					}
				},
			});
		});

	Object.keys(Template)
		.filter(function(x) {
			var xs = x.split('_');
			if (xs.length < 2) {
				return false;
			}
			return (xs[0] === "ThreeWayGuide");
		})
		.forEach(function(templateName) {
			Template[templateName].onRendered(hljsProcessPreBlocks);
		});

	// Scroll and change hash
	// http://stackoverflow.com/questions/5315659/jquery-change-hash-while-scrolling-down-page/5315993#5315993
	$(document).bind('scroll', function() {
		$('section').each(function() {
			if (($(this).offset().top < window.pageYOffset) && ($(this).offset().top + $(this).height() > window.pageYOffset)) {
				if ((!!$(this).attr('id')) && (window.location.hash !== $(this).attr('id'))) {
					history.replaceState(null, null, location.pathname + "#" + $(this).attr('id'));
				}
			}
		});
	});
});
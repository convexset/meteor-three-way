/* global ThreeWay: true */
/* global Reload: true */

ThreeWay.prepare(Template.ThreeWayGuide_Reload, {
	viewModelToViewOnly: {
		'colR': 207,
		'colG': 181,
		'colB': 59,
	},
	preProcessors: {
		toRGB: function(r, g, b) {
			return '#' + [r, g, b].map(x => Number(x).toString(16)).join('');
		},
		toInvRGB: function(r, g, b) {
			return '#' + [r, g, b].map(x => (255 - Number(x)).toString(16)).join('');
		},
	},
});

Template.ThreeWayGuide_Reload.events({
	'click button.reload': function(event) {
		Reload._reload();
		event.target.classList.add('loading');
		event.target.disabled = true;
	}
});
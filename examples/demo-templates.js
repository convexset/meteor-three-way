/* global ThreeWay: true */
/* global Demo: true */
/* global parentTemplate: true */
/* global childTemplate: true */
/* global grandchildTemplate: true */

////////////////////////////////////////////////////////////
// Preamble
////////////////////////////////////////////////////////////
function setUpDebugMessages(template) {
	var _selectedDebugMessages = template && template._3w_.get_NR('debugMessages') || [];
	console.info('Selected Debug Messages:', _selectedDebugMessages);
	ThreeWay.setDebugModeOn();
	ThreeWay.debugModeSelectNone();
	_selectedDebugMessages.forEach(x => ThreeWay.debugModeSelect(x));
}


////////////////////////////////////////////////////////////
// Parent Template
////////////////////////////////////////////////////////////
if (Meteor.isClient) {
	var sub = Meteor.subscribe('demo-pub');
	setUpDebugMessages();

	Template.DemoThreeWay.onCreated(function() {
		parentTemplate = this;
		this.num = new ReactiveVar(1);
	});

	Template.DemoThreeWay.onRendered(function() {
		(function createDropdown() {
			if (!selectCreated) {
				var selector = $('.ui.dropdown');
				if (selector.length > 0) {
					selectCreated = true;
					selector.dropdown({
						allowAdditions: true
					});
				} else {
					setTimeout(createDropdown, 10);
				}
			}
		})();
	});

	Template.DemoThreeWay.helpers({
		ready: () => sub.ready(),
		data: () => Demo.collection.find(),
		allTags: () => Demo.allTags.map(x => x),
		ageRanges: () => _.extend({}, Demo.ageRanges),
		emailPrefsAll: () => _.extend({}, Demo.emailPrefsAll),
		emailPrefsToCSL: function(arr) {
			return arr.map(x => Demo.emailPrefsAll[x]).join(", ");
		},
		num: () => Template.instance().num.get(),
		allDebugMessages: () => ThreeWay.DEBUG_MESSAGE_HEADINGS,
		toLowerCase: x => x.toLowerCase && x.toLowerCase(),
		additionalVMOnlyData: function() {
			return _.object(_.range(5).map(idx => ['idx_' + idx, Math.floor(Math.random() * 10000)]));
		},
	});

	var selectCreated = false;
	Template.DemoThreeWay.events({
		"click button.select-data": function(event, template) {
			template.num.set(1);
			var id = event.target.getAttribute('id').split('-')[1];
			console.info('Setting ID to: ' + id);
			console.info('Note the personal.someArr array is initially only bound to one input element (item 0).');

			// Set time out to allow the effects of setting num to 1 to set in
			// so the additional elements are only rendered later
			setTimeout(function() {
				template._3w_.setId(id);

				setTimeout(function() {
					$('html, body').animate({
						scrollTop: Math.max(0, $("#edit-head").offset().top - 120)
					}, 500);
				}, 50);

				setTimeout(function() {
					template.num.set(3);
					console.info('Now (~3 sec later) personal.someArr array bound to three input elements (item 0, 1 & 2).');
				}, 3000);
			}, 50);
		},
		"click button.talk": function() {
			/* global alert: true */
			alert('Not disabled!');
		},
		"click button#randomize-child-ids": function() {
			/* global alert: true */
			Template.instance()._3w_.childDataSetId(randomId(), 'kiddy');
			Template.instance()._3w_.childDataSetId(randomId(), ['kiddy', 'grandkiddy']);
			Template.instance()._3w_.childDataSetId(randomId(), ['kiddy', 'other_grandkiddy']);
			Template.instance()._3w_.childDataSetId(randomId(), ['kiddy', 'yet_another_grandkiddy']);
		},
		"change input[name=debug-messages]": function(event, template) {
			setTimeout(() => setUpDebugMessages(template), 50);
		},
		"click a#focus-name": function(event) {
			event.preventDefault();
			Template.instance()._3w_.set('nameHasFocus', true);
		},
	});
}


////////////////////////////////////////////////////////////
// Child Template
////////////////////////////////////////////////////////////
if (Meteor.isClient) {
	Template.DemoThreeWayChild.onCreated(function() {
		var instance = this;
		childTemplate = instance;
		instance.allowThirdGrandchild = new ReactiveVar(false);
		setTimeout(function() {
			console.info('Third Grandchild released!!!');
			instance.allowThirdGrandchild.set(true);
		}, 10000);
	});
	Template.DemoThreeWayChild.helpers({
		allowThirdGrandchild: () => Template.instance().allowThirdGrandchild.get(),
	});
}


////////////////////////////////////////////////////////////
// Grand Child Template
////////////////////////////////////////////////////////////
if (Meteor.isClient) {
	Template.DemoThreeWayGrandChild.onCreated(function() {
		grandchildTemplate = this;
	});
	Template.DemoThreeWayGrandChild.onRendered(function() {
		var instance = this;
		Tracker.autorun(function() {
			// sub.ready changes once... supposedly...
			if (sub.ready()) {
				instance._3w_.setId(randomId());
			}
		});
	});
}


////////////////////////////////////////////////////////////
// Misc. Misc.
////////////////////////////////////////////////////////////

function randomId() {
	var data = Demo.collection.find({}, {
		reactive: false
	}).fetch();
	return data[Math.floor(data.length * Math.random())]._id;
}
/* global ThreeWay: true */
/* global Fake: true */

////////////////////////////////////////////////////////////
// Parent Template
////////////////////////////////////////////////////////////
ThreeWay.prepare(Template.ThreeWayGuide_FamilyTree_GenOne, {
	viewModelToViewOnly: {
		"data": "parent"
	},
});
Template.ThreeWayGuide_FamilyTree_GenOne.onCreated(function() {
});
Template.ThreeWayGuide_FamilyTree_GenOne.onRendered(function() {
});
Template.ThreeWayGuide_FamilyTree_GenOne.events({
	'click button#rnd-child': function() {
		Template.instance()._3w_.childDataSet('data', Fake.word(), 'child');
	},
	'click button#rnd-gc-one': function() {
		Template.instance()._3w_.childDataSet('data', Fake.word(), ['child', 'grand-child-1']);
	},
	'click button#rnd-gc-two': function() {
		Template.instance()._3w_.childDataSet('data', Fake.word(), ['child', 'grand-child-2']);
	},
});
Template.ThreeWayGuide_FamilyTree_GenOne.helpers({
	childName: 'child',
	grandChildPath1: ['child', 'grand-child-1'],
	grandChildPath2: ['child', 'grand-child-2'],
});


////////////////////////////////////////////////////////////
// Child Template
////////////////////////////////////////////////////////////
ThreeWay.prepare(Template.ThreeWayGuide_FamilyTree_GenTwo, {
	viewModelToViewOnly: {
		"data": "child"
	},
});
Template.ThreeWayGuide_FamilyTree_GenTwo.onCreated(function() {
});
Template.ThreeWayGuide_FamilyTree_GenTwo.onRendered(function() {
});
Template.ThreeWayGuide_FamilyTree_GenTwo.events({
	'click button#rnd-parent': function() {
		Template.instance()._3w_.parentDataSet('data', Fake.word(), 1);
	},
	'click button#rnd-gc-one': function() {
		Template.instance()._3w_.childDataSet('data', Fake.word(), 'grand-child-1');
	},
	'click button#rnd-gc-two': function() {
		Template.instance()._3w_.childDataSet('data', Fake.word(), 'grand-child-2');
	},
});
Template.ThreeWayGuide_FamilyTree_GenTwo.helpers({
	childName1: 'grand-child-1',
	childName2: 'grand-child-2',
});


////////////////////////////////////////////////////////////
// Grand Child Template
////////////////////////////////////////////////////////////
ThreeWay.prepare(Template.ThreeWayGuide_FamilyTree_GenThree, {
	viewModelToViewOnly: {
		"data": "grand-child"
	},
});
Template.ThreeWayGuide_FamilyTree_GenThree.onCreated(function() {
});
Template.ThreeWayGuide_FamilyTree_GenThree.onRendered(function() {
});
Template.ThreeWayGuide_FamilyTree_GenThree.events({
	'click button#rnd-gen-one': function() {
		Template.instance()._3w_.parentDataSet('data', Fake.word(), 2);
	},
	'click button#rnd-gen-two': function() {
		Template.instance()._3w_.parentDataSet('data', Fake.word(), 1);
	},
	'click button#rnd-sibling': function() {
		var siblingName = 'grand-child-' + (3 - Number((Template.instance()._3w_.get3wInstanceId() || "").split('-').pop()));
		Template.instance()._3w_.siblingDataSet('data', Fake.word(), siblingName);
	},
});
Template.ThreeWayGuide_FamilyTree_GenThree.helpers({
	siblingName: function() {
		return 'grand-child-' + (3 - Number((Template.instance()._3w_.get3wInstanceId() || "").split('-').pop()));
	},
});

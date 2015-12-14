/* global Fake: true */
/* global ThreeWay: true */
/* global GuideData: true */
/* global getRandomId: true */


function mapX(x, canvasWidth, bounds) {
	var [minX, maxX] = bounds.x;
	return Math.round((0.15 + 0.7 * (Number(x) - minX) / (maxX - minX)) * canvasWidth);
}

function mapY(y, canvasHeight, bounds) {
	var [minY, maxY] = bounds.y;
	return Math.round((0.15 + 0.7 * (1 - (Number(y) - minY) / (maxY - minY))) * canvasHeight);
}

function drawLine(canvasContext, canvasWidth, canvasHeight, bounds, x1, y1, x2, y2, color = 'black') {
	canvasContext.beginPath();
	canvasContext.moveTo(mapX(x1, canvasWidth, bounds), mapY(y1, canvasHeight, bounds));
	canvasContext.lineTo(mapX(x2, canvasWidth, bounds), mapY(y2, canvasHeight, bounds));
	canvasContext.strokeStyle = color;
	canvasContext.stroke();
}

function putText(canvasContext, canvasWidth, canvasHeight, bounds, x, y, text, color = 'black', font = "12px Arial") {
	canvasContext.font = font;
	canvasContext.fillStyle = color;
	canvasContext.textAlign = "center";
	canvasContext.fillText(text, mapX(x, canvasWidth, bounds), mapY(y, canvasHeight, bounds));
}

function drawGraph(elem, points, bounds) {
	$(elem).empty();
	var plotGraph = (_.isArray(points) ? points : []).length > 1;

	var [minX, maxX] = bounds.x;
	var [minY, maxY] = bounds.y;

	var canvasContext;
	var canvasWidth = 250;
	var canvasHeight = Math.round(((maxY - minY) / (maxX - minX)) * canvasWidth);

	if (plotGraph) {
		elem.innerHTML = '<canvas width="' + canvasWidth + '" height="' + canvasHeight + '" style="background: #eee;">';
		canvasContext = $(elem).find('canvas')[0].getContext('2d');
	}

	if (plotGraph) {
		drawLine(canvasContext, canvasWidth, canvasHeight, bounds, 0, minY, 0, maxY, 'blue');
		drawLine(canvasContext, canvasWidth, canvasHeight, bounds, minX, 0, maxX, 0, 'blue');

		(_.isArray(points) ? points : []).forEach(function(pt, idx, thisArr) {
			if (idx === 0) {
				return;
			}
			var pt1 = thisArr[idx - 1];
			var pt2 = thisArr[idx];
			drawLine(canvasContext, canvasWidth, canvasHeight, bounds, pt1.x, pt1.y, pt2.x, pt2.y);
		});

		(_.isArray(points) ? points : []).forEach(function(pt, idx) {
			putText(canvasContext, canvasWidth, canvasHeight, bounds, pt.x, pt.y, idx, 'red');
		});
	}
}

function drawSomething(vmData, elem) {
	var points = vmData.points;
	var angle = Number(vmData.rotationAngle) * Math.PI;
	if (Number.isNaN(angle)) {
		angle = 0;
	}

	var minX = -1;
	var minY = -1;
	var maxX = 1;
	var maxY = 1;
	(_.isArray(points) ? points : []).forEach(function(pt) {
		if (Number.isNaN(Number(pt.x))) {
			pt.x = 2 * Math.random() - 1;
		}
		if (Number.isNaN(Number(pt.y))) {
			pt.y = 2 * Math.random() - 1;
		}
		var x = Number(pt.x);
		var y = Number(pt.y);
		pt.x = x * Math.cos(angle) + y * Math.sin(angle);
		pt.y = -x * Math.sin(angle) + y * Math.cos(angle);

		minX = (pt.x < minX) ? pt.x : minX;
		minY = (pt.y < minY) ? pt.y : minY;
		maxX = (pt.x > maxX) ? pt.x : maxX;
		maxY = (pt.y > maxY) ? pt.y : maxY;
	});

	drawGraph(elem, points, {
		x: [minX, maxX],
		y: [minY, maxY],
	});
}

function drawSomething2(doc, elem) {
	drawGraph(elem, doc.rotatedPoints(doc.rotationAngle), doc.boundsRotatedPoints(doc.rotationAngle));
}

ThreeWay.prepare(Template.ThreeWayGuide_PureSideEffects, {
	collection: GuideData.collection,
	updatersForServer: {
		'points': 'three-way-guide/update/points',
		'points.*.*': 'three-way-guide/update/points.*.*',
		'rotationAngle': 'three-way-guide/update/rotationAngle',
	},
	throttledUpdaters: ['rotationAngle'],
    throttleInterval: 200,
	dataTransformToServer: {
		'points.*.*': x => Number(x),
		'rotationAngle': x => Number(x),
	},
	dataTransformFromServer: {
		'points.*.*': x => x.toString(),    // Yeah... Values are represented
		'rotationAngle': x => x.toString(), // in the browser as text
	},
	preProcessors: {
		// function drawSomething(data, elem) --> render stuff
		drawSomething: drawSomething,
		// function drawSomething2(doc, elem) --> render stuff
		drawSomething2: drawSomething2,
	},
	updateOfFocusedFieldCallback: () => null,
});

Template.ThreeWayGuide_PureSideEffects.onCreated(function() {
	var instance = this;
	instance.subscribe('guide-pub');
});

function getRandomId(instance) {
	if (instance.subscriptionsReady()) {
		var allItems = Tracker.nonreactive(function() {
			return GuideData.collection.find().fetch();
		});
		if (allItems.length === 0) {
			return;
		} else {
			return Fake.fromArray(allItems)._id;
		}
	}
}

Template.ThreeWayGuide_PureSideEffects.onRendered(function() {
	var instance = this;

	instance.autorun(function() {
		var id = getRandomId(instance);
		if (!!id) {
			instance._3w_.setId(id);
		}
	});
});

Template.ThreeWayGuide_PureSideEffects.helpers({
	ready: () => Template.instance().subscriptionsReady(),
});

Template.ThreeWayGuide_PureSideEffects.events({
	'click button': function(event, instance) {
		var id = getRandomId(instance);
		if (!!id) {
			instance._3w_.setId(id);
		}
	}
});
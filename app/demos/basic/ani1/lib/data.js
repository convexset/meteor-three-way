/* global Demo: true */
DEMO_KEY = 'd1';

var myDemo = {};
myDemo.animat3d = [];
myDemo.animat3d[DEMO_KEY] = {
	collection: new Mongo.Collection('animat3d/1/data'),
	tagCollection: new Mongo.Collection('animat3d/1/tags'),
	allColors: [
		'red',
		'orange',
		'yellow',
		'olive',
		'green',
		'teal',
		'blue',
		'violet',
		'purple',
		'pink',
		'brown',
		'grey',
		'black'
	]
};

Demo = _.extend(Demo,myDemo);

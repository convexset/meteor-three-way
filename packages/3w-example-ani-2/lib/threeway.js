/*global Demo:true */
/*global Fake:true */


if (Meteor.isServer) {
	Meteor.startup(function () {
		/*// code to run on server at startup
		var num_items = 10;
		//console.log('startup',DEMO_KEY, Demo );

		Demo.animat3d[DEMO_KEY].tagCollection.remove({});
		Demo.animat3d[DEMO_KEY].allColors.forEach(function(color) {
			Demo.animat3d[DEMO_KEY].tagCollection.insert({
				label: Fake.word(),
				color: color
			});
		});

		Demo.animat3d[DEMO_KEY].collection.remove({});
		_.range(num_items).forEach(function(idx) {
			var user = Fake.user();
			var tags = [];
			Demo.animat3d[DEMO_KEY].tagCollection.find().fetch().forEach(function(tag) {
				if (Math.random() < 0.33) {
					tags.push(tag._id);
				}
			});

			if (tags.length < 1) {
				tags.push(Fake.fromArray(Demo.animat3d[DEMO_KEY].tagCollection.find().fetch())._id);
			}

			var doc = {
				name: user.fullname,
				tags: tags,
			};
			return Demo.animat3d[DEMO_KEY].collection.insert(doc);
		});*/
	});

	// The publication
	/*Meteor.publish('demo-data', function() {
		return Demo.animat3d[DEMO_KEY].collection.find({});
	});
	Meteor.publish('demo-tags', function() {
		return Demo.animat3d[DEMO_KEY].tagCollection.find({}, {sort:{label:1}});
	});*/

	Meteor.methods(/*{
		'animat3d/1/update-name': function(id, value) {
			var updater = {};
			updater['name'] = value;

			return Demo.animat3d[DEMO_KEY].collection.update(id, {
				$set: updater
			});
		}
	}*/);
}

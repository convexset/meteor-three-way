/* global Fake: true */
/* global GuideData: true */
/* global getRandomId: true */

getRandomId = function getRandomId(instance) {
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
};
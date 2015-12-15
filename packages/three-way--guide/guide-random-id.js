/* global Fake: true */
/* global GuideData: true */
/* global getRandomId: true */
/* global lastRandomlySelectedDocument: true */

getRandomId = function getRandomId(instance) {
	if (instance.subscriptionsReady()) {
		var allItems = Tracker.nonreactive(function() {
			return GuideData.collection.find().fetch();
		});
		if (allItems.length === 0) {
			return;
		} else {
			var _id = Fake.fromArray(allItems)._id;
			return _id;
		}
	}
};
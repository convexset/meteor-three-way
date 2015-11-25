/*global Demo:true */
/*global ThreeWay:true */

if (Meteor.isClient) {
	var subTags = Meteor.subscribe('demo-tags');

	Template.TagsManager.onCreated(function() {
	});

	Template.TagsManager.onRendered(function() {
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

	Template.TagsManager.helpers({
		ready: () => subTags.ready(),
		data: () => Demo.animat3d[DEMO_KEY].tagCollection.find().fetch().sort(
			function (a, b) {
				return a.label.toLowerCase().localeCompare(b.label.toLowerCase());
			}
		),
		allColors: function () {
			var options = Demo.animat3d[DEMO_KEY].allColors.map(x => x);
			options.unshift('None');
			return options;
		}
	});

	var selectCreated = false;
	Template.TagsManager.events({
	});

	ThreeWay.prepare(Template.TagsManager, {
		// The relevant Mongo.Collection
		collection: Demo.animat3d[DEMO_KEY].tagCollection,

		// Meteor methods for updating the database
		// The keys being the respective fields/field selectors for the database
		// The method signature for these methods being
		// function(_id, value, ...wildCardParams)
		updatersForServer: {
		},

		// Inject default values if not in database record
//		injectDefaultValues: {
//			label: 'Untitled Tag'
//		},

		// Transformations from the server to the view model
		// In this example, "tags" are stored in the view model as a comma
		// separated list in a string, while it is stored in the server as
		// an array
		dataTransformToServer: {
			tags: ThreeWay.transformations.arrayFromCommaDelimitedString,
		},

		// Transformations from the view model to the server
		// (Transform and call the updater Meteor method)
		// In this example, "tags" are stored in the view model as a comma
		// separated list in a string, while it is stored in the server as
		// an array
		dataTransformFromServer: {
			tags: ThreeWay.transformations.arrayToCommaDelimitedString,
		},

		// Validators under validatorsVM consider view-model data
		// Useful for making sure that transformations to server values do not fail
		// Arguments: (value, vmData, wildCardParams)
		validatorsVM: {

		},

		// Validators under validatorsServer consider transformed values
		// (no additional view-model data, work with that somewhere else)
		// Arguments: (value, wildCardParams)
		validatorsServer: {
//			tags: {
//				validator: function(value) {
//					return true;//value.filter(x => x.substr(0, 3).toLowerCase() !== 'tag').length === 0;
//				},
//				success: function(template, value, vmData, field, params) {
//					console.info('[Validated!] tags:', value, field, params);
//					template._3w_.set('tagsValidationErrorText', '');
//				},
//				failure: function(template, value, vmData, field, params) {
//					console.warn('[Validation Failed] tags:', value, field, params);
//					template._3w_.set('tagsValidationErrorText', 'Each tag should begin with \"tag\".');
//				},
//			}
		},

		// Helper functions that may be used as input for display-type bindings
		// Order of search: three-way helpers, then template helpers, then data
		// Called with this bound to template instance
		// (be aware that arrow functions are lexically scoped)
		helpers: {
			showMsg: function () {
				return !!this._3w_.get('msg_content');
			}
		},

		// Pre-processors for data pre-render (view model to view)
		preProcessors: {
			// this takes a string of comma separated tags, splits, trims then
			// joins them to make the result "more presentable"
			tagsTextDisplay: x => (!x) ? "" : x.split(',').map(x => x.trim()).join(', ')
		},

//		// (Global) initial values for fields that feature only in the local view
		viewModelToViewOnly: {
			'label': '',
			'color': '',
			msg_type: 'warning',
			msg_header: 'This is the header',
			msg_content: '',
			canSaveTag: true
			//"tagsValidationErrorText": ""
		},

		eventHandlers: {
			addTag: function (event, instance, value) {
				var updateMsg = function (msg) {
					instance._3w_.set('msg_header',msg.header);
					instance._3w_.set('msg_content',msg.content);
				};
				Meteor.call('animat3d/1/addTag', value.label, value.color, function (error, result){
					var msg = {
						header: '',
						content: ''
					};
					if (error) {
						msg = {
							header: 'An error has happened: ',
							content: error.reason
						};
						console.log(msg.header, msg.content);
						updateMsg(msg);
					} else {
						msg = {
							header: 'Succesfully added: ',
							content: value.label
						};
						console.log(msg.header, msg.content);
						updateMsg(msg);
						instance._3w_.resetVMOnlyData();
					}
				});
			},
			closeMsg: function (event, instance) {
				instance._3w_.set('msg_header','');
				instance._3w_.set('msg_content','');
			}
		}
	});
}

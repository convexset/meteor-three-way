/*global Demo:true */
/*global ThreeWay:true */

if (Meteor.isClient) {
	var sub = Meteor.subscribe('demo-data');
	var subTags = Meteor.subscribe('demo-tags');

	Template.UsersTable.onCreated(function() {
	});

	Template.UsersTable.onRendered(function() {
		TEMPLATE_USERSTABLE = Template.instance();
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

	Template.UsersTable.helpers({
		ready: () => sub.ready(),
		data: () => Demo.animat3d[DEMO_KEY].collection.find(),
		allTags: () => Demo.animat3d[DEMO_KEY].tagCollection.find().fetch().sort(
			function (a, b) {
				return a.label.toLowerCase().localeCompare(b.label.toLowerCase());
			}
		),
		getTags: function (tags) {
			var output = _.map(tags, function (tag) {
				return Demo.animat3d[DEMO_KEY].tagCollection.findOne(tag);
			});
			return output.sort(
				function (a, b) {
					return a.label.toLowerCase().localeCompare(b.label.toLowerCase());
				}
			);
		},
	});

	var selectCreated = false;

	ThreeWay.prepare(Template.UsersTable, {
		// The relevant Mongo.Collection
		collection: Demo.animat3d[DEMO_KEY].collection,

		// Meteor methods for updating the database
		// The keys being the respective fields/field selectors for the database
		// The method signature for these methods being
		// function(_id, value, ...wildCardParams)
		updatersForServer: {
			'name': function(id, value) {
//				console.info('[update-name] Updating name of id ', id, "to", value);
				Meteor.call('animat3d/1/update-name', id, value);
			},
			'tags': function(id, value) {
//				console.info('[update-tags] Updating tags of id ', id, "to", value);
				Meteor.call('animat3d/1/update-tags', id, value);
			}
		},

		// Inject default values if not in database record
//		injectDefaultValues: {
//			name: 'Unnamed Person'
//		},

		// Transformations from the server to the view model
		// In this example, "tags" are stored in the view model as a comma
		// separated list in a string, while it is stored in the server as
		// an array
		dataTransformToServer: {
			tags: function(value, vmData) {
//				console.log('value',value);
//				console.log('vmData',vmData);
				var output = (!!value) && value.split(',') || [];
//				console.log('output', output);
				return output;
			}
		},

		// Transformations from the view model to the server
		// (Transform and call the updater Meteor method)
		// In this example, "tags" are stored in the view model as a comma
		// separated list in a string, while it is stored in the server as
		// an array
		dataTransformFromServer: {
			tags: function(arr, doc) {
//				console.log('arr and doc',arr,doc);
				var output = arr.join(',');
//				console.log('output',output);
				return output;
			}
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
		},

		// Helper functions that may be used as input for display-type bindings
		// Order of search: three-way helpers, then template helpers, then data
		// Called with this bound to template instance
		// (be aware that arrow functions are lexically scoped)
		helpers: {
			modalWindowHelper: function () {
				var name = Template.instance()._3w_.get('name');

				return [{
					'_id': Template.instance()._3w_.getId(),
					'header': 'Delete user ' + name + '?',
					'content': '<p>You are about to <strong>delete</strong> a wonderful user! Are you sure you want to delete?</p>',
					'textOk': 'Confirm',
					'textCancel': 'Cancel',
					'templateName': 'WhatName',
					'templateData': {
						kitty: 'Cathy',
						hello: 'howdy?'
					}
				}];
			}
		},

		// Pre-processors for data pre-render (view model to view)
		preProcessors: {
			// this takes a string of comma separated tags, splits, trims then
			// joins them to make the result "more presentable"
			tagsTextDisplay: x => x,//x => (!x) ? "" : x.split(',').map(x => x.trim()).join(', '),
			trueIfNonEmpty: x => (!!x) && x.length > 0,
			grayIfTrue: x => (!!x) ? "#ccc" : "",
			redIfTrue: x => (!!x) ? "red" : ""
		},

		// (Global) initial values for fields that feature only in the local view
		// model and are not used to update the database
		// Will be overridden by value tags in the rendered template of the form:
		// <data field="additional" initial-value="view model to view only"></data>
		viewModelToViewOnly: {
			"tagsValidationErrorText": ""
		},

		eventHandlers: {
			selectUser: function(event, template) {
				var id = event.target.getAttribute('id').split('-')[1];
				console.info('Setting ID to: ' + id);

				// Set time out to allow the effects of setting num to 1 to set in
				// so the additional elements are only rendered later
				setTimeout(function() {
					template._3w_.setId(id);

					setTimeout(function() {
						$('html, body').animate({
							scrollTop: Math.max(0, $("#edit-head").offset().top - 120)
						}, 500);
					}, 50);
				}, 50);
			},
			deleteUser: function (event, instance, value) {
				$('.ui.modal').modal({
					closable  : false,
					onDeny    : function(){
//						window.alert('Wait not yet!');
						return true;
					},
					onApprove : function() {
//						window.alert('Approved!');
						console.log('id',instance._3w_.getId());
//						console.log('the name', instance._3w_.childDataGet('myName', 'modalChild'));
						console.log('the descendants', instance._3w_.getAllDescendants_NR());
						var myWhatName = _.filter(instance._3w_.getAllDescendants_NR(), function (child) {
							return child.templateType === "Template.WhatName";
						});
						console.log('the descendants', myWhatName);
						console.log('the name', myWhatName[0].instance._3w_.get('myName'));
						/*var updateMsg = function (msg) {
							instance._3w_.set('msg_header',msg.header);
							instance._3w_.set('msg_content',msg.content);
						};
						Meteor.call('animat3d/1/deleteUser', instance._3w_.getId(), function (error, result){
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
									header: 'Succesfully deleted: ',
									content: value
								};
								console.log(msg.header, msg.content);
//								instance._3w_.setId('');
								updateMsg(msg);
							}
						});*/
					}
				})
				.modal('show');
				/**/
			}
		}
	});
}

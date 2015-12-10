/*global Demo:true */
/*global ThreeWay:true */
/*global Meteor:true */
/*global Template:true */
/*global $:true */
/*global _:true */

if (Meteor.isClient) {

	Template.Ani_ModalShowCase.onDestroyed(function() {
		// NOTE: Need to call remove on destroy to prevent keep adding modal windows when you navigate away from the page and come back
		// Visiting different pages which each have their modal window will just add to the stack of modal windows
		$('.ui.modal').remove();
	});

	ThreeWay.prepare(Template.Ani_ModalShowCase, {

		// Meteor methods for updating the database
		// The keys being the respective fields/field selectors for the database
		// The method signature for these methods being
		// function(_id, value, ...wildCardParams)
		updatersForServer: {
		},

		// Inject default values if not in database record
		injectDefaultValues: {
		},

		// Transformations from the server to the view model
		// In this example, "tags" are stored in the view model as a comma
		// separated list in a string, while it is stored in the server as
		// an array
		dataTransformToServer: {
		},

		// Transformations from the view model to the server
		// (Transform and call the updater Meteor method)
		// In this example, "tags" are stored in the view model as a comma
		// separated list in a string, while it is stored in the server as
		// an array
		dataTransformFromServer: {
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
				var modal = [{
					'_id': Template.instance()._3w_.getId(),
					// Header to be shown in the modal
					'header': 'What is your name?',
					// HTML content shown in the modal
					'content': '',
					// Text shown on the yes/approve/confirm/ok button
					'textOk': 'Confirm',
					// Text shown on the no/deny/decline/cancel button
					'textCancel': 'Cancel',
					// Template to be used as dynamic template (optional)
					'templateName': 'Ani_WhatName',
					// Data passed to the template
					'templateData': {
						kitty: 'Cathy',
						hello: 'howdy?'
					}
				}];
				return modal;
			}
		},

		// Pre-processors for data pre-render (view model to view)
		preProcessors: {
		},

		// (Global) initial values for fields that feature only in the local view
		// model and are not used to update the database
		// Will be overridden by value tags in the rendered template of the form:
		// <data field="additional" initial-value="view model to view only"></data>
		viewModelToViewOnly: {
		},

		eventHandlers: {
			showModal: function (event, instance, value) {
				$('.ui.modal').modal({
					closable  : false,
					onDeny    : function(){
						return true;
					},
					onApprove : function() {
						var myWhatName = _.filter(instance._3w_.getAllDescendants_NR(), function (child) {
							return child.templateType === "Template.Ani_WhatName";
						});

						instance._3w_.set('modal_name',myWhatName[0].instance._3w_.get('myName'));
					}
				})
				.modal('show');
			}
		}
	});
}

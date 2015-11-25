/*Template._Modal.onCreated(function () {
	console.log('creating ');
});

Template._Modal.onRendered(function () {
	console.log('rendering ',Template.instance()._3w_.get3wInstanceId());
});

Template._Modal.onDestroyed(function () {
	console.log('destroying ',Template.instance()._3w_.get3wInstanceId());
});*/
/*Template.__dynamicWithDataContext.onRendered(function () {
	TEMPLATE_DYNAMO = Template.instance();
	console.log('rendering ',Template.instance());
});*/
//ThreeWay.prepare(Template.__dynamicWithDataContext, {});

ThreeWay.prepare(Template._Modal, {
//	collection: null,
	viewModelToViewOnly: {
		'header': 'heyhey header is here!',
		'content': 'heyhey content is here!',
		'textOk': 'Okey Dokey',
		'textCancel': 'Nopey Dopey',
		'templateName': '',
		'templateData': {}
	},

	helpers: {
		hasDynamicTemplate: function () {
					TEMPLATE_MODAL = Template.instance();

			var hasTemplate = !!Template.instance()._3w_.get('templateName');
//			console.log('template',Template.instance()._3w_.get('templateName'));
//			console.log('hasTemplate',hasTemplate);
			return hasTemplate;
		},
		tName: function () {
			// returns the instance data as a helper
			return Template.instance()._3w_.get('templateName');
		},
		tData: function () {
			// returns the instance data as a helper
			return Template.instance()._3w_.get('templateData');
		}
	}
});

ThreeWay.prepare(Template.WhatName, {
//	collection: null,
	/*viewModelToViewOnly: {
		'myName': ''
	},*/

	helpers: {
		myName: function () {
					TEMPLATE_WHATNAME = Template.instance();

			// returns the instance data as a helper
			return Template.instance()._3w_.get('myName');
		}
	}
});

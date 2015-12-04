/*global ThreeWay:true */
/*global Template:true */

ThreeWay.prepare(Template._Modal, {
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
			//TEMPLATE_MODAL = Template.instance();
			var hasTemplate = !!Template.instance()._3w_.get('templateName');
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

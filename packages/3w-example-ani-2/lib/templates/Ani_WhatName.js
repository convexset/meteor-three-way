/*global ThreeWay:true */
/*global Template:true */

ThreeWay.prepare(Template.Ani_WhatName, {
	helpers: {
		myName: function () {
			// returns the instance data as a helper
			return Template.instance()._3w_.get('myName');
		}
	}
});

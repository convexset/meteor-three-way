/*global Template:true */
/*global Tinytest:true */

Tinytest.add('Is the Demo_Ani_2 template available on the client?', function( test ) {
	test.notEqual( typeof Template.Demo_Ani_2, "undefined" );
});
Tinytest.add('Is the Ani_ModalShowCase template available on the client?', function( test ) {
	test.notEqual( typeof Template.Ani_ModalShowCase, "undefined" );
});
Tinytest.add('Is the Ani_WhatName template available on the client?', function( test ) {
	test.notEqual( typeof Template.Ani_WhatName, "undefined" );
});

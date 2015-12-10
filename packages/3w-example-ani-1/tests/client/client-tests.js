/*global Template:true */
/*global Tinytest:true */

Tinytest.add('Is the Demo_Ani_1 template available on the client?', function( test ) {
	test.notEqual( typeof Template.Demo_Ani_1, "undefined" );
});
Tinytest.add('Is the TagsManager template available on the client?', function( test ) {
	test.notEqual( typeof Template.TagsManager, "undefined" );
});
Tinytest.add('Is the UsersTable template available on the client?', function( test ) {
	test.notEqual( typeof Template.UsersTable, "undefined" );
});

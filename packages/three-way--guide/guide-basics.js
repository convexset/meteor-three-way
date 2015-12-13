/* global ThreeWay: true */

ThreeWay.prepare(Template.ThreeWayGuide_BasicsVMOnly);

Template.ThreeWayGuide_BasicsVMOnly.onRendered(function() {
    var instance = this;
    // initialize
    instance._3w_.set('name', 'Some Name');
    instance._3w_.set('checkedValue', []);
    instance._3w_.set('radioValue', '');
    instance._3w_.set('sliderValue', 0);
});
/* global ThreeWay: true */

ThreeWay.prepare(Template.ThreeWayGuide_BasicsVMOnly);

Template.ThreeWayGuide_BasicsVMOnly.onRendered(function() {
    var instance = this;
    // initialize
    instance._3w_.set('name', 'Some Name');
    instance._3w_.set('checkedValue', []);
    instance._3w_.set('isCheckedValue', {
        check1: true,
        check2: false,
        radio1: false,
        radio2: true,
    });
    instance._3w_.set('radioValue', '');
    instance._3w_.set('sliderValue', 0);
    instance._3w_.set('month', new Date());
    instance._3w_.set('date', new Date());
    instance._3w_.set('dateTime', new Date());
});
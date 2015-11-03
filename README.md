# ThreeWay

`ThreeWay` is a Meteor package that provides three-way data-binding. In particular, database to view model to view.

Database to view model connectivity is provided by Meteor methods with signatures `function(id, value)`, with "interface transforms" for server-to-client and client-to-server. Actually, it is richer than that. One may configure fields for data-binding with wild cards and send the data back with meteor methods with signature `function(id, value, param1, param2, ...)`. 
The user is responsible for ensuring the right subscriptions are in place so `ThreeWay` can retrieve records from the local database cache.

The data binding responds to changes in the DOM. So Blaze can be used to generate and change data bindings.

Presentation of data is facilitated by "pre-processors" which map values (display-only bindings) and may do DOM manipulation when needed (e.g.: with [Semantic UI dropdowns](http://semantic-ui.com/modules/dropdown.html)). This feature allows for great flexibility in displaying data, enabling one to "easily" (and typically declaratively) translate data to display.

**The package works fine, but the whole code base is remains fairly young as of this commit. Have a look below and at the example (clone the repository and run meteor) to see how simple and flexible it is to use.**

## Table of Contents

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->


- [Install](#install)
- [The Example](#the-example)
- [Usage](#usage)
    - [Basic Set Up](#basic-set-up)
    - ["Intermediate-level" Set Up](#intermediate-level-set-up)
    - [Set Up: The Full Parameter Set](#set-up-the-full-parameter-set)
- [Documentation](#documentation)
    - [Referring to Fields in Documents](#referring-to-fields-in-documents)
    - [Dynamic Data-Binding](#dynamic-data-binding)
        - [Using Dynamic Data Bindings with Multiple `ThreeWay` instances](#using-dynamic-data-bindings-with-multiple-threeway-instances)
    - [Updaters to the Server](#updaters-to-the-server)
    - [Transforms: Translation from/to Database to/from View Model](#transforms-translation-fromto-database-tofrom-view-model)
    - [Binding to the View](#binding-to-the-view)
        - [Binding: `html`](#binding-html)
        - [Binding: `value`](#binding-value)
        - [Binding: `checked`](#binding-checked)
        - [Bindings: `visible` and `disabled` (modern necessities)](#bindings-visible-and-disabled-modern-necessities)
        - [Style, Attribute and Class Bindings](#style-attribute-and-class-bindings)
    - [Helpers, Template Helpers and Binding](#helpers-template-helpers-and-binding)
        - [Multi-variable Display Bindings](#multi-variable-display-bindings)
    - [Event Bindings](#event-bindings)
    - [View Model to View Only Elements](#view-model-to-view-only-elements)
    - [Instance Methods](#instance-methods)
        - [Organizing the DOM](#organizing-the-dom)
        - [My Data](#my-data)
        - [Ancestor Data](#ancestor-data)
        - [Descendant Data](#descendant-data)
        - [Sibling Data](#sibling-data)
    - [Additional Template Helpers](#additional-template-helpers)
    - [Pre-processor Pipelines](#pre-processor-pipelines)
    - ["Family Access": Ancestor and Descendant Data](#family-access-ancestor-and-descendant-data)
    - [Debug](#debug)
- [Notes](#notes)
    - [Database Updates and Observer Callbacks](#database-updates-and-observer-callbacks)
    - [Dynamic Data Binding](#dynamic-data-binding)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Install

This is available as [`convexset:three-way`](https://atmospherejs.com/convexset/three-way) on [Atmosphere](https://atmospherejs.com/). (Install with `meteor add convexset:three-way`.)

## The Example

A example is provided.
It requires [`semantic:ui`](https://atmospherejs.com/semantic/ui) for the multi-select dropdown. Start Meteor, do a trivial edit of `client/lib/semantic-ui/custom.semantic.json`, and save it to generate [Semantic UI](semantic-ui.com).

It provides a view of the database via an `#each` block iterating over a cursor

## Usage

Here are some an example set-ups. Some of this will be clear immediately, the rest will become clear soon.

#### Basic Set Up

Here are some an example set-ups. Some of this will be clear immediately, the rest will become clear soon.

Let's start with a simple vanilla set-up.

```javascript
ThreeWay.prepare(Template.DemoThreeWay, {
    // The relevant Mongo.Collection
    collection: DataCollection,

    // Meteor methods for updating the database
    // The keys being the respective fields/field selectors for the database
    // The method signature for these methods being
    // function(_id, value, ...wildCardParams)
    updatersForServer: {
        'name': 'update-name',
        'tags': 'update-tags',
    },

    // (Global) initial values for fields that feature only in the local view model
    // and are not used to update the database
    viewModelToViewOnly: {
        "vmOnlyValue": "",
    },
});
```

One then proceeds to bind input and display elements like so:
```html
<ul>
    <li>Name: <input type="text" data-bind="value: name"></li>
    <li>Name in View Model: <span data-bind="html: name"></span></li>
    <li>vmOnlyValue: <input type="text" data-bind="value: vmOnlyValue"></li>
    <li>vmOnlyValue in View Model: <span data-bind="html: vmOnlyValue"></span></li>
</ul>
```

Once ready to bind to a document with id `_id` in the database on a template instance `instance`, simply call:

```javascript
instance._3w_setId(_id);
```

... and things will happen.

#### "Intermediate-level" Set Up

Now here are more of the settings, including:
 - data transformations from view model to server and from server to view model
 - helper functions that "display"-type (one-way) bindings like `html`, `visible` and `disabled`, as well as the `class`, `style` and `attr` bindings can use for input
 - pre-processors for values in "input" elements and for "display" elements

```javascript
ThreeWay.prepare(Template.DemoThreeWay, {
    // The relevant Mongo.Collection
    collection: DataCollection,

    // Meteor methods for updating the database
    // The keys being the respective fields/field selectors for the database
    // The method signature for these methods being
    // function(_id, value, ...wildCardParams)
    updatersForServer: {
        'name': 'update-name',
        'emailPrefs': 'update-emailPrefs',
        'personal.particulars.age': 'update-age',
        'tags': 'update-tags',
        'personal.someArr.*': 'update-some-arr',
        'personal.someArr.1': 'update-some-arr-1',  // More specific than the previous, will be selected
        'personal.otherArr.*.*': 'update-other-arr',
    },

    // Transformations from the server to the view model
    // In this example, "tags" are stored in the view model as a comma
    // separated list in a string, while it is stored in the server as
    // an array
    dataTransformToServer: {
        tags: x => x.split(',').map(y => y.trim())
    },

    // Transformations from the view model to the server
    // (Transform and call the updater Meteor method)
    // In this example, "tags" are stored in the view model as a comma
    // separated list in a string, while it is stored in the server as
    // an array
    dataTransformFromServer: {
        tags: arr => arr.join && arr.join(',') || ""
    },

    // Pre-processors for data pre-render (view model to view)
    preProcessors: {
        // this takes a string of comma separated tags, splits, trims then
        // joins them to make the result "more presentable"
        tagsTextDisplay: x => (!x) ? "" : x.split(',').map(x => x.trim()).join(', '),

        // this maps a key to the corresponding long form description
        mapToAgeDisplay: x => ageRanges[x],

        // this maps an array of keys to the corresponding long form
        // descriptions and then joins them
        // emailPrefsAll is of the form {"1_12": "1 to 12", ...})
        mapToEmailPrefs: prefs => prefs.map(x => emailPrefsAll[x]).join(", "),

        // This is something "special" to make the Semantic UI Dropdown work
        // (There's some DOM manipulation in the method)
        // More helpers will be written soon...
        updateSemanticUIDropdown: ThreeWay.processors.updateSemanticUIDropdown,

        // These processors support visual feedback for validation
        // e.g.: the red "Invalid e-mail address" text that appears when
        // an invalid e-mail address has been entered
        trueIfNonEmpty: x => x.length > 0,
        grayIfTrue: x => (!!x) ? "#ccc" : "",
        redIfTrue: x => (!!x) ? "red" : "",
    },

    // (Global) initial values for fields that feature only in the local view
    // model and are not used to update the database
    // Will be overridden by value tags in the rendered template of the form:
    // <data field="sliderValue" initial-value="50"></data>
    viewModelToViewOnly: {
        sliderValue: "0",
        "tagsValidationErrorText": "",
    },
});
```

#### Set Up: The Full Parameter Set

At this point, one might have a look at the full parameter set. Which will include:
 - data validation
 - event bindings
 - database update settings

Further elaboration is available in the documentation below.

```javascript
ThreeWay.prepare(Template.DemoThreeWay, {
    // The relevant Mongo.Collection
    collection: DataCollection,

    // Meteor methods for updating the database
    // The keys being the respective fields/field selectors for the database
    // The method signature for these methods being
    // function(_id, value, ...wildCardParams)
    updatersForServer: {
        'name': 'update-name',
        'emailPrefs': 'update-emailPrefs',
        'personal.particulars.age': 'update-age',
        'tags': 'update-tags',
        'personal.someArr.*': 'update-some-arr',
        'personal.someArr.1': 'update-some-arr-1',  // More specific than the previous, will be selected
        'personal.otherArr.*.*': 'update-other-arr',
    },

    // Transformations from the server to the view model
    // In this example, "tags" are stored in the view model as a comma
    // separated list in a string, while it is stored in the server as
    // an array
    dataTransformToServer: {
        tags: x => x.split(',').map(y => y.trim())
    },

    // Transformations from the view model to the server
    // (Transform and call the updater Meteor method)
    // In this example, "tags" are stored in the view model as a comma
    // separated list in a string, while it is stored in the server as
    // an array
    dataTransformFromServer: {
        tags: arr => arr.join && arr.join(',') || ""
    },

    // Validators under validatorsVM consider view-model data
    // Useful for making sure that transformations to server values do not fail
    // Arguments: (value, vmData, wildCardParams)
    validatorsVM: {
        // tags seems to be a decent candidate for one here
    },

    // Validators under validatorsServer consider transformed values
    // (no additional view-model data, work with that somewhere else)
    // Arguments: (value, wildCardParams)
    validatorsServer: {
        tags: function(value) {
            // tags must begin with "tag"
            return value.filter(x => x.substr(0, 3).toLowerCase() !== 'tag').length === 0;
        },
    },

    // Success callbacks for validators
    validateSuccessCallback: {
        'tags': function(template, value, vmData, field, params) {
            console.info('[Validated!] tags:', value, field, params);
            template._3w_set('tagsValidationErrorText', '');
        },
    },

    // Failure callbacks for validators
    validateFailureCallback: {
        'tags': function(template, value, vmData, field, params) {
            console.warn('[Validation Failed] tags:', value, field, params);
            template._3w_set('tagsValidationErrorText', 'Each tag should begin with \"tag\".');
        },
    },

    // Helper functions that may be used as input for display-type bindings
    // Order of search: three-way helpers, then template helpers, then data
    // Called with this bound to template instance
    // (be aware that arrow functions are lexically scoped)
    helpers: {
        altGetId: function() {
            return this._3w_getId()
        }
    }

    // Pre-processors for data pre-render (view model to view)
    preProcessors: {
        // this takes a string of comma separated tags, splits, trims then
        // joins them to make the result "more presentable"
        tagsTextDisplay: x => (!x) ? "" : x.split(',').map(x => x.trim()).join(', '),

        // this maps a key to the corresponding long form description
        mapToAgeDisplay: x => ageRanges[x],

        // this maps an array of keys to the corresponding long form
        // descriptions and then joins them
        // emailPrefsAll is of the form {"1_12": "1 to 12", ...})
        mapToEmailPrefs: prefs => prefs.map(x => emailPrefsAll[x]).join(", "),

        // This is something "special" to make the Semantic UI Dropdown work
        // (There's some DOM manipulation in the method)
        // More helpers will be written soon...
        updateSemanticUIDropdown: ThreeWay.processors.updateSemanticUIDropdown,

        // These processors support visual feedback for validation
        // e.g.: the red "Invalid e-mail address" text that appears when
        // an invalid e-mail address has been entered
        trueIfNonEmpty: x => x.length > 0,
        grayIfTrue: x => (!!x) ? "#ccc" : "",
        redIfTrue: x => (!!x) ? "red" : "",
    },

    // (Global) initial values for fields that feature only in the local view
    // model and are not used to update the database
    // Will be overridden by value tags in the rendered template of the form:
    // <data field="sliderValue" initial-value="50"></data>
    viewModelToViewOnly: {
        sliderValue: "0",
        "tagsValidationErrorText": "",
    },

    // Event Handlers bound like
    // <input data-bind="value: sliderValue; event: {mousedown: dragStartHandler, mouseup: dragEndHandler|saySomethingHappy}" type="range">
    eventHandlers: {
        dragStartHandler: function(event, template, vmData) {
            console.info("Drag Start at " + (new Date()), event, template, vmData);
        },
        dragEndHandler: function(event, template, vmData) {
            console.info("Drag End at " + (new Date()), event, template, vmData);
        },
        saySomethingHappy: function() {
            console.info("Let\'s chill. (Second mouseup event to fire.)");
        },
    },

    // Database Update Parameters
    // "Debounce Interval" for Meteor calls; See: http://underscorejs.org/#debounce
    debounceInterval: 300, // default: 500
    // "Throttle Interval" for Meteor calls; See: http://underscorejs.org/#throttle ; fields used for below...
    throttleInterval: 500, // default: 500
    // Fields for which updaters are throttle'd instead of debounce'ed
    throttledUpdaters: ['emailPrefs', 'personal.particulars.age'],
    // Interval between update Meteor methods on fields with the same top level parent (e.g.: `particulars.name` and `particulars.hobbies.4.hobbyId`).
    methodInterval: 50,
});
```

## Documentation

#### Referring to Fields in Documents

Consider the following Mongo document. The relevant fields may be referred to with the identifiers in the comments:

```javascript
{
    topLevelField: 'xxx',  // "topLevelField"
    topLevelArray: [  // "topLevelArray"
        'a',  // "topLevelArray.0"
        'b',  // "topLevelArray.1"
        'c',  // "topLevelArray.2"
    ],
    topLevelObject: {  // "topLevelObject"
        nestedField: 'xxx',  // "topLevelObject.nestedField"
        nestedArray: [  // "topLevelObject.nestedArray"
            1,  // "topLevelObject.nestedArray.0"
            2,  // "topLevelObject.nestedArray.1"
            3,  // "topLevelObject.nestedArray.2"
        ],
    }
}
```

Here is an example of binding to one of them: `<span data-bind="value: topLevelObject.nestedArray.2"></span>`.

However, it would be clunky to have to specify each of `"topLevelObject.nestedArray.0"` thru `"topLevelObject.nestedArray.2"` (or more) in the set-up options. Therefore, `options.updatersForServer` accepts wildcards (in key names) such as `topLevelObject.nestedArray.*` where `*` matches numbers (for arrays) and "names" (for objects; but of course, it's all objects anyway).

Note that in the case of multiple matches, the most specific match will be used, enabling "catch-all" updaters (which can be somewhat dangerous if not managed properly).

#### Dynamic Data-Binding

The data binding responds to changes in the DOM. So Blaze can be used to generate and change data bindings. For example:

```html
{{#each fields}}
    <div>{{name}}: <input data-bind="value: particulars.{{field}}"></div>
{{/each}}
```

... might generate...

```html
<div>Name: <input data-bind="value: particulars.name"></div>
<div>e-mail: <input data-bind="value: particulars.email"></div>
<div>D.O.B.: <input data-bind="value: particulars.dob"></div>
```

... and should a new field be added, data binding will take effect.

###### Using Dynamic Data Bindings with Multiple `ThreeWay` instances

Dynamic data binding works without a hitch (hopefully) when a template is operating in a vacuum. Multiple `ThreeWay` instances (See: ["Family Access": Ancestor and Descendant Data](#family-access-ancestor-and-descendant-data) for more information) work fine in the absence of dynamic data binding. But when DOM elements (to be data bound) are being added and removed dynamically, it is important to create certainty about which `ThreeWay` instance a given DOM element should be bound to.

Briefly, the start of the template life cycle for a template and a child template is as follows: (i) parent created, (ii) child created, (iii) child rendered, (iv) parent rendered. Monitoring call backs work on a "first-come-first-bound" basis, with child nodes getting the first pick.

To ensure proper bindings, the `_3w_setRoot(selectorString)` method should be used to select a root node (via a template-level jQuery selector), preferably in an `onRendered` hook. It is advisable for every template to be wrapped in a `div` element with a template specific class. This ensures that exactly one node will be selected by the selector (as required) even if multiple instances of the same template are created. (A design decision was made to not require a root node, but to leave it to the user to handle this matter.)

For more specificity, the `restrict-template-type` attribute can be set (with a comma separated list of template names) on DOM elements to specify which `ThreeWay`-linked template types should be used to data bind individual elements.


#### Updaters to the Server

Data is sent back to the server via Meteor methods. This allows one to control matters like authentication and the like. What they have in common is method signatures taking the `_id` of the document, the updated value next, and a number of additional parameters equal to the number of wildcards in the field specification.

The keys of `options.updatersForServer` are the respective fields (or fields specified through wild cards) for the database. The method signature for these methods is `function(_id, value, ...wildCardParams)`.

In the event that a method is associated with a "wildcard match" field name, such as `"ratings.3.rating"` matched to `"ratings.*.rating"`, then the matching `wildCardParams` will be passed into the method as well. In that example, one would end up with a call like:

```javascript
Meteor.call('update-ratings.*.rating', _id, newValue, "3");
```

(Don't mind the string representation of array indices, it doesn't really matter because Mongo field specifiers are strings.)

Here are more examples:

```javascript
updatersForServer: {
    'x': 'update-x',
    'someArray.*': 'update-someArray.*',
    'anotherArray.*.properties.*': 'update-anotherArray.*.properties.*'
},
```

... which might be associated with the following methods:

```javascript
Meteor.methods({
    'update-x': function(id, value) {
        if (someAuthCheck(this.userId)) {
            DataCollection.update(id, {
                $set: {
                    x: value
                }
            });
        }
    },
    'update-someArray.*': function(id, value, k) {
        var updater = {};
        updater['someArray.' + k] = value;
        DataCollection.update(id, {
            $set: updater
        });
    },
    'update-anotherArray.*.properties.*': function(id, value, k, fld) {
        var updater = {};
        updater['anotherArray.' + k + '.properties.' + fld] = value;
        DataCollection.update(id, {
            $set: updater
        });
    }
});
```

(Also, please don't ask for regular expressions... Do that within your own updaters.)


#### Transforms: Translation from/to Database to/from View Model

The format that data is stored in a database might not be the most convenient for use in the view model (e.g.: sparse representation "at rest"), as such it may be necessary to do some translation between database and view model.

Consider the following example:

```javascript
dataTransformFromServer: {
    tags: arr => arr.join && arr.join(',') || ""
},
dataTransformToServer: {
    tags: x => x.split(',').map(y => y.trim())
},
```

In this example, for some reason, `tags` is stored in the view model as a string-ified comma separated list, while it is stored as an array on the server. When the underlying observer registers a change to the database, the new value is converted and placed into the view model. When the database is to be updated, the view model value is transformed back into an array before it is sent back via the relevant Meteor method.

Note that transformations actually take two parameters, the first being the value in question and the second being all the view model data. Thus the complete method signature is `function(value, vmData)`.


#### Binding to the View

When the template is rendered, the reactive elements are set up using `data-bind` attributes in the "mark up" part of the template. 

###### Binding: `html`

For example, `<span data-bind="html: name"></span>`, binds the "name" field to the `innerHTML` property of the element.

But "pre-processors" can be applied to view model data to process content before it is rendered. For example,

```html
<span data-bind="html: emailPrefs|mapToEmailPrefs"></span>
```

where `mapToAgeDisplay` was described as `x => ageRanges[x]` (or, equivalently, `function(x) {return ageRanges[x];}`) and `ageRanges` is a dictionary (object) mapping keys to descriptions.

Pre-processors actually take up-to three arguments, `(value, elem, vmData)` and return a value to be passed into the next pre-processor, or rendered on the page. This actually features in `ThreeWay.helpers.updateSemanticUIDropdown`, used in the demo, where the element itself has to be manipulated (see: [this](http://semantic-ui.com/modules/dropdown.html)) to achieve the desired result. More on pre-processors later.

###### Binding: `value`

There's nothing much to say about this simple binding...

```html
<input name="name" data-bind="value: name">
```

Works with `input` and `textarea` tags.

###### Binding: `checked`

This one too, although the helper does bear some explaining. `repackageDictionaryAsArray` takes a dictionary (object) and maps it into an array of key-value pairs. That is, an array with elements of the form `{key: "key", value: "value"}`. So the below example lays out the various options as checkboxes and binds `checked` to an array.

```html
{{#each repackageDictionaryAsArray emailPrefsAll}}
    <div class="ui checkbox">
        <input type="checkbox" name="emailPrefs" value="{{key}}" data-bind="checked: emailPrefs">
        <label>{{value}}</label>
    </div>
{{/each}}
```

In the case of radio buttons, `checked` is bound to a string.

```html
<div class="inline fields">
    {{#each repackageDictionaryAsArray ageRanges}}
        <div class="ui radio checkbox">
            <input type="radio" name="age" value="{{key}}" data-bind="checked: age">
            <label>{{value}}</label>
        </div>
    {{/each}}
</div>
```

###### Bindings: `visible` and `disabled` (modern necessities)

`visible` and `disabled` can be bound to any boolean (or truthy) variable, and stuff disappears/gets disabled when it is set to `false` (false-ish).

```html
<div data-bind="visible: something">...</div>
<div data-bind="disabled: something">...</div>
```

###### Style, Attribute and Class Bindings

 Style bindings are done via: `data-bind="style: {font-weight: v1|preProc, font-size: v2|preProc; ...}"`. Things work just like the above html binding.

 Attribute bindings are done via: `data-bind="attr: {disabled: v1|preProc, ...}"`. Things also work just like html bindings.

 Class bindings are done via: `data-bind="class: {class1: bool1|preProc; ...}"`. However, things work more like the visible and disabled bindings in that the values to be bound to will be treated as boolean-ish.

#### Helpers, Template Helpers and Binding

Helper functions may be used as input for display-type bindings.
Such bindings include `html`, `visible`, `disabled`, as well as the `class`, `style` and `attr` bindings.

**For such bindings, the order of search is helpers first, then template helpers, then data.**

Helpers are called with `this` bound to template instance, and `Template.instance()` is also accessible. (Note: Be careful of lexically scoped arrow functions that overrides `call`/`apply`/`bind`.)

Note that one helper, `_3w_haveData`, is automatically added to `options.helpers`

```html
<div data-bind="visible: _3w_haveData">...</div>
<button data-bind="disabled: _3w_haveData">...</button>
```

One might find it to be particularly useful.

A tenuous design decision has been made not to phase out helpers. A less tenuous design decision is to not unify helpers with pre-processors based on their different method signatures.

###### Multi-variable Display Bindings

Sometimes one variable alone is not enough to determine the state of a DOM property. For example, to determine whether a phone number is valid, might depend both on the number and on the country. On the other hand, that example is faulty since a validation callback can do the relevant computations with full access to the view model.

But anyway, usefulness aside, this is one example of such a binding: 
```html
<div data-bind="style: {background-color: colR#colG#colB|makeRGB}">
```

... it is also an example that you might find in the demo. (Look for the bit asking you to some nodes to the DOM via the console.)

#### Event Bindings

Event bindings may be achieved via: `data-bind="event: {change: cbFn, keyup:cbFn2|cbFn3, ...}"` where callbacks like `cbFn1` have signature `function(event, template, vmData)` (`vmData` being, of course, the data in the view model).

The event handlers may be specified in the set up as follows:

```javascript
eventHandlers: {
    dragStartHandler: function(event, template, vmData) {
        console.info("Drag Start at " + (new Date()), event, template, vmData);
    },
    dragEndHandler: function(event, template, vmData) {
        console.info("Drag End at " + (new Date()), event, template, vmData);
    },
    saySomethingHappy: function() {
        console.info("Let\'s chill. (Second mouseup event to fire.)");
    },
},
```

... and bound as follows:

```html
<input data-bind="value: sliderValue; event: {mousedown: dragStartHandler, mouseup: dragEndHandler|saySomethingHappy}" type="range">
```

**Question**: Should these fire before or after the usual `change`-type events? Presently it happens after. (Does it matter? If it does, should it?)

#### View Model to View Only Elements

It is easy to specify fields that are "view model only". They don't even have to be declared in the set up.

```html
<twdata field="additional" initial-value="view model to view only"></twdata>
<div>
    Additional (View Model Only): <input data-bind="value: additional">
</div>
<div>
    Additional: <span data-bind="html: additional"></span>
</div>
```

Note that "view model only" tag-based initializers applied only `onRendered` and that tag-based initializers will overwrite the values in the "Template-level" options (`options.viewModelToViewOnly`).

Note also that tag-based initializers take an optional `processors` attribute, which is a pipe separated string of transformations that are applied sequentially to what is found in the `initial-value` attribute. This is useful for transforming serialized values into objects. For example:

```html
<twdata field="something" initial-value="will become uppercase and then have date appended" processors="toUpperCase|appendTimestamp"></twdata>
```

```javascript
// In the config...
preProcessors: {
    toUpperCase: function(v) {
        return v.toUpperCase();
    },
    appendTimeStamp: function(v) {
        return v + ' (' + (new Date()) + ')';
    },
}
```

See [Pre-processor Pipelines](#pre-processor-pipelines) below for more information. While pre-processors have method signature `function(value, elem, vmData)` where `value` is the value in the view model, `elem` is the bound element, and `vmData` is a dictionary containing all the data from the view model, `{}` is passed in in place of view model data for such initializers.

Due to the nature of jQuery selectors, a selector at a parent template might select such nodes in child templates and inadvertently pollute the local view model one way of dealing with the problem is to add a `restrict-template-type` attribute indicating the names of applicable templates as a comma separated list. Omission makes the initialization applicable to all.

```html
<twdata field="somethingElse" initial-value="value" restrict-template-type="MyTemplate, MyOtherTemplate"></twdata>
```

#### Instance Methods

The following methods are crammed onto each template instance in an `onCreated` hook.

###### Organizing the DOM

 - `_3w_setRoot(selectorString)`: selects the root of the `ThreeWay` instance using a selector string (`Template.instance().$` will be used); child nodes of the single node (the method throws an error if more than one node is matched), present and forthcoming, will be watched for changes (and the respective data bindings updated); See [Using Dynamic Data Bindings with Multiple `ThreeWay` instances](#using-dynamic-data-bindings-with-multiple-threeway-instances) for more information

###### My Data

 - `_3w_getId()`: gets the id of the document bound to

 - `_3w_setId(id)`: sets the id of the document to bind to

 - `_3w_get(prop)`: gets a property

 - `_3w_set(prop, value)`: sets a property

 - `_3w_get_NR(prop)`: gets a property "non-reactively"

 - `_3w_getAll_NR`: gets all the data "non-reactively"

###### Ancestor Data

 - `_3w_parentDataGet(p, levelsUp)`: returns property `p` from parent instance `levelsUp` levels up (default: 1)

 - `_3w_parentDataGetAll(p, levelsUp)`: returns all data from parent instance `levelsUp` levels up (default: 1)

 - `_3w_parentDataSet(p, v, levelsUp)`: sets property `p` on parent instance to `v` `levelsUp` levels up (default: 1)

 - `_3w_parentDataGet_NR(p, levelsUp)`: (non-reactively) returns property `p` from parent instance `levelsUp` levels up (default: 1)

 - `_3w_parentDataGetAll_NR(levelsUp)`: (non-reactively) returns all data from parent instance `levelsUp` levels up (default: 1)

###### Descendant Data

 - `_3w_childDataGetId(childNameArray)`: returns id from descendant instance where `childNameArray` gives a sequential list of successive descendant names (alternatively a string in the special case of a direct child)

 - `_3w_childDataSetId(id, childNameArray)`: sets id from descendant instance where `childNameArray` gives a sequential list of successive descendant names (alternatively a string in the special case of a direct child)

 - `_3w_childDataGet(p, childNameArray)`: returns property `p` from descendant instance where `childNameArray` gives a sequential list of successive descendant names (alternatively a string in the special case of a direct child)

 - `_3w_childDataGetAll(childNameArray)`: returns all data from descendant instance where `childNameArray` gives a sequential list of successive descendant names (alternatively a string in the special case of a direct child)

 - `_3w_childDataSet(p, v, childNameArray)`: sets property `p` from descendant instance where `childNameArray` gives a sequential list of successive descendant names (alternatively a string in the special case of a direct child)

 - `_3w_childDataGet_NR(p, childNameArray)`: (non-reactively) returns property `p` from descendant instance where `childNameArray` gives a sequential list of successive descendant names (alternatively a string in the special case of a direct child)

 - `_3w_childDataGetAll_NR(childNameArray)`: (non-reactively) returns all data from descendant instance where `childNameArray` gives a sequential list of successive descendant names (alternatively a string in the special case of a direct child)

 - `_3w_getAllDescendants_NR(levels)`: (non-reactively) returns all descendant instances and information on them as objects. For example...

```javascript
[
    {
        id: "kiddy",
        instance: [Blaze.TemplateInstance],
        level: 1,
        templateType: "Template.DemoThreeWayChild",
    },
    {
        id: "grandkiddy",
        instance: [Blaze.TemplateInstance],
        level: 2,
        templateType: "Template.DemoThreeWayGrandChild",
    },
]
```

###### Sibling Data

 - `_3w_siblingDataGet(p, siblingName)`: returns property `p` from sibling instance where `siblingName` gives the name of the relevant sibling

 - `_3w_siblingDataGetAll(siblingName)`: returns all data from sibling instance where `siblingName` gives the name of the relevant sibling

 - `_3w_siblingDataSet(p, v, siblingName)`: sets property `p` from sibling instance where `siblingName` gives the name of the relevant sibling

 - `_3w_siblingDataGet_NR(p, siblingName)`: (non-reactively) returns property `p` from sibling instance where `siblingName` gives the name of the relevant sibling

 - `_3w_siblingDataGetAll_NR(siblingName)`: (non-reactively) returns all data from sibling instance where `siblingName` gives the name of the relevant sibling

#### Additional Template Helpers

 - `_3w_id`: returns the `_id` of the document selected (if any)

 - `_3w_haveData`: returns a boolean indicating whether the view model has data yet

 - `_3w_get`: See [previous section](#instance-methods).

 - `_3w_getAll`: See [previous section](#instance-methods).

 - `_3w_parentDataGet`: See [previous section](#instance-methods).

 - `_3w_parentDataGetAll`: See [previous section](#instance-methods).

 - `_3w_childDataGet`: See [previous section](#instance-methods).

 - `_3w_childDataGetAll`: See [previous section](#instance-methods).

 - `_3w_siblingDataGet`: See [previous section](#instance-methods).

 - `_3w_siblingDataGetAll`: See [previous section](#instance-methods).



#### Pre-processor Pipelines

Presentation of data is facilitated by "pre-processors" which map values (display-only bindings) and may do DOM manipulation when needed (e.g.: with [Semantic UI dropdowns](http://semantic-ui.com/modules/dropdown.html)). This feature allows for great flexibility in displaying data, enabling one to "easily" (and typically declaratively) translate data to display.

However, because of the impurity of side-effects is rather directly enabled, in principle, one could use pre-processor side-effects render a [d3.js](http://d3js.org/) diagram responding to changes in data (but for simple charts there are easier ways to do things (e.g.: [this](https://atmospherejs.com/maazalik/highcharts) and [this](https://atmospherejs.com/charts/dc)).

Display (one-directional) bindings like `html` and `visible` (later `class`, `style` and `attr`) use pre-processing pipelines to generate items for display. Consider the following examples:

```javascript
preProcessors: {
    mapToAgeDisplay: x => ageRanges[x],
    toUpperCase: x => x.toUpperCase(),
    alert: function(x) {
        alert(x);
        return x;
    },
    // This is something special to make the Semantic UI Dropdown work
    // More helpers will be written soon...
    updateSemanticUIDropdown: ThreeWay.helpers.updateSemanticUIDropdown
},
```

... a binding like `<span data-bind="html: age|mapToAgeDisplay"></span>` would, if in the view model `age === '13_20'` and `ageRanges['13_20'] === '13 to 20'` display the text "13 to 20".

... and a binding like `<span data-bind="html: age|mapToAgeDisplay|alert|toUpperCase"></span>` would, under the same circumstances, annoy the user with an alert with text "13 to 20" and then display the text "13 TO 20". (Please don't do something like that.)

Multi-way data-bindings such as `value` and `checked` use pre-processing pipelines to deal with DOM manipulation only (e.g.: [Semantic UI dropdowns](http://semantic-ui.com/modules/dropdown.html) via `ThreeWay.helpers.updateSemanticUIDropdown`). Pipeline functions do not manipulate value.

Pre-processors have method signature `function(value, elem, vmData)` where `value` is the value in the view model, `elem` is the bound element, and `vmData` is a dictionary containing all the data from the view model.

**Example Use Case**: Consider an input field with some validator. An invalid value might cause some validation error message to be set to be non-empty, and that change in view model data might trigger various forms of presentation. For example:

```html
<div data-bind="html: tagsValidationErrorText; visible: tagsValidationErrorText|trueIfNonEmpty; style: {color: tagsValidationErrorText|trueIfNonEmpty|redIfTrue}"></div>
```

Pre-processors are called with `this` bound to template instance, and `Template.instance()` is also accessible. (Note: Be careful of lexically scoped arrow functions that overrides `call`/`apply`/`bind`.)


#### "Family Access": Ancestor and Descendant Data

`ThreeWay`-linked template instances can be connected in parent-child relationships. Data can be accessed across template boundaries in the following ways (and more):
 - ancestor (any number of levels up)
 - descendant (any number of levels down; requires knowledge of the relevant template instance identifiers of successive descendants passed into each template as `_3w_name` in data context)
 - sibling (requires knowledge of the relevant template instance identifier passed into template as `_3w_name` in data context)

In principle, as long at the template instance of the "highest-level" ancestor can be acquired, then any connected instance may be straight-forwardly accessed. "Sibling" data-access is syntactic sugar for this.

See [Instance Methods](#instance-methods) for more information.


#### Debug

`ThreeWay.setDebugModeOn()` - Turns on debug mode

`ThreeWay.debugModeSelectAll()` - Show all debug messages (initially none)

`ThreeWay.debugModeSelectNone()` - Reset selection of debug message classes to none

`ThreeWay.debugModeSelect(aspect)` - More granular control of debug messages, debug messages fall into the following classes:
 - `'bindings'`
 - `'data_mirror'`
 - `'observer'`
 - `'tracker'`
 - `'new_id'`
 - `'db'`
 - `'methods'`
 - `'value'`
 - `'checked'`
 - `'html'`
 - `'visible-and-disabled'`
 - `'style'`
 - `'attr'`
 - `'class'`
 - `'event'`
 - `'vm-only'`
 - `'validation'`
 - `'bind'`

## Notes

#### Database Updates and Observer Callbacks

Pre-v0.1.2, there was the issue of a race condition when multiple fields with the same top level field (e.g.: `particulars.name` and `particulars.hobbies.4.hobbyId`) would be updated tens of milliseconds apart. The [observer callbacks](http://docs.meteor.com/#/full/observe_changes) would send entire top level sub-objects even if a single primitive value deep within was updated. It was addressed with (i) queueing implemented via promise chains of Meteor methods grouped by top-level fields plus a delay before next Meteor method being triggered, and (ii) field specific updaters (with individual throttling/debouncing) to avoid inadvertent skipping of updates from sub-fields (due to debounce/throttle effects on a method being used to update multiple sub-fields).

#### Dynamic Data Binding

Pre-v0.1.9, dynamic rebinding was incomplete and carried out by polling the DOM. As of v0.1.9, [Mutation Observers](https://developer.mozilla.org/en/docs/Web/API/MutationObserver) have been used to deal with things in an event-driven manner.

The mixing of dynamic data-binding and the possibility of multiple `ThreeWay` instances poses some challenges with regards to the question of which `ThreeWay` instance a new DOM element should be data bound with.
See the discussion in [Using Dynamic Data Bindings with Multiple `ThreeWay` instances](#using-dynamic-data-bindings-with-multiple-threeway-instances) for more information.
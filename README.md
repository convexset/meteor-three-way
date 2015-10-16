# ThreeWay

A Meteor package that provides three-way data-binding. In particular, database to view model to view.

**The package works fine, but the whole code base is basically a day old as of this commit. Have a look below and at the example (clone the repo and run meteor) to see how simple and flexible it is to use.**

Database to view model connectivity is provided by Meteor methods with signatures `func(id, value)`, with "interface transforms" for server-to-client and client-to-server.

## Install

This is available as [`convexset:three-way`](https://atmospherejs.com/convexset/three-way) on [Atmosphere](https://atmospherejs.com/). (Install with `meteor add convexset:three-way`.)

## Provided Example

A example is provided.
It requires [`semantic:ui`](https://atmospherejs.com/semantic/ui) for the multi-select dropdown. Start Meteor, do a trivial edit of `client/lib/semantic-ui/custom.semantic.json`, and save it to generate [Semantic UI](semantic-ui.com).

## Usage

#### Set Up

Here is the example used in the demo. The idea is to set up the bindings on the template. Some of this will be clear immediately, the rest will become clear soon.

```javascript
ThreeWay.prepare(Template.DemoThreeWay, {
    // The relevant top-level fields in the database
    fields: ['name', 'emailPrefs', 'age', 'tags'],
    // The relevant Mongo.Collection
    collection: DataCollection,
    // Meteor methods for updating the database
    updatersForServer: {
        'name': 'update-name',
        'emailPrefs': 'update-emailPrefs',
        'age': 'update-age',
        'tags': 'update-tags'
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
        mapToEmailPrefs: function(prefs) {
            return prefs.map(x => emailPrefsAll[x]).join(", ");
        },
        // This is something special to make the Semantic UI Dropdown work
        // More helpers will be written soon...
        updateSemanticUIDropdown: ThreeWay.helpers.updateSemanticUIDropdown
    },
    // (Global) initial values for fields that feature only in the local view model
    // Will be overridden by value tags in the rendered template of the form:
    // <data field="additional" initial-value="view model to view only"></data>
    viewModelToViewOnly: {
        "additional": "VM to V Only"
    },
    // "Debounce Interval" for Meteor calls; See: http://underscorejs.org/#debounce
    debounceInterval: 400
});
```

#### Binding to the View

When the template is rendered, the reactive elements are set up using `data-bind` attributes in the "mark up" part of the template. 

###### Binding: `html`

For example, `<span data-bind="html: name"></span>`, binds the "name" field to the `innerHTML` property of the element.

But "pre-processors" can be applied to view model data to process content before it is rendered. For example,

```html
<span data-bind="html: emailPrefs|mapToEmailPrefs"></span>
```

where `mapToAgeDisplay` was described as `x => ageRanges[x]` (or, equivalently, `function(x) {return ageRanges[x];}`) and `ageRanges` is a dictionary (object) mapping keys to descriptions.

Pre-processors actually take two arguments, `(value, elem)` and return a value to be passed into the next pre-processor, or rendered on the page. This actually features in `ThreeWay.helpers.updateSemanticUIDropdown`, used in the demo, where the element itself has to be manipulated (see: [this](http://semantic-ui.com/modules/dropdown.html)) to achieve the desired result.

###### Binding: `value`

There's nothing much to say about this simple binding...

```html
<input name="name" style="border: 0; width: 100%;" data-bind="value: name">
```

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

###### Binding: `visible` (A modern necessity)

`visible` can be bound to a variable, and stuff disappears when it is set to `"none"`.

```html
<div data-bind="visible: something">
```

Incidentally, visible can be bound to one particular helper which returns a boolean. In this special case, `visible` is set to `""` when `_3w_haveData` returns `true` and `"none"` otherwise.

```html
<div data-bind="visible: _3w_haveData">
```

#### View Model to View Only Elements

It is easy to specify fields that are view model only. They don't even have to be declared as in the set up.

```html
<data field="additional" initial-value="view model to view only"></data>
<div>
    Additional (View Model Only): <input data-bind="value: additional">
</div>
<div>
    Additional: <span data-bind="html: additional"></span>
</div>

<div data-bind="visible: additional">
    <strong>Set "Additional" to "none" to Make this Disappear</strong>
</div>
```

#### Instance Methods

The following methods are crammed onto each template instance in an `onCreated` hook.

`_3w_SetId(id)`: sets the id of the document to bind to

`_3w_Get(prop)`: gets a property

`_3w_Set(prop, value)`: sets a property

`_3w_Get_NR(prop)`: gets a property "non-reactively"

`_3w_GetAll_NR`: gets all the data "non-reactively"


#### Additional Template Helpers

`_3w_id`: returns the `_id` of the document selected (if any)

`_3w_haveData`: returns a booleans indicating whether the view model has data yet

`_3w_get`: takes an argument `propName` and (reactively) returns the relevant value in the view model.

`_3w_getAll`: returns all the data in the view model as a dictionary.

#### Debug

`ThreeWay.setDebugModeOn()` - Turns on debug mode

`ThreeWay.debugModeSelectAll()` - Show all debug messages (initially none)

`ThreeWay.debugModeSelectNone()` - Reset selection of debug message classes to none

`ThreeWay.debugModeSelect(aspect)` - More granular control of debug messages, debug messages fall into the following classes:
 - `bindings`
 - `data_mirror`
 - `observer`
 - `tracker`
 - `new_id`
 - `db`
 - `value`
 - `checked`
 - `html`
 - `visible`
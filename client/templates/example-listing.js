Template.guideAndExamplesListing.helpers({
	isChecked: function (todo) {
		return todo.done ? {checked: true} : {};
	},
	exampleToDos: function () {
		return [
			{
				item: "Guide: View + View Model; Bindings: value, checked, text",
				done: true
			},
			{
				item: "Guide: View + View Model + DB; Default Values; Wildcards",
				done: true
			},
			{
				item: "Guide: Declarative data (data->display). Using Pre-Processors: style, class, html, visible, disabled; Usage in blaze and differences",
				done: true
			},
			{
				item: "Guide: More Bindings: style, class, attr, visible, disabled, focus, event; multi-variate bindings",
				done: false
			},
			{
				item: "Guide: Data Validation",
				done: false
			},
			{
				item: "Guide: Parent-Child Data Access",
				done: false
			},
			{
				item: "Guide: Dynamic Data-binding; Usage with Family Trees",
				done: false
			},
			{
				item: "Guide: Reload and View Model Data Persistence",
				done: false
			},
			{
				item: "Guide: Limited Data Synchronization Feedback (updated on server; focused field changed)",
				done: false
			},
			{
				item: "Guide: Declarative data->display. A Pure Side-effects Pre-Processor Example: Rotate a Canvas Plot",
				done: true
			},
			{
				item: "Guide: Customizing How the UI Updates the View Model",
				done: false
			},
		];
	}
});
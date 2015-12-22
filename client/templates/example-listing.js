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
				done: true
			},
			{
				item: "Guide: Data Validation",
				done: true
			},
			{
				item: "Guide: Parent-Child Data Access",
				done: true
			},
			{
				item: "Guide: Dynamic Data-binding; Usage with Family Trees",
				done: true
			},
			{
				item: "Guide: Reload and View Model Data Persistence",
				done: true
			},
			{
				item: "Guide: Limited Data Synchronization Feedback (updated on server; focused field changed)",
				done: true
			},
			{
				item: "Guide: Declarative data->display. A Pure Side-effects Pre-Processor Example: Rotate a Canvas Plot",
				done: true
			},
			{
				item: "Guide: Customizing How the UI Updates the View Model",
				done: true
			},
			{
				item: "Guide: Using convexset:collection-tools",
				done: false
			},
		];
	}
});
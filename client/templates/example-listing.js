Template.ExamplesListing.helpers({
	isChecked: function (todo) {
		return todo.done ? {checked: true} : {};
	},
	exampleToDos: function () {
		return [
			{
				item: "View + View Model; Bindings: value, checked, text",
				done: true
			},
			{
				item: "View + View Model + DB; Default Values; Wildcards",
				done: false
			},
			{
				item: "More Bindings: style, class, attr, visible, disabled, focus, event",
				done: false
			},
			{
				item: "Data Validation",
				done: false
			},
			{
				item: "Using Pre-Processors: style, class, html, visible, disabled",
				done: false
			},
			{
				item: "Parent-Child Data Access",
				done: false
			},
			{
				item: "Dynamic Data-binding; Usage with Family Trees",
				done: false
			},
			{
				item: "Reload and View Model Data Persistence",
				done: false
			},
			{
				item: "Limited Data Synchronization Feedback (updated on server; focused field changed)",
				done: false
			},
			{
				item: "A Pure Side-effects Pre-Processor Example: Rotate a Canvas Plot",
				done: false
			},
		];
	}
});
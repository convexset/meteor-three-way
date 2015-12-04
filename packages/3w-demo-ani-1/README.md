# Basic demo 1
Uses `convexset:three-way` and `semantic:ui`.

## Features

* Edit and delete users
* Add tags
* SemanticUI: dropdown binding, tags, modal and basic implementation of messages

## Create your own demo
If you want to add a demo to the three-way documentation you can do so by creating your own package with the demo code inside.
More info on [writing and testing your own package](https://themeteorchef.com/recipes/writing-a-package/)

### Updating the main app to include your demo
```javascript
FlowRouterTree.createNode({
	parent: demo,
	name: 'DemoAni1',
	description: 'Basic Demo',
	path: 'Ani1',
	params: {
		content: 'Demo_Ani_1'
	},
});
```

After creating the main template for your demo, add a route to app/lib/routes.js and add the link in app/client/layouts/main-layout.html

```html
<a class="item" href="{{pathFor 'DemoAni1'}}">Basic demo</a>
```

### Naming conventions
When creating a demo template, make sure you namespace it in order to avoid any conflicts. The start template should follow the form of `Demo_Username_YourDemoCount`

This is a simple wrapping for [webshim](https://github.com/aFarkas/webshim).

The version of the Meteor package matches the version of webshim so wrapped.

Including the package is essentially the Meteor equivalent of placing a script tag in your HTML.

However, noting the need to update polyfills in a single page application, one may create a mutation observer to monitor changes to the DOM and call `updatePolyfill` to update the DOM when things change. Do this as follows:

```javascript
webshim.createMutationObserverToUpdatePolyfills();
```
or
```javascript
// optionally accepts a query selector
webshim.createMutationObserverToUpdatePolyfills('html');
```

There is no separate repo for this, but it the details of how it is wrapped may be found [here](https://github.com/convexset/meteor-three-way/tree/master/packages/webshim).
# HighlightJS Themes

This Meteor package exports a tool `HighlightJSThemes` with the following functionality.

Accessible on [GitHub](https://github.com/convexset/meteor-three-way/tree/master/packages/highlight-js-themes) and [Atmosphere.js](https://atmospherejs.com/convexset/highlight-js-themes).

<!-- MarkdownTOC -->

- [`HighlightJSThemes.allThemes`](#highlightjsthemesallthemes)
- [`HighlightJSThemes.defaultTheme`](#highlightjsthemesdefaulttheme)
- [`HighlightJSThemes.currentTheme`](#highlightjsthemescurrenttheme)
- [`HighlightJSThemes.setRandomTheme\(\)`](#highlightjsthemessetrandomtheme)
- [`HighlightJSThemes.setTheme\(themeId\)`](#highlightjsthemessetthemethemeid)
- [`HighlightJSThemes.highlightWithWorker\(elemOrSelector\)`](#highlightjsthemeshighlightwithworkerelemorselector)

<!-- /MarkdownTOC -->


#### `HighlightJSThemes.allThemes`

Returns a dictionary (object) of all themes mapping "themeId" to theme name. Here is an example subset:

```javascript
{
    "monokai": "Monokai",
    "monokai-sublime": "Monokai Sublime",
    "obsidian": "Obsidian",
    "paraiso-dark": "Paraiso Dark",
    "paraiso-light": "Paraiso Light",
}
```

#### `HighlightJSThemes.defaultTheme`

Returns the default theme (should be "Monokai Sublime"). Throws an error if there is an attempt to set it to an invalid theme.

Note that the default theme may be set prior to `Meteor.startup`.

#### `HighlightJSThemes.currentTheme`

Returns the current theme.

#### `HighlightJSThemes.setRandomTheme()`

Sets a random theme.

#### `HighlightJSThemes.setTheme(themeId)`

Sets the theme by its Id.

#### `HighlightJSThemes.highlightWithWorker(elemOrSelector)`

Uses a web worker to perform highlighting of the content of an element.
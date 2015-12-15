# HighlightJS Themes

This package exports [HighlightJS](https://highlightjs.org/) as the usual `hljs` and a tool `HighlightJSThemes` with the following functionality.

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

#### `HighlightJSThemes.currentTheme`

Returns the current theme.

#### `HighlightJSThemes.setRandomTheme()`

Sets a random theme.

#### `HighlightJSThemes.setTheme(themeId)`

Sets the theme by its Id.
self.addEventListener('message', function(e) {
	importScripts('highlight-js.v9.1.0.pack.js');
	var result = self.hljs.highlightAuto(e.data.textContent, e.data.languageSubset.length > 0 ? e.data.languageSubset : (void 0));
	postMessage(JSON.stringify({
		language: result.language,
		relevance: result.relevance,
		value: result.value,
	}));
	close();
});
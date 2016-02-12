hljs.registerLanguage("__clojure-repl",hljs.registerLanguage(_clojure-repl,(/*
Language: Clojure REPL
Description: Clojure REPL sessions
Author: Ivan Sagalaev <maniac@softwaremaniacs.org>
Requires: clojure.js
Category: lisp
*/

function(hljs) {
  return {
    contains: [
      {
        className: 'meta',
        begin: /^([\w.-]+|\s*#_)=>/,
        starts: {
          end: /$/,
          subLanguage: 'clojure'
        }
      }
    ]
  }
}
)(hljs);););
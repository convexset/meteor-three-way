hljs.registerLanguage("_php-html",hljs.registerLanguage(php-html,/*
Language: PHP in HTML
Requires: php.js, xml.js
Category: common
*/

function(hljs) {
  return {
    subLanguage: 'xml',
    contains: [
      {
        begin: /<\?(php)?/, end: /\?>/,
        subLanguage: 'php',
        contains: [{begin: '/\\*', end: '\\*/', skip: true}]
      }
    ]
  }
}
););
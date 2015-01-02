/* jshint node: true */

/*
  Overrides the default `marked` parser to pre-highlight
  code using highlight.js and apply line numbers.
*/
var marked = require('marked');
var highlight = require('highlight.js');

var renderer = new marked.Renderer();
renderer.code = function(code, meta){
  meta = meta || 'javascript';

  var lines = code.split("\n");
  var lineNumbers = '';
  var result;

   lines.forEach(function(item, index){
     var humanIndex = index + 1;

     lineNumbers = lineNumbers + humanIndex + "\n";
   });

   var highlightedCode;

   try {
    highlightedCode = highlight.highlight(meta, code).value;
   } catch (e) {
    highlightedCode = code;
   }
   result = '<div class="highlight ' + meta + '">' +
     '  <div class="ribbon"></div>' +
     '  <div class="scroller">' +
     '    <table class="CodeRay">' +
     '      <tr>' +
     '        <td class="line-numbers">' +
     '          <pre>' + lineNumbers + '</pre>' +
     '        </td>' +
     '        <td class="code"><pre class="' + meta + '">' + highlightedCode + '</pre></td>' +
     '      </tr>' +
     '    </table>' +
     '  </div>' +
     '</div>';

   return result;
};

marked.setOptions({
  renderer: renderer
});

module.exports = marked;

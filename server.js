var Promise = require('bluebird');
var express = require('express');
var fs      = require('fs');
var app     = express();
var Mustache = require('mustache');

var templateFiles = ['admin', 'front'];
var promises  = [];
var readFileAsync = Promise.promisify(fs.readFile);
var templates = {};

function loadTemplate(template) {
  // return function() {
    return readFileAsync(__dirname + '/templates/' + template + '.html')
    .then(function(result) { return result.toString(); })
    .then(function(_template) {
      return Mustache.parse(_template);
    });
  // };
}

// templates.forEach(function(template) {
//   // console.log(template);
//   promises.push(loadTemplate(template));
// });
// console.log(promises);
Promise.map(templateFiles, loadTemplate)
.then(function(compiledTemplates) {
  // console.log(result);
  templateFiles.forEach(function(templateName, idx) {
    templates[templateName] = compiledTemplates[idx];
  });
  console.log(templates);
});

app.get('/admin', function(req, res) {
  // res.json({ pouet: 'pouet' });
  res.send(templates.admin);
});

app.get('/', function(req, res) {
  // res.json({ pouet: 'pouet' });
  res.send(templates.front());
});

app.listen(3000, function () {
  console.log('Example app listening on port ' + 3000);
});

module.exports = app;

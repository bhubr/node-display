var Promise = require('bluebird');
var express = require('express');
var fs      = require('fs');
var app     = express();

var templates = ['admin', 'front'];
var promises  = [];
var readFileAsync = Promise.promisify(fs.readFile);

function loadTemplate(template) {
  return readFileAsync(__dirname + '/templates/' + template);
}

templates.forEach(function(template) {
  // console.log(template);
  promises.push(loadTemplate(template));
})

app.get('/admin', function(req, res) {
  // res.json({ pouet: 'pouet' });

});

app.listen(3000, function () {
  console.log('Example app listening on port ' + 3000);
});

module.exports = app;

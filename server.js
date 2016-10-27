var Promise = require('bluebird');
var express = require('express');
var fs      = require('fs');
var app     = express();

var templates = ['admin', 'front'];
var promises  = [];
var readFileAsync = Promise.promisify(fs.readFile);

function loadTemplate(template) {
  // return function() {
    return readFileAsync(__dirname + '/templates/' + template + '.html')
    .then(function(result) { return result.toString(); });
  // };
}

templates.forEach(function(template) {
  // console.log(template);
  promises.push(loadTemplate(template));
});
console.log(promises);
Promise.all(promises)
.then(function(result) {
  console.log(result);
});

app.get('/admin', function(req, res) {
  // res.json({ pouet: 'pouet' });

});

app.listen(3000, function () {
  console.log('Example app listening on port ' + 3000);
});

module.exports = app;

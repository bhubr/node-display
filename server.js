var Promise    = require('bluebird');
var Mustache   = require('mustache');
var express    = require('express');
var fs         = require('fs');
var bodyParser = require('body-parser')
var Sequelize  = require('sequelize');
var sequelize = new Sequelize('database', 'username', 'password', {
  host: 'localhost',
  dialect: 'sqlite',

  pool: {
    max: 5,
    min: 0,
    idle: 10000
  },

  // SQLite only
  storage: __dirname + '/database.sqlite'
});
var Song = sequelize.define('song', {
  songTitle: {
    type: Sequelize.STRING,
    field: 'song_title' // Will result in an attribute that is firstName when user facing but first_name in the database
  }
}, {
  freezeTableName: true // Model tableName will be the same as the model name
});

var tmplFiles  = ['admin', 'front'];
// var promises  = [];
var readFileAsync = Promise.promisify(fs.readFile);
var templates  = {};

var app        = express();
// var jsonParser = bodyParser.json();
var urlencodedParser = bodyParser.urlencoded({ extended: false });
var server     = require('http').Server(app);
var io         = require('socket.io')(server);
server.listen(3001);
var socket;

app.use(express.static('public'));

function loadTemplate(template) {
  // return function() {
    return readFileAsync(__dirname + '/templates/' + template + '.html')
    .then(function(result) { return result.toString(); })
    .then(function(_template) {
      // console.log(_template);
      Mustache.parse(_template);
      return _template;
    });
  // };
}

// templates.forEach(function(template) {
//   // console.log(template);
//   promises.push(loadTemplate(template));
// });
// console.log(promises);
Promise.map(tmplFiles, loadTemplate)
.then(function(compiledTemplates) {
  // console.log(result);
  tmplFiles.forEach(function(templateName, idx) {
    templates[templateName] = compiledTemplates[idx];
  });
  // console.log(templates);
});

app.get('/admin', function(req, res) {
  // res.json({ pouet: 'pouet' });
  res.send(Mustache.render(templates.admin));
});

app.get('/', function(req, res) {
  // res.json({ pouet: 'pouet' });
  res.send(Mustache.render(templates.front));
});

app.post('/song', urlencodedParser, function(req, res) {
  // console.log(req.body);
  var songTitle = req.body.title;
  return Song.create({
    songTitle: songTitle
  })
  .then(function(song) {
    console.log(song);
  socket.emit('news', { songTitle: songTitle });
  res.json({ title: songTitle });
  });
  // res.send(Mustache.render(templates.front));
});

io.on('connection', function (_socket) {
  socket = _socket;
});

Song.sync({force: false}).then(function () {
  app.listen(3000, function () {
    console.log('Example app listening on port ' + 3000);
  });
});

module.exports = app;

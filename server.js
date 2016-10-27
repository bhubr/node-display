// -------------
// SERVER
// -------------


// ----- REQUIRE MODULES -----
var Promise     = require('bluebird');
var Mustache    = require('mustache');
var express     = require('express');
var fs          = require('fs');
var bodyParser  = require('body-parser')
var Sequelize   = require('sequelize');
var _           = require('lodash');
var querystring = require('querystring');

// ----- SEQUELIZE: instantiate and define models -----
var sequelize = new Sequelize('database', 'username', 'password', {
  host: 'localhost',
  dialect: 'sqlite',
  pool: {
    max: 5,
    min: 0,
    idle: 10000
  },
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


// ----- Other variables and Express instance -----
var tmplFiles     = ['admin_main', 'admin_songs', 'front'];
var readFileAsync = Promise.promisify(fs.readFile);
var readdirAsync = Promise.promisify(fs.readdir);
var templates     = {};
var socket;
var app           = express();
var urlencParser  = bodyParser.urlencoded({ extended: false });
var server        = require('http').Server(app);
var io            = require('socket.io')(server);
server.listen(3001);

// Serve static files
app.use(express.static('public'));


// ----- LOAD TEMPLATES -----
// Load and parse a Mustache template
function loadTemplate(template) {
    return readFileAsync(__dirname + '/templates/' + template + '.html')
    .then(function(result) { return result.toString(); })
    .then(function(_template) {
      Mustache.parse(_template);
      return _template;
    });
}
// Pre-load all templates
Promise.map(tmplFiles, loadTemplate)
.then(function(compiledTemplates) {
  tmplFiles.forEach(function(templateName, idx) {
    templates[templateName] = compiledTemplates[idx];
  });
});


// ----- DEFINE ROUTES -----

// Admin route
app.get('/admin/main', function(req, res) {
  readdirAsync(__dirname + '/public/sozi')
  .then(function(files) {
    res.send(Mustache.render(templates.admin_main, { files: files }));
  });
});

// Admin route
app.get('/admin/songs', function(req, res) {
  Song.findAll()
  .then(function(songs) {
    res.send(Mustache.render(templates.admin_songs, { songs: songs }));
  });
});

// Create a song
app.post('/admin/song', urlencParser, function(req, res) {
  var songTitle = req.body.title;
  return Song.create({
    songTitle: songTitle
  })
  .then(function(song) {
    socket.emit('newSong', { songTitle: songTitle });
    res.json({
      id: song.dataValues.id,
      title: songTitle
    });
  });
});

// Play video
app.post('/admin/youtube', urlencParser, function(req, res) {
  var videoUrl = req.body.url;
  var urlSegments = videoUrl.split('?');
  if (urlSegments.length < 2) return res.json({ success: false });
  var qsParsed = querystring.parse(urlSegments[1]);
  socket.emit('video', { videoId: qsParsed.v });
  res.json({
    videoUrl: videoUrl
  });
});

// Front route
app.get('/', function(req, res) {
  Song.findAll({ order: [['id', 'DESC']], limit: 2 })
  .then(function(_songs) {
    var songs = _.map( _songs, 'dataValues' );
    var current = '';
    var previous = '';
    if( songs.length > 0 ) {
      current = songs[0].songTitle;
    }
    if( songs.length > 1 ) {
      previous = songs[1].songTitle;
    }
    res.send(Mustache.render(templates.front, { current: current, previous: previous }));
  });
});


// ----- SOCKET.IO connection/setup -----
io.on('connection', function (_socket) {
  socket = _socket;
});


// Create tables if needed and launch app
Song.sync({force: false}).then(function () {
  app.listen(3000, function () {
    console.log('Example app listening on port ' + 3000);
  });
});

module.exports = app;

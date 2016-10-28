// -------------
// SERVER
// -------------

// ----- CONSTANTS -----
var PORT_MAIN = 3000;
var PORT_SIO  = 3001;

// ----- REQUIRE MODULES -----
var Promise     = require('bluebird');
var Mustache    = require('mustache');
var express     = require('express');
var fs          = require('fs');
var bodyParser  = require('body-parser')
var Sequelize   = require('sequelize');
var _           = require('lodash');
var querystring = require('querystring');
var chain       = require('store-chain');

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

var Video = sequelize.define('song', {
  url: {
    type: Sequelize.STRING
  },
  hoster: {
    type: Sequelize.STRING
  },
  identifier: {
    type: Sequelize.STRING
  } 
}, {
  freezeTableName: true // Model tableName will be the same as the model name
});


// ----- Other variables and Express instance -----
var tmplFiles     = ['admin_main', 'admin_songs', 'front'];
var readFileAsync = Promise.promisify(fs.readFile);
var readdirAsync  = Promise.promisify(fs.readdir);
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

function readImages(folder) {
  return readdirAsync(folder);
}

// Admin route
app.get('/admin/main', function(req, res) {
  chain({
    _slideshows: readdirAsync(__dirname + '/public/images')
  })
  .get(function(store) {
    var slideshows = [];
    var folders = _.map(store._slideshows, function(folder) {
      return __dirname + '/public/images/' + folder; 
    });
    // console.log(folders);
    return Promise.map(folders, readImages)
    .then(function(folderContents) {
      // console.log(folderContents);
      folderContents.forEach(function(folderContent, idx) {
        slideshows.push({
          name: store._slideshows[idx],
          content: folderContent
        });
      });
      return slideshows;
      // console.log(slideshows);
    });
  })
  .set('slideshows')
  .catch(function(error) { console.log(error.stack); })
  .then(() => readdirAsync(__dirname + '/public/sozi'))
  .set('presentations')
  .get(function(store) {
    // store.images.shift();
    console.log(store);
    res.send(Mustache.render(templates.admin_main, { presentations: store.presentations, slideshows: store.slideshows }));
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

// Show image or presentation
app.post('/admin/slideshow', urlencParser, function(req, res) {
  var folder  = req.body.name;
  readdirAsync(__dirname + '/public/images/' + folder)
  .then(function(_images) {
    var images = _.map(_images, function(img) { return '<img src="/images/' + folder + '/' + img + '" />'; });
    socket.emit('slideshow', { images: images });
    res.json({
      images: images
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
    var fullUrl = req.protocol + '://' + req.get('host');
    var socketIoUrl = fullUrl.replace( PORT_MAIN, PORT_SIO );
    console.log('full', fullUrl, 'base', req.baseUrl);
    if( songs.length > 0 ) {
      current = songs[0].songTitle;
    }
    if( songs.length > 1 ) {
      previous = songs[1].songTitle;
    }
    res.send(Mustache.render(templates.front, { current: current, previous: previous, socketIoUrl: socketIoUrl }));
  });
});


// ----- SOCKET.IO connection/setup -----
io.on('connection', function (_socket) {
  socket = _socket;
});


// Create tables if needed and launch app
Song.sync({force: false}).then(function () {
  app.listen(PORT_MAIN, function () {
    console.log('Example app listening on port ' + PORT_MAIN);
  });
});

module.exports = app;

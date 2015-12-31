var express = require('express');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);
var bodyParser = require('body-parser');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
var fs = require('fs');
var multer = require('multer');
var upload = multer({dest: 'uploads'});
var rmdir = require('rimraf');
var htmlEncode = require('htmlencode').htmlEncode;
var request = require('request');

var giphyReserve = [];

function save(msg, encode) {
	var messages = JSON.parse(fs.readFileSync('data.json'));
	msg = JSON.parse(msg);
	if(!encode && ['blobfish', 'asher', 'po', 'jingle'].indexOf(msg.data.toLowerCase()) == -1) {
		msg.data = htmlEncode(msg.data);
	} else if(msg.data.toLowerCase() === 'blobfish') msg.data = '<img src="images/blobfish.jpg" width="360px" height="300px">';
	else if(msg.data.toLowerCase() === 'asher') msg.data = '<img src="images/asher.jpg" width="400px" height="296px">';
	else if(msg.data.toLowerCase() === 'po') msg.data = '<img src="images/po.jpg" width="400px" height="296px">';
	else if(msg.data.toLowerCase() === 'jingle') msg.data = '<img src="images/jingle.jpg" width="400px" height="296px">';
	messages.push(msg);
	while (messages.length > 50) {
		if(typeof messages[0].path != 'undefined') {
			fs.unlinkSync(messages[0].path);
		}
		messages.splice(0, 1);
	}
	fs.writeFileSync('data.json', JSON.stringify(messages));
	io.emit('update', fs.readFileSync('data.json').toString());
}

if(!fs.existsSync('data.json')) {
	fs.writeFileSync('data.json', '[]');
}

if(!fs.existsSync('uploads/chat-images')) {
	fs.mkdirSync('uploads/chat-images');
}

if(!fs.existsSync('uploads/giphy')) {
	fs.mkdirSync('uploads/giphy');
}

//io.emit('update', fs.readFileSync('data.json').toString());

app.use(express.static('public'));

app.use(express.static('uploads'));

app.get('/', function(req, res) {
	res.sendFile('index.html', {root: __dirname});
});

app.get('/image/:name', function(req, res) {
	var file = fs.readFileSync('image-upload.html').toString();
	while(file.indexOf('[name]') > -1) {
		file = file.replace('[name]', req.params.name);
	}
	res.send(file);
});

app.post('/image-upload', upload.single('image'), function(req, res) {
	var path = req.file.path;
	fs.readFile(path, function(err, data) {
		if(err) {
			console.log(err);
			throw err;
		}
		var name = req.file.originalname;
		var i = 0;
		if (fs.existsSync('uploads/chat-images/' + name)) {
			function construct(array) {
				var str = '';
				for (var i = 0; i < array.length; i++) {
					if (i > 0) {
						str += '.';
					}
					str += array[i];
				}
				return str;
			}
			if (name.indexOf('.') > -1) {
				name = name.split('.');
				name.splice(name.length - 1, 0, i);
				i++;
				while (fs.existsSync('uploads/chat-images/' + construct(name))) {
					name[name.length - 2] = i;
					i++;
				}
				name = construct(name);
			} else {
				name = [name, i];
				i++;
				while (fs.existsSync('uploads/chat-images/' + construct(name))) {
					name[1] = i;
					i++;
				}
				name = construct(name);
			}
		}
		//fs.writeFileSync('uploads/' + name, data);
		fs.writeFileSync('uploads/chat-images/' + name, data);
		fs.unlinkSync(path);
		var msg = JSON.stringify({name: req.body.name, data: '<img src="chat-images/' + name + '?stamp=' + Date.now() + '">', path: 'uploads/chat-images/' + name});
		save(msg, true);
		res.send('<html><script>localStorage.close = "true"</script></html>');
	});
});

app.post('/image-url', function(req, res) {
	var msg = JSON.stringify({name: req.body.name, data: '<img src="' + req.body.url + '">'});
	save(msg, true);
	res.send('<html><script>localStorage.close = "true"</script></html>');
});

io.on('connection', function(ws) {
	console.log('New WS connection from: ' + ws.request.connection.remoteAddress + ' ID: ' + ws.id);
	ws.on('message', function(msg) {
		if (msg === 'update') {
			ws.emit('update', fs.readFileSync('data.json').toString());
		} else {
			var test = true;
			try {
				JSON.parse(msg);
			} catch(err) {
				test = false;
			}
			if(test) {
				save(msg);
			}
		}
		if (msg === 'clear') {
			fs.writeFileSync('data.json', '[]');
			io.emit('clear', true);
			rmdir.sync('uploads/chat-images');
			fs.mkdirSync('uploads/chat-images');
			rmdir.sync('uploads/giphy');
			fs.mkdirSync('uploads/giphy');
		}
	});
	ws.on('giphy', function(msg) {
		msg = JSON.parse(msg);
		var search = 'http://api.giphy.com/v1/gifs/search?q=[search]&api_key=dc6zaTOxFJmzC&limit=100&rating=g';
		search = search.replace('[search]', encodeURIComponent(msg.data));
		request.get(search, function(err, res, body) {
			if(!err && res.statusCode == 200) {
				var data = JSON.parse(body);
				if(data.data.length > 0) {
					var gif = Math.floor(Math.random() * data.data.length);
					var embedLink = data.data[gif].images.fixed_width;
					var i = 0;
					while(fs.existsSync('uploads/giphy/' + i + '.gif') || giphyReserve.indexOf(i) > -1) {
						i++;
					}
					giphyReserve.push(i);
					var stream = request(embedLink.url).pipe(fs.createWriteStream('uploads/giphy/' + i + '.gif'));
					stream.on('finish', function() {
						giphyReserve.splice(giphyReserve.indexOf(i), 1);
						msg.path = 'uploads/giphy/' + i + '.gif';
						msg.data = '<img src="' + 'giphy/' + i + '.gif?stamp=' + Date.now() + '" width="' + embedLink.width + '" height="' + embedLink.height + '">';
						msg = JSON.stringify(msg);
						save(msg, true);
					});
				}
			}
		});
	});
});

app.use(function(req, res) {
	res.status(404).sendFile('404.html', {root: __dirname});
});

app.use(function(err, req, res, next) {
	res.status(500).sendFile('500.html', {root: __dirname});
});

server.listen(process.env.PORT || 80);

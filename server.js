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

function save(msg, encode) {
	var messages = JSON.parse(fs.readFileSync('data.json'));
	msg = JSON.parse(msg);
	if(!encode) {
		msg.data = htmlEncode(msg.data);
	}
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

if (!fs.existsSync('data.json')) {
	fs.writeFileSync('data.json', '[]');
}

if(!fs.existsSync('uploads/images')) {
	fs.mkdirSync('uploads/images');
}

app.use(express.static('public'));

app.use(express.static('uploads'));

app.get('/', function(req, res) {
	res.sendFile('index.html', {root: __dirname});
});

app.get('/image/:name', function(req, res) {
	var file = fs.readFileSync('image-upload.html').toString();
	file = file.replace('[name]', req.params.name);
	res.send(file);
});

app.post('/image-upload', upload.single('image'), function(req, res) {
	var path = req.file.path;
	fs.readFile(path, function(err, data) {
		if(err) {
			console.log(err);
			throw err;
		}
		console.log(req.file);
		var name = req.file.originalname;
		var i = 0;
		if (fs.existsSync('uploads/images' + name)) {
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
				while (fs.existsSync('uploads/images' + construct(name))) {
					name[name.length - 2] = i;
					i++;
				}
				name = construct(name);
			} else {
				name = [name, i];
				i++;
				while (fs.existsSync('uploads/images' + construct(name))) {
					name[1] = i;
					i++;
				}
				name = construct(name);
			}
		}
		//fs.writeFileSync('uploads/' + name, data);
		fs.writeFileSync('uploads/images/' + name, data);
		fs.unlinkSync(path);
		var msg = JSON.stringify({name: req.body.name, data: '<img src="images/' + name + '">', path: 'uploads/images/' + name});
		save(msg, true);
		res.send('<html><script>localStorage.close = "true"</script></html>');
	});
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
			rmdir.sync('uploads/images');
			fs.mkdirSync('uploads/images');
		}
	});
});

app.use(function(req, res) {
	res.status(404).sendFile('404.html', {root: __dirname});
});

app.use(function(err, req, res, next) {
	res.status(500).sendFile('500.html', {root: __dirname});
});

server.listen(process.env.PORT || 80);

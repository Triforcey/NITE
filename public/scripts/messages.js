var io = io.connect('http://' + window.location.hostname);
var firstUpdate = true;

function getDate() {
	var date = new Date();
	return date.getMonth() + 1 + '/' + date.getDate() + '/' + date.getFullYear() + ' ' + date.getHours() + ':' + date.getMinutes();
}

$(function() {
	$('#message').keydown(function(e) {
		if (e.which == 13) {
			var message = {};
			message.name = $('#name').val();
			message.data = $('#message').val();
			message.date = getDate();
			io.emit('message', JSON.stringify(message));
			$('#message').val('');
		}
	});

	io.on('update', function(msg) {
		msg = JSON.parse(msg);
		var messages = '';
		for (var i = msg.length - 1; i >= 0; i--) {
			/*if (i < msg.length - 1) {
				div += '<br>';
			}*/
			var div = '<div style="clear: both;"></div><div><p style="margin-top: 0; margin-bottom: 0;">' + msg[i].date + '</p><p style="float: left; margin-right: 5px; margin-top: 0; [style]">' + msg[i].name + ': </p><p style="float: left; margin-top: 0; [style]">' + msg[i].data + '</p></div>';
			if (i > 0) {
				while (div.indexOf('[style]') > -1) {
					div = div.replace('[style]', 'margin-bottom: 15px;');
				}
			} else {
				while (div.indexOf('[style]') > -1) {
					div = div.replace('[style]', 'margin-bottom: 0;');
				}
			}
			messages += div;
		}
		$('#messages').html(messages);
		if (!firstUpdate && msg.length > 0) {
			var bell = document.getElementById('bell');
			if (bell.currentTime > 0) {
				bell.currentTime = 0;
			}
			bell.play();
		}
		firstUpdate = false;
	});

	io.emit('message', 'update');

	$('#clear').click(function() {
		$('#message').focus();
		io.emit('message', 'clear');
	});

	io.on('clear', function(msg) {
		if (msg) {
			$('#messages').html('');
			io.emit('message', 'update');
		}
	});

	$('#name').on('input', function() {
		localStorage.name = $('#name').val();
	});

	if (typeof localStorage.name != 'undefined') {
		$('#name').val(localStorage.name);
	}

	$('#image').click(function() {
		$('#message').focus();
		if ($('#name').val()) {
			var uploadWindow = window.open('image/' + $('#name').val() + '/' + encodeURIComponent(getDate()), 'Image Upload', 'width=1000px height=1000px');
			localStorage.close = 'false';
			var loop = setInterval(function() {
				if(localStorage.close == 'true') {
					uploadWindow.close();
					clearInterval(loop);
				}
			});
		} else {
			alert('Set name first!');
		}
	});

	$('#giphy').keydown(function(e) {
		if(e.which == 13) {
			var msg = {name: $('#name').val(), data: $('#giphy').val(), date: getDate()};
			io.emit('giphy', JSON.stringify(msg));
			$('#giphy').val('');
		}
	});

	$('#youtube').keydown(function(e) {
		if(e.which == 13) {
			var msg = {name: $('#name').val(), data: $('#youtube').val(), date: getDate()};
			io.emit('youtube', JSON.stringify(msg));
			$('#youtube').val('');
		}
	});
});

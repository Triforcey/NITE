var ws = io.connect('http://' + window.location.hostname);

$(function() {
	$('#message').keydown(function(e) {
		if (e.which == 13) {
			var date = new Date();
			var message = {};
			message.name = $('#name').val();
			message.data = $('#message').val();
			message.date = date.getMonth() + '/' + date.getDate() + '/' + date.getFullYear();
			ws.emit('message', JSON.stringify(message));
			$('#message').val('');
		}
	});

	ws.on('update', function(msg) {
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
	});

	ws.emit('message', 'update');

	$('#clear').click(function() {
		$('#message').focus();
		ws.emit('message', 'clear');
	});

	ws.on('clear', function(msg) {
		if (msg) {
			$('#messages').html('');
			ws.emit('message', 'update');
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
		var uploadWindow = window.open('image/' + $('#name').val(), 'Image Upload', 'width=1000px height=1000px');
		localStorage.close = 'false';
		var loop = setInterval(function() {
			if(localStorage.close == 'true') {
				uploadWindow.close();
				clearInterval(loop);
			}
		});
	});
});

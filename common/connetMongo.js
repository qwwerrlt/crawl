'use strict';

const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost/test', {
	server: {
		auto_reconnect: true,
		poolSize: 10
	}
});
mongoose.connection
	.on('error', () => console.log('connection error'))
	.once('open', () => console.log('connection open'));
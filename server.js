const express = require('express');
const cors = require('cors');
const ExpressPeerServer = require('peer').ExpressPeerServer;

var PORT = process.env.PORT || 9000;

var app = express();
app.use(cors());

app.get('/test', function(req, res, next) { res.send('SERVER UP'); });

var server = app.listen(PORT);
 
var options = {
   		debug: true
	}
var peerserver = ExpressPeerServer(server, options);
app.use('/', peerserver);
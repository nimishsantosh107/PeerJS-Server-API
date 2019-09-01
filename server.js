var PeerServer = require('peer').PeerServer;
var server = PeerServer({port: process.env.PORT || 9000 , path: '/vr'});
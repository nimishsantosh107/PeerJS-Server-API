/*
/ 		- 	default
/peer 	- 	peer-server
/status - 	status of site
/privacypolicy - PP
URL - https://peerjs-server-api.herokuapp.com/
*/

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const http = require('http');
const socketIO = require('socket.io');
const axios = require('axios');
const firebase = require('firebase');


  // Your web app's Firebase configuration
  var firebaseConfig = {
    apiKey: "AIzaSyDxUdsBOiWl41ASEHweGZdhdCZtXDvPOg8",
    authDomain: "vr-theatre.firebaseapp.com",
    databaseURL: "https://vr-theatre.firebaseio.com",
    projectId: "vr-theatre",
    storageBucket: "",
    messagingSenderId: "69732209271",
    appId: "1:69732209271:web:72b6bf3a671d3b8f43ec72"
  };
  // Initialize Firebase
  firebase.initializeApp(firebaseConfig);

  var db=firebase.firestore();

const ExpressPeerServer = require('peer').ExpressPeerServer;

var PORT = process.env.PORT || 9000;

var app = express();
var server = http.Server(app);
var io = socketIO(server);
app.use(cors());

//SEE IF SITE IS RUNNING
app.get('/status', function (req, res) {
	res.send('SERVER UP');
});
app.get('/privacypolicy', function (req, res, ) {
	res.sendFile(path.join(__dirname, 'privacypolicy.html'));
});

//LAUNCH
server.listen(PORT, () => {
	console.log(`SERVER UP ON PORT: ${PORT}`)
});

//CONFIG PEER-JS SERVER
var peerserver = ExpressPeerServer(server, {
	debug: true
});
app.use('/peer', peerserver);


//SIGNALLING AND CANDIDATE INFO
io.on("connection", (socket) => {
	//ROOM
	socket.on("joinRoom", async (data) => {
		socket.room = data;
		await socket.join(socket.room);
		socket.emit('roomJoinSuccess', {
			room: socket.room
		});
		io.to(socket.room).emit('userstat', {
			usercount: io.sockets.adapter.rooms[socket.room].length
		});

		console.log(`++  ${socket.id} JOINING |${socket.room}|`);
	});

	//GET SIGNAL AND EMIT TO ROOM
	socket.on('signal', async (data) => {
		socket.peerid = data.peerid;
		socket.broadcast.to(socket.room).emit('signal', {
			socketid: socket.id,
			peerid: socket.peerid
		});
		console.log(`~~ SOCKETID: ${socket.id} | PEERID: ${socket.peerid}`)
	});

	socket.on('onlineStatus', (uid) => {
		console.log(uid + " online ");
		socket.uid=uid;
        db.collection("users").doc(uid).update({onlineStatus:true}).then(()=>{
			socket.emit("status_set",true);
		});
	});

	socket.on("controls", (obj) => {
		console.log("Server:controls");

		io.sockets.in(obj.room).emit("controlUpdate", obj);
	});


	socket.on('leaving', async (data) => {
		socket.broadcast.to(socket.room).emit('newLeaving', {
			leftPeerid: data.peerid
		});
		socket.broadcast.to(socket.room).emit('userstat', {
			room: socket.room,
			usercount: io.sockets.adapter.rooms[socket.room].length - 1
		});
		await socket.leave(socket.room);
		console.log(`--  ${socket.id} LEAVING |${socket.room}|`);
	});

	//HANDLE DISCONNECTION
	socket.on("disconnect", async () => {
	
		db.collection("users").doc(socket.uid).update({onlineStatus:false});
		
		if (socket.room && io.sockets.adapter.rooms[socket.room]) {
			socket.broadcast.to(socket.room).emit('newLeaving', {
				leftPeerid: socket.peerid
			});
			socket.broadcast.to(socket.room).emit('userstat', {
				usercount: io.sockets.adapter.rooms[socket.room].length
			});
			await socket.leave(socket.room);
		}
		console.log("- DISCONNECTED: ", socket.id);
	});
});
/*
/ 		- 	default
/peer 	- 	peer-server
/status - 	status of site
*/

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const http = require('http');
const socketIO = require('socket.io'); 
const ExpressPeerServer = require('peer').ExpressPeerServer;

var PORT = process.env.PORT || 9000;

var app = express();
var server = http.Server(app);
var io = socketIO(server); 
app.use(cors());

//SEE IF SITE IS RUNNING
app.get('/status', function(req, res, next) { res.send('SERVER UP'); });

//LAUNCH
server.listen(PORT, ()=>{console.log(`SERVER UP ON PORT: ${PORT}`)});

//CONFIG PEER-JS SERVER
var peerserver = ExpressPeerServer(server, {debug: true});
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
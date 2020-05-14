const express = require('express');
const app = express();
const PORT = 3000;

const http = app.listen(PORT, () => {
    console.log('Listening...');
});

const io = require('socket.io')(http);
const fs = require('fs');

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/client/index.html');
});

var users = {};

create = (socket) => {
    users[socket.id] = {
        id: socket.id,
        socket: socket,
        connection: -1,
        isConnected: false
    };
};

// matchmaking
var matchmaking = [];

connect = (id1, id2) => {
    if (users[id1] == undefined || users[id2] == undefined) {
        return;
    }

    users[id1].connection = id2;
    users[id1].isConnected = true;

    users[id2].connection = id1;
    users[id2].isConnected = true;

    users[id1].socket.emit('found-connection', {connection: id2});
    users[id2].socket.emit('found-connection', {connection: id1});
};

disconnect = (id) => {
    var user = users[id];

    if (user.isConnected) {
        users[user.connection].isConnected = false;
        users[id].isConnected = false;

        matchmake(user.connection);
    }
};

matchmake = (id) => {
    if (matchmaking.length > 0) {
        // connect the two
        connect(id, matchmaking.pop()); // might want to change to like shift or smth
    }

    else {
        matchmaking.push(id);
        users[id].socket.emit('matchmaking');
    }
};

// when a socket makes a connection
io.on('connection', (socket) => {

    // create a new user
    create(socket);

    // add them to the matchmaking queue
    matchmake(socket.id);
    
    socket.emit('init', {id: socket.id});
    
    // recv a message
    socket.on('message', (data) => {
        if (users[socket.id].isConnected) {
            var connection = users[users[socket.id].connection];
            socket.emit('recieve-message', {content: data.content});
            connection.socket.emit('recieve-message', {content: data.content});
        }
    });

    setInterval(() => {
        var user = users[socket.id];
        if (!user) {
            return;
        }

        socket.emit('connection-status', {status: user.isConnected});
    }, 5000);

    socket.on('disconnect', () => {
        disconnect(socket.id);
        delete users[socket.id];
    });
});
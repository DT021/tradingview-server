const io = require('socket.io')(7001, {
    pingTimeout: 60000
});
const r = require("rethinkdb");
const dotenv = require('dotenv').config();


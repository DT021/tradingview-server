const express = require("express")
const app = express()
const r = require("rethinkdb");
const dotenv = require('dotenv').config();
const fs = require('fs');
const bodyParser = require('body-parser');
const cors = require('cors');
var server = require('http').Server(app);
var io = require('socket.io')(server, {
    pingTimeout: 60000
});

app.use(bodyParser.json());
app.use(cors());

io.on('connection', (socket) => {
    socket.on('start-socket', (market) => {
        r.connect({
            host: "34.220.23.203",
            port: 28015
        }).then((conn) => {
            r.db("brain_markets").table(`${market}_signals`).changes().run(conn).then((cursor) => {
                cursor.each((err, row) => {
                    if(row.new_val){
                        socket.emit('signal', row.new_val)
                    }
                }).catch(() => {
                    console.log("Table Removed.")    
                })
            }).catch((e) => {
                console.log("Table Removed.")
            })
        })
    })
})

app.get("/api/markets", (req, res) => {
    r.connect({
        host: "34.220.23.203",
        port: 28015
    }).then((conn) => {
        r.db("brain_markets").table('markets').run(conn).then((cur) => {
            cur.toArray().then((data) => {
                res.send(data)
            })
        })
    })
})

app.post("/api/market", (req, res) => {
    let body = req.body;
    let name = body.name.toLowerCase().replace(/[/ ]/g, "_");
    console.log(name)
    r.connect({
        host: "34.220.23.203",
        port: 28015
    }).then((conn) => {
        r.db("brain_markets").table('markets').insert({
            name: name,
            link: body.link
        }).run(conn).then(() => {
            Promise.all([
                r.db("brain_markets").tableCreate(name, {
                    primary_key: 'time'
                }).run(conn),
                r.db("brain_markets").tableCreate(`${name}_signals`, {
                    primary_key: 'time'
                }).run(conn)
            ]).then(() => {
                res.send('Added Successfully')
            })
           
            .catch((e) => {
                console.log(e)
            })
        })
    })
});

app.delete("/api/market", (req, res) => {
    let id = req.query.id;
    r.connect({
        host: "34.220.23.203",
        port: 28015
    }).then((conn) => {
        r.db("brain_markets").table('markets').get(id).run(conn).then((doc) =>{
            r.db("brain_markets").tableDrop(doc.name).run(conn)
            r.db("brain_markets").tableDrop(`${doc.name}_signals`).run(conn)
            .catch((e) => {
                console.log(e)
            })
            .then((data) => {
                r.db("brain_markets").table('markets').get(id).delete().run(conn).then((data) => {
                    res.send('Deleted Successfully')
                })
            })
        })
    })
});

app.get('/api/market', (req, res) => {
    let market = req.query.market;
    r.connect({
        host: "34.220.23.203",
        port: 28015
    }).then((conn) => {
        r.db("brain_markets").table(market).run(conn).then((data) => {
            data.toArray().then((data) => {
                res.send(data)
            })
        })
    })
})

app.get('/api/signals', (req, res) => {
    let market = req.query.market;
    r.connect({
        host: "34.220.23.203",
        port: 28015
    }).then((conn) => {
        r.db("brain_markets").table(`${market}_signals`).orderBy({index: r.desc('time')}).limit(200).run(conn).then((data) => {
            data.toArray().then((data) => {
                res.send(data)
            })
        })
    })
})




server.listen(process.env.PORT, () => {
    console.log(`Server started on Port 7000`)
})
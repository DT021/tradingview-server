const express = require("express")
const app = express()
const r = require("rethinkdb");
const dotenv = require('dotenv').config();
const bodyParser = require('body-parser');
const cors = require('cors');
const io = require('socket.io')(7001, {
    pingTimeout: 60000
});
app.use(express.static('public'));
app.use(bodyParser.json());
app.use(cors());

io.on('connection', (socket) => {
    socket.on('start-socket', (market) => {
        r.connect({
            host: "35.180.0.174",
            port: 28015
        }).then((conn) => {
            r.db("brain_markets").table(market).changes().run(conn).then((cursor) => {
                cursor.each((err, row) => {
                    socket.emit('chart-data', row.new_val)
                    if(+row.new_val.buy == 0.99){
                        socket.emit('buy-signal', row.new_val);
                    }
                    if(+row.new_val.sell == 0.1){
                        socket.emit('sell-signal', row.new_val)
                    }
                })
            }).catch((e) => {
                console.log("Table")
            })
        })
    })
})
console.log("SOCKET LISTENING ON 7001")

r.connect({
    host: "35.180.0.174",
    port: 28015
}).then((conn) => {
    // r.db("brain_markets").tableList().run(conn).then((data) => {
    //     console.log(data);  
    // })
    // r.db("brain_markets").table('eur_usd').run(conn).then((data) => {
    //     data.toArray((err, rows) => {
    //         console.log(rows)
    //     })
    // })
    r.db('rethinkdb').table('users').run(conn).then((data) => {
        data.toArray().then((d) => {
            console.log(d)
        })
    })
})

app.get("/api/markets", (req, res) => {
    r.connect({
        host: "35.180.0.174",
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
    let name = body.name.toLowerCase().replace(/ /g, "_");
    r.connect({
        host: "35.180.0.174",
        port: 28015
    }).then((conn) => {
        r.db("brain_markets").table('markets').insert({
            name: name,
            link: body.link
        }).run(conn).then(() => {
            r.db("brain_markets").tableCreate(name).run(conn)
            .then((data) => {
                res.send('Success')
            })
            .catch((e) => {
                res.status(500).send(e)
            })
        })
    })
});

app.delete("/api/market", (req, res) => {
    let id = req.query.id;
    r.connect({
        host: "35.180.0.174",
        port: 28015
    }).then((conn) => {
        r.db("brain_markets").table('markets').get(id).run(conn).then((doc) =>{
            r.db("brain_markets").tableDrop(doc.name).run(conn)
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
    console.log(req.query)
    r.connect({
        host: "35.180.0.174",
        port: 28015
    }).then((conn) => {
        r.db("brain_markets").table(market).limit(150).run(conn).then((data) => {
            data.toArray().then((data) => {
                res.send(data)
            })
        })
    })
})




app.get("/", (req, res) => {
    res.sendFile(__dirname + '/public/index.html')
})

app.listen(7000, () => {
    console.log(`Server started on Port 7000`)
})
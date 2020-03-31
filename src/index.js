const express = require("express")
const app = express()
const r = require("rethinkdb");
const fs = require('fs');
const https = require('https');
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
            // r.db("brain_markets").table(`${market}_signals`).changes().run(conn).then((cursor) => {
            //     cursor.each((err, row) => {
            //         console.log(row)
            //         // socket.emit('chart-data', row.new_val)
            //         if(row.new_val.type == 'buy'){
            //             socket.emit('buy-signal', row.new_val);
            //         }
            //         if(row.new_val.type == 'sell'){
            //             socket.emit('sell-signal', row.new_val)
            //         }
            //     })
            // }).catch((e) => {
            //     console.log("Table")
            // })
        })
    })
})
console.log("SOCKET LISTENING ON 7001")

r.connect({
    host: "35.180.0.174",
    port: 28015
}).then((conn) => {
    r.db('brain_markets').table('smort_chart_signals').run(conn).then((cur) => {
        cur.toArray().then((data) => {
            console.log(data)
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
    let name = body.name.toLowerCase().replace(/[/ ]/g, "_");
    console.log(name)
    r.connect({
        host: "35.180.0.174",
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
        host: "35.180.0.174",
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
        host: "35.180.0.174",
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
        host: "35.180.0.174",
        port: 28015
    }).then((conn) => {
        r.db("brain_markets").table(`${market}_signals`).distinct().limit(200).run(conn).then((data) => {
            data.toArray().then((data) => {
                res.send(data)
            })
        })
    })
})


app.get("/", (req, res) => {
    res.sendFile(__dirname + '/public/index.html')
})

var key = fs.readFileSync(__dirname + '/sslcert/selfsigned.key');
var cert = fs.readFileSync(__dirname + '/sslcert/selfsigned.crt');
var options = {
  key: key,
  cert: cert
};

var server = https.createServer(options, app);
server.listen(7000, () => {
    console.log(`Server started on Port 7000`)
})
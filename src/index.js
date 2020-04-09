const express = require("express")
const app = express()
const r = require("rethinkdb");
const dotenv = require('dotenv').config();
const https = require('https');
const fs = require('fs');
const bodyParser = require('body-parser');
const cors = require('cors');
const io = require('socket.io')(7001, {
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
                    if(!row.new_val){
                        cursor.close();
                    }
                    socket.emit('signal', row.new_val)
                }).catch(() => {
                    console.log("Table Removed.")    
                })
            }).catch((e) => {
                console.log("Table Removed.")
            })
        })
    })
})
console.log("SOCKET LISTENING ON 7001")

// r.connect({
//     host: "34.220.23.203",
//     port: 28015
// }).then((conn) => {
//     r.db('brain_markets').table('smort_chart_signals').run(conn).then((cur) => {
//         cur.toArray().then((data) => {
//             console.log(data)
//         })
//     })
// })

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


// serve the API with signed certificate on 443 (SSL/HTTPS) port
const httpsServer = https.createServer({
  key: fs.readFileSync(`${__dirname}/sslcert/selfsigned.key`),
  cert: fs.readFileSync(`${__dirname}/sslcert/selfsigned.crt`),
}, app);

httpsServer.listen(7000, () => {
    console.log(`Server started on Port 7000`)
})
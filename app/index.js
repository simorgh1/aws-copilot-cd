var getRawBody = require("raw-body");
var http = require("http");
const logger = require('pino-http')({
    prettyPrint: {
        levelFirst: true
    },
    prettifier: require('pino-pretty')
})

var server = http.createServer(function (req, res) {
    logger(req, res)
    getRawBody(req)
        .then(function (buf) {
            res.statusCode = 200;
            res.end(buf.toString().split("").reverse().join(""));
        })
        .catch(function (err) {
            res.statusCode = 500;
            res.end(err.message);
        })
});

server.listen(3000);

// gracefull shutdown
process.once('SIGTERM', function () {
    server.close();
});
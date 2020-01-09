var express = require('express'),
    bodyParser = require('body-parser');

var app = express();

var port = process.env.PORT || 3000;


app.use(function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    res.header("Access-Control-Allow-Methods", "POST, GET, OPTIONS, DELETE, PUT, PATCH");
    next();
});


app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

clientRouter = require('./server/routes/clientRoute.js');
botRouter = require('./server/routes/botRoute.js');
executionRouter = require('./server/routes/executionRoute.js');
snippetRouter = require('./server/routes/snippetRoute.js');
variableTypeRouter = require('./server/routes/variableTypeRoute.js');
userRouter = require('./server/routes/userRoute.js');
serverRouter = require('./server/routes/serverRoute.js');
metricsRouter = require('./server/routes/metricsRoute.js');
//routes = require('./server/routes/route.js');

app.use('/api', clientRouter);
app.use('/api', botRouter);
app.use('/api', executionRouter);
app.use('/api', snippetRouter);
app.use('/api', variableTypeRouter);
app.use('/api', userRouter);
app.use('/api', serverRouter);
app.use('/api', metricsRouter);


app.get('/', function (req, res) {
    res.send("Client API");
}).listen(port, function () {
    console.log("Running on PORT:" + port);
});

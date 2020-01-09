var express = require('express'),
    bodyParser = require('body-parser'),
    morgan = require('morgan'),
    routes = require('./routes'),
    api = require('./routes/api'),
    http = require('http'),
    path = require('path');

var app = module.exports = express();

app.set('views', __dirname + '/public/components');
app.set('view engine', 'jade');
app.use(morgan('dev'));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', routes.index);
app.get('/client/view/:name', routes.client);
app.get('/bot/view/:name', routes.bot);
app.get('/history/view/:name', routes.history);
app.get('/schedule/view/:name', routes.schedule);
app.get('/globalSettings/view/:name', routes.globalSettings);
app.get('/dashboard/view/:name', routes.dashboard);
app.get('/api/name', api.name);

app.all('/*', function (req, res) {
    res.render('index');
});

http.createServer(app).listen(app.get('port'), function () {
    console.log('Express server listening on port ' + app.get('port'));
});

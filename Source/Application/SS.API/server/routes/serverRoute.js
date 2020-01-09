var express = require('express');
var router = express.Router();

var server = require('../controllers/serverController.js');

router.get('/server', function (req, res, done) {
    server.getAllServer(req, res);
});

router.get('/batchservers', function (req, res, done) {
    server.getAllBatchServer(req, res);
});

router.post('/server', function (req, res, done) {
    server.createServer(req, res);
});

router.get('/server/:serverId', function (req, res, done) {
    server.findServerById(req, res);
});

router.delete('/server/:serverId', function (req, res, done) {
    server.deleteServer(req, res);
});

router.patch('/server/:serverId', function (req, res, done) {
    server.updateServer(req, res);
});

module.exports = router;
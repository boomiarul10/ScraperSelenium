var express = require('express');
var router = express.Router();

var client = require('../controllers/clientController.js');

router.get('/clients', function (req, res, done) {
    client.getAllClients(req, res);
});

router.get('/showClients', function (req, res, done) {
    client.getAllActiveClients(req, res);
});

router.get('/clientsList', function (req, res, done) {
    client.getClientList(req, res);
});

router.get('/clientDetails', function (req, res, done) {
    client.getClientDetailsList(req, res);
});

router.post('/clients', function (req, res, done) {
    client.createClient(req, res);
});

router.get('/clients/:clientId', function (req, res, done) {
    client.findClientById(req, res);
});

router.delete('/clients/:clientId', function (req, res, done) {
    client.deleteClient(req, res);
});

router.patch('/clients/:clientId', function (req, res, done) {
    client.updateClient(req, res);
});

module.exports = router;
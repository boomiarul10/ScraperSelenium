var express = require('express');
var router = express.Router();

var bot = require('../controllers/botController.js');

router.get('/botList/:clientId', function (req, res, done) {
    bot.getClientBotsList(req, res);
});

router.get('/clientBots', function (req, res, done) {
    bot.findClientBotsList(req, res);
});

router.get('/bot', function (req, res, done) {
    bot.getAllBots(req, res);
});

router.get('/bottype', function (req, res, done) {
    bot.getAllBotTypes(req, res);
});


router.post('/bot/:clientId', function (req, res, done) {
    bot.createBot(req, res);
});

router.get('/bot/:botId', function (req, res, done) {
    bot.findBotById(req, res);
});

router.delete('/bot/:botId', function (req, res, done) {
    bot.deleteBot(req, res);
});

router.patch('/bot/:botId', function (req, res, done) {
    bot.updateBot(req, res);
});

router.get('/botHistory/:botId', function (req, res, done) {
    bot.findBotHistoryById(req, res);
});

router.get('/botDetails/:clientId', function (req, res, done) {
    bot.findBotDetailsByClientId(req, res);
});

router.get('/clientDetails/:botId', function (req, res, done) {
    bot.findDetailsbyBotId(req, res);
});

module.exports = router;
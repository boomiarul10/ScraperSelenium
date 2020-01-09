var express = require('express');
var router = express.Router();

var user = require('../controllers/userController.js');

router.get('/user', function (req, res, done) {
    user.getAllUser(req, res);
});

router.post('/user', function (req, res, done) {
    user.createUser(req, res);
});

router.get('/user/:userId', function (req, res, done) {
    user.findUserById(req, res);
});

router.delete('/user/:userId', function (req, res, done) {
    user.deleteUser(req, res);
});

router.patch('/user/:userId', function (req, res, done) {
    user.updateUser(req, res);
});

module.exports = router;
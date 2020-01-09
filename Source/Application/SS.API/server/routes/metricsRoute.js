var express = require('express');
var router = express.Router();

var metrics = require('../controllers/metricsController.js');

router.get('/variance', function (req, res, done) {
    metrics.getVariance(req, res);
});


router.get('/executionstatus', function (req, res, done) {
    metrics.getRecentExecutionStatus(req, res);
});

router.get('/serverexecdetails', function (req, res, done) {
    metrics.getServerDetails(req, res);
});

module.exports = router;
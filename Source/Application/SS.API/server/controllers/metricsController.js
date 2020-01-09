var Sequelize = require('sequelize');
var config = require('../config/config');

var sequelize = new Sequelize(config.url);

var metricsController = function () { };

metricsController.prototype.getVariance = function (req, res) {
    sequelize.query('SELECT * from  public.getvariance()',
        { type: sequelize.QueryTypes.SELECT }
    )
        .then(function (variance) {
            res.status(200).json(variance);
        })
        .catch(function (error) {
            res.status(500).json(error);
        });
}

metricsController.prototype.getRecentExecutionStatus = function (req, res) {
    sequelize.query('SELECT * from  public.getrecentexecutionstatus() ORDER BY clientname',
        { type: sequelize.QueryTypes.SELECT }
    )
        .then(function (execstatus) {
            res.status(200).json(execstatus);
        })
        .catch(function (error) {
            res.status(500).json(error);
        });
}

metricsController.prototype.getServerDetails = function (req, res) {
    sequelize.query('SELECT * from  public.getserverdetails()',
        { type: sequelize.QueryTypes.SELECT }
    )
        .then(function (serverdetails) {
            res.status(200).json(serverdetails);
        })
        .catch(function (error) {
            res.status(500).json(error);
        });
}

module.exports = new metricsController();
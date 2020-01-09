var botExecutionServerDetail = require( '../models' ).botexecutionserverdetails;
var batchServer = require( '../models' ).batchserverdetails;

var serverController = function () { };

serverController.prototype.getAllServer = function (req, res) {
    batchServer.findAll({
    })
        .then(function (server) {
        res.status(200).json(server);
    })
        .catch(function (error) {
        res.status(500).json(error);
    });
};

serverController.prototype.getAllBatchServer = function ( req, res ) {
	batchServer.findAll( {
		where: {
			active: true
		}
	} )
        .then( function ( server ) {
		res.status( 200 ).json( server );
	} )
        .catch( function ( error ) {
		res.status( 500 ).json( error );
	} );
};

serverController.prototype.createServer= function (req, res) {
	botExecutionServerDetail.create(req.body)
        .then(function (newServer) {
        res.status(200).json(newServer);
    })
        .catch(function (error) {
        res.status(500).json(error);
    });
};

serverController.prototype.deleteServer = function (req, res) {
	botExecutionServerDetail.destroy({
        where: {
            id: req.params.serverId
        }
    })
        .then(function (deletedRecords) {
        res.status(200).json(deletedRecords);
    })
        .catch(function (error) {
        res.status(500).json(error);
    });
};

serverController.prototype.updateServer = function (req, res) {
	botExecutionServerDetail.update(req.body, {
        where: {
            id: req.params.serverId
        }
    })
        .then(function (updatedRecords) {
        res.status(200).json(updatedRecords);
    })
        .catch(function (error) {
        res.status(500).json(error);
    });
};

serverController.prototype.findServerById = function (req, res) {
	botExecutionServerDetail.findById(req.params.serverId, {
    })
        .then(function (server) {
        res.status(200).json(server);
    })
        .catch(function (error) {
        res.status(500).json(error);
    });
};

module.exports = new serverController();
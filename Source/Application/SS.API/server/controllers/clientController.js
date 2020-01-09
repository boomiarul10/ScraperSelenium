var Client = require('../models').client;

var clientController = function () { };

clientController.prototype.getAllClients = function (req, res) {
    Client.findAll({
        order: '"name"'
    })
        .then(function (clients) {
            res.status(200).json(clients);
        })
        .catch(function (error) {
            res.status(500).json(error);
        });
};

clientController.prototype.getAllActiveClients = function (req, res) {
    Client.findAll({
        where : { active: true }
    })
        .then(function (clients) {
        res.status(200).json(clients);
    })
        .catch(function (error) {
        res.status(500).json(error);
    });
};

clientController.prototype.createClient = function (req, res) {
    Client.create(req.body)
        .then(function (newClient) {
            res.status(200).json(newClient);
        })
        .catch(function (error) {
            res.status(500).json(error);
        });
};

clientController.prototype.deleteClient = function (req, res) {
    Client.destroy({
        where: {
            id: req.params.clientId
        }
    })
        .then(function (deletedRecords) {
            res.status(200).json(deletedRecords);
        })
        .catch(function (error) {
            res.status(500).json(error);
        });
};

clientController.prototype.updateClient = function (req, res) {
    Client.update(req.body, {
        where: {
            id: req.params.clientId
        }
    })
        .then(function (updatedRecords) {
            res.status(200).json(updatedRecords);
        })
        .catch(function (error) {
            res.status(500).json(error);
        });
};

clientController.prototype.findClientById = function (req, res) {
    Client.findById(req.params.clientId, {
    })
        .then(function (client) {
            res.status(200).json(client);
        })
        .catch(function (error) {
            res.status(500).json(error);
        });
};

clientController.prototype.getClientList = function (req, res) {
    Client.findAll({
        attributes: ['name']
    })
        .then(function (clients) {
            res.status(200).json(clients);
        })
        .catch(function (error) {
            res.status(500).json(error);
        });

};

clientController.prototype.getClientDetailsList = function (req, res) {
    Client.findAll({
        attributes: ['name', 'active', 'retry', 'intreval', 'isconcurrent']
    })
        .then(function (clients) {
            res.status(200).json(clients);
        })
        .catch(function (error) {
            res.status(500).json(error);
        });

};

module.exports = new clientController();
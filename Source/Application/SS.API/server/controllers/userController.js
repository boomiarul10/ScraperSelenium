var User = require('../models').userdetail;

var userController = function () { };

userController.prototype.getAllUser = function (req, res) {
    User.findAll({
    })
        .then(function (user) {
            res.status(200).json(user);
        })
        .catch(function (error) {
            res.status(500).json(error);
        });
};

userController.prototype.createUser = function (req, res) {
    User.create(req.body)
        .then(function (newUser) {
            res.status(200).json(newUser);
        })
        .catch(function (error) {
            res.status(500).json(error);
        });
};

userController.prototype.deleteUser = function (req, res) {
    User.destroy({
        where: {
            id: req.params.userId
        }
    })
        .then(function (deletedRecords) {
            res.status(200).json(deletedRecords);
        })
        .catch(function (error) {
            res.status(500).json(error);
        });
};

userController.prototype.updateUser = function (req, res) {
    User.update(req.body, {
        where: {
            id: req.params.userId
        }
    })
        .then(function (updatedRecords) {
            res.status(200).json(updatedRecords);
        })
        .catch(function (error) {
            res.status(500).json(error);
        });
};

userController.prototype.findUserById = function (req, res) {
    User.findById(req.params.userId, {
    })
        .then(function (user) {
            res.status(200).json(user);
        })
        .catch(function (error) {
            res.status(500).json(error);
        });
};

module.exports = new userController();
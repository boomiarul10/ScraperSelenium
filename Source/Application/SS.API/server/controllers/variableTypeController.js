var VariableType = require('../models').variabletype;
var variableTypeHistory = require('../models').variabletypehistory;
var exec = require('child_process').exec;
var fileRepo = require('../config/const.json');

var variableTypeController = function () { };

variableTypeController.prototype.getAllVariableType = function (req, res) {
    VariableType.findAll({
        order: 'id ASC'
    })
        .then(function (variabletype) {
            res.status(200).json(variabletype);
        })
        .catch(function (error) {
            res.status(500).json(error);
        });
};

variableTypeController.prototype.getAllActiveVariableType = function (req, res) {
    VariableType.findAll({
        where: { active: true },
        order: 'id ASC'
    })
        .then(function (variabletype) {
        res.status(200).json(variabletype);
    })
        .catch(function (error) {
        res.status(500).json(error);
    });
};

variableTypeController.prototype.createVariableType = function (req, res) {
    VariableType.create(req.body)
        .then(function (newvariabletype) {
            variableTypeHistory.create({
                variabletypeid: newvariabletype.id,
                variabletypename: newvariabletype.name,
                active: newvariabletype.active,
                filepath: newvariabletype.filepath,
                description: newvariabletype.description,
                script: newvariabletype.script
            })
            exec(fileRepo.fileWriterPath + ' Variable ' + newvariabletype.id + ' true',
                function (error, stdout) {
                    if (error !== null) {
                        var json = { 'data': error.toString() };
                        //res.status(500).send(json);
                    }
                    else {
                        //res.json(stdout);
                    }
                });
            res.status(200).json(newvariabletype);
        })
        .catch(function (error) {
            res.status(500).json(error);
        });
};

variableTypeController.prototype.deleteVariableType = function (req, res) {
    VariableType.destroy({
        where: {
            id: req.params.variabletypeId
        }
    })
        .then(function (deletedRecords) {
            exec(fileRepo.fileWriterPath + ' Variable ' + deletedRecords.id + ' true',
                function (error, stdout) {
                    if (error !== null) {
                        var json = { 'data': error.toString() };
                        //res.status(500).send(json);
                    }
                    else {
                        //res.json(stdout);
                    }

                });
            res.status(200).json(deletedRecords);
        })
        .catch(function (error) {
            res.status(500).json(error);
        });
};

variableTypeController.prototype.updateVariableType = function (req, res) {
    VariableType.update(req.body, {
        where: {
            id: req.params.variabletypeId
        },
        returning: true
    })
        .then(function (updatedRecords) {
            variableTypeHistory.create({
                variabletypeid: req.params.variabletypeId,
                variabletypename: req.body.name,
                active: req.body.active,
                filepath: req.body.filepath,
                description: req.body.description,
                script: req.body.script
            })
                .catch(function (error) {
                    res.status(500).json(error);
                });
            exec(fileRepo.fileWriterPath + ' Variable ' + req.params.variabletypeId + ' true',
                function (error, stdout) {
                    if (error !== null) {
                        var json = { 'data': error.toString() };
                        //res.status(500).send(json);
                    }
                    else {
                        //res.json(stdout);
                    }

                });
            res.status(200).json(updatedRecords);
        })
        .catch(function (error) {
            res.status(500).json(error);
        });
};

variableTypeController.prototype.findVariableTypeById = function (req, res) {
    VariableType.findById(req.params.variabletypeId, {
    })
        .then(function (variabletype) {
            res.status(200).json(variabletype);
        })
        .catch(function (error) {
            res.status(500).json(error);
        });
};

variableTypeController.prototype.findTypeHistoryById = function (req, res) {
    variableTypeHistory.findAll({
        where: {
            variabletypeid: req.params.variabletypeId,
        }
    })
        .then(function (variabletype) {
            res.status(200).json(variabletype);
        })
        .catch(function (error) {
            res.status(500).json(error);
        });
};

module.exports = new variableTypeController();
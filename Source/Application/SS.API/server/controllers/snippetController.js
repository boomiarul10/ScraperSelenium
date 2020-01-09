var Snippet = require('../models').snippet;
var snippetHistory = require('../models').snippethistory;
var exec = require('child_process').exec;
var fileRepo = require('../config/const.json');

var snippetController = function () { };

snippetController.prototype.getAllSnippets = function (req, res) {
    Snippet.findAll({
        order: 'id ASC'
    })
        .then(function (snippet) {
            res.status(200).json(snippet);
        })
        .catch(function (error) {
            res.status(500).json(error);
        });
};

snippetController.prototype.getAllActiveSnippets = function (req, res) {
    Snippet.findAll({
        where : { active: true }
    })
        .then(function (snippet) {
        res.status(200).json(snippet);
    })
        .catch(function (error) {
        res.status(500).json(error);
    });
};

snippetController.prototype.createSnippet = function (req, res) {
    Snippet.create(req.body)
        .then(function (newSnippet) {
            snippetHistory.create({
                snippetid: newSnippet.id,
                snippetname: newSnippet.name,
                active: newSnippet.active,
                filepath: newSnippet.filepath,
                script: newSnippet.script
            })
            exec(fileRepo.fileWriterPath + ' Snippet ' + newSnippet.id + ' true',
                function (error, stdout) {
                    if (error !== null) {
                        var json = { 'data': error.toString() };
                        //res.status(500).send(json);
                    }
                    else {
                        //res.json(stdout);
                    }
                });
            res.status(200).json(newSnippet);
        })
        .catch(function (error) {
            res.status(500).json(error);
        });
};

snippetController.prototype.deleteSnippet = function (req, res) {
    Snippet.destroy({
        where: {
            id: req.params.snippetId
        }
    })
        .then(function (deletedRecords) {
            exec(fileRepo.fileWriterPath + ' Snippet ' + deletedRecords.id + ' true',
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

snippetController.prototype.updateSnippet = function (req, res) {
    Snippet.update(req.body, {
        where: {
            id: req.params.snippetId
        },
        returning: true
    })
        .then(function (updatedRecords) {
            snippetHistory.create({
                snippetid: req.params.snippetId,
                snippetname: req.body.name,
                active: req.body.active,
                filepath: req.body.filepath,
                script: req.body.script
            });
            exec(fileRepo.fileWriterPath + ' Snippet ' + req.params.snippetId + ' true',
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

snippetController.prototype.findSnippetById = function (req, res) {
    Snippet.findById(req.params.snippetId, {
    })
        .then(function (snippet) {
            res.status(200).json(snippet);
        })
        .catch(function (error) {
            res.status(500).json(error);
        });
};

snippetController.prototype.findSnippetHistoryById = function (req, res) {
    snippetHistory.findAll({
        where: {
            snippetid: req.params.snippetId,
        }
    })
        .then(function (snippet) {
            res.status(200).json(snippet);
        })
        .catch(function (error) {
            res.status(500).json(error);
        });
};

module.exports = new snippetController();
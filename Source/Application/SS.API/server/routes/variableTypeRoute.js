var express = require('express');
var router = express.Router();

var variableType = require('../controllers/variableTypeController.js');

router.get('/variabletype', function (req, res, done) {
    variableType.getAllVariableType(req, res);
});

router.get('/showVariabletype', function (req, res, done) {
    variableType.getAllActiveVariableType(req, res);
});

router.post('/variabletype', function (req, res, done) {
    variableType.createVariableType(req, res);
});

router.get('/variabletype/:variabletypeId', function (req, res, done) {
    variableType.findVariableTypeById(req, res);
});

router.delete('/variabletype/:variabletypeId', function (req, res, done) {
    variableType.deleteVariableType(req, res);
});

router.patch('/variabletype/:variabletypeId', function (req, res, done) {
    variableType.updateVariableType(req, res);
});

router.get('/variabletypeHistory/:variabletypeId', function (req, res, done) {
    variableType.findTypeHistoryById(req, res);
});

module.exports = router;
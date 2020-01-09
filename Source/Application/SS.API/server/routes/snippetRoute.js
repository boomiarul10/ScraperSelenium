var express = require('express');
var router = express.Router();

var snippet = require('../controllers/snippetController.js');

router.get('/snippet', function (req, res, done) {
    snippet.getAllSnippets(req, res);
});

router.get('/showSnippet', function (req, res, done) {
    snippet.getAllActiveSnippets(req, res);
});

router.post('/snippet', function (req, res, done) {
    snippet.createSnippet(req, res);
});

router.get('/snippet/:snippetId', function (req, res, done) {
    snippet.findSnippetById(req, res);
});

router.delete('/snippet/:snippetId', function (req, res, done) {
    snippet.deleteSnippet(req, res);
});

router.patch('/snippet/:snippetId', function (req, res, done) {
    snippet.updateSnippet(req, res);
});

router.get('/snippetHistory/:snippetId', function (req, res, done) {
    snippet.findSnippetHistoryById(req, res);
});

module.exports = router;
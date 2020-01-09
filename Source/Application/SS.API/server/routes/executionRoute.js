var express = require('express');
var router = express.Router();

var execution = require('../controllers/executionController.js');

router.get('/executionhistory', function (req, res, done) {
    execution.getBotExecutionHistory(req, res);
});

router.get('/executionhistorydetail/:botexecutionId', function (req, res, done) {
    execution.getBotExecutionDetail(req, res);
});

router.get('/botexecutionhistorylogs/:botexecutionId', function (req, res, done) {
    execution.getBotExecutionLogs(req, res);
});

router.post('/schedule/:clientId', function (req, res, done) {
    execution.createScheduleExecution(req, res);
});

router.post('/schedules/:clientId', function (req, res, done) {
    execution.saveSchedule(req, res);
});

router.get('/schedule/:clientId', function (req, res, done) {
    execution.getSchedules(req, res);
});

router.post('/botExecutionDetail', function (req, res, done) {
    execution.createBotExecutionServerDetail(req, res);
});

router.get('/schedules/:clientId', function (req, res, done) {
    execution.getSchedules(req, res);
});

router.get('/scheduleexecution/:scheduleId', function (req, res, done) {
    execution.getBotExecution(req, res);
});

router.get('/execution/:clientId', function (req, res, done) {
    execution.getClientExecution(req, res);
});

router.get('/botExecution/:botExecutionId', function (req, res, done) {
    execution.findBotByExecutionId(req, res);
});

router.get('/scheduleexecution/:scheduleId/:botexecutionId', function (req, res, done) {
    execution.findExecutionLogs(req, res);
});

router.get('/executionprogress', function (req, res, done) {
    execution.getExecutionProgressStatus(req, res);
});

router.get('/botexecutionlogs/:clientID/:botID/:createdAT/:updatedAT/:serverName/:executionStatus/:selectSort/:sortOrder', function (req, res, done) {
    execution.getBotExecutionHistory(req, res);
});

router.post('/scheduleExecution/:clientId', function (req, res, done) {
    execution.createScheduleExecution(req, res);
});

router.post('/botExecution', function (req, res, done) {
    execution.createBotExecution(req, res);
});

router.post('/executionLog', function (req, res, done) {
    execution.createExecutionLogs(req, res);
});

router.patch('/executionstatus/:executionId', function (req, res, done) {
    execution.updateExecutionStatus(req, res);
});

router.post('/executionbatchstatus/:executionId', function (req, res, done) {
    execution.updateExecutionStatus(req, res);
});

router.post('/checkbotexecutionstatusupdate/:executionId', function (req, res, done) {
    execution.updateExecutionStatusIfNotUpdated(req, res);
});

router.get('/checkbotexecutionstarted/:executionId', function (req, res, done) {
    execution.isBotExecutionStarted(req, res);
});

router.get('/stopbotexecution/:executionId', function (req, res, done) {
    execution.stopBotExecution(req, res);
});

router.get('/getallbotexecutionstatus', function (req, res, done) {
    execution.getAllBotExecutionStatus(req, res);
});

router.post('/updatebotexecutionserverdetail', function (req, res, done) {
    execution.updateBotExecutionServerDetail(req, res);
});

router.get('/ExecuteJDBot/:botId/:jobId', function (req, res, done) {
    execution.executeJDBot(req, res);
});

module.exports = router;
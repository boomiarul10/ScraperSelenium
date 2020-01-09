
var request = require('request');
var request_promise = require('request-promise');
var Promise = require('promise');
var config = global.createPackage().config;
var util = require(global.file.util);

exports.bot = {
    loadByScheduleId: async (botScheduleId) => {
        return new Promise((onsuccess, onfailure) => {
            var url = util.format(config.api.bot.getBotByScheduleId, botScheduleId);
            request_promise(url)
                .then((result) => {
                    if (result == null || result == 'null') {
                        onfailure("Bot Id Not found");
                    }
                    else {
                        onsuccess(JSON.parse(result));
                    }
                })
                .catch(onfailure);
        });
    },
    updatedScheduleStatus: async (botExecutionStatusId, logtypeid, jobCount, atsjobcount, failedJobCount) => {
        return new Promise((onsuccess, onfailure) => {
            var options = {
                method: 'PATCH',
                uri: util.format(config.api.bot.updateBotSchedule, botExecutionStatusId),
                body: {
                    logtypeid: logtypeid,
                    jobcount: jobCount,
                    atsjobcount: atsjobcount,
                    failedjobcount: failedJobCount
                },
                json: true
            };
            request_promise(options)
                .then((result) => {
                    if (result == null || result == 'null') {
                        onfailure("Update schedule status failed");
                    }
                    else {
                        onsuccess(JSON.parse(result));
                    }
                })
                .catch(onfailure);
        });
    },
    setExecutionProgress: async (botScheduleId, logType, message) => {
        return new Promise((onsuccess, onfailure) => {
            var options = {
                method: 'POST',
                uri: config.api.bot.postBotExecutionLogs,
                body: {
                    botexecutionid: botScheduleId,
                    logtypeid: logType,
                    message: message
                },
                json: true
            };
            request_promise(options)
                .then((result) => {
                    if (result == null || result == 'null') {
                        onfailure("Bot execution logs fails");
                    }
                    else {
                        onsuccess(JSON.parse(result));
                    }
                })
                .catch(onfailure);
        });
    },
    logExecutionMachine: (botScheduleId, processid) => {
        return new Promise((onsuccess, onfailure) => {
            var options = {
                method: 'POST',
                uri: config.api.bot.logExecutionMachineProcess,
                body: {
                    botexecutionid: botScheduleId,
                    processid: processid
                },
                json: true
            };
            request_promise(options)
                .then((result) => {
                    if (result == null || result == 'null') {
                        onfailure("Bot execution logs fails");
                    }
                    else {
                        onsuccess(true);
                    }
                })
                .catch(onfailure);
        });
    }
};
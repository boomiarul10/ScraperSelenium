var Promise = require('promise');
var dbApi = require(global.file.api_service);
var config = global.createPackage().config;
var package = global.createPackage();

exports.bot = {
    loadByScheduleId: async (botScheduleId) => {
        return new Promise((onsuccess, onfailure) => {
            dbApi.bot.loadByScheduleId(botScheduleId)
                .then(onsuccess)
                .catch(onfailure);
        });
    },
    setProgress: async (botScheduleId, activity, message) => {
        return new Promise((onsuccess, onfailure) => {
            logInConsole(botScheduleId, activity, message);
            dbApi.bot.setExecutionProgress(botScheduleId, activity, message)
                .then(onsuccess)
                .catch(onfailure);
        });
    },
    logExecutionMachine: (botScheduleId, processid) => {
        return new Promise((onsuccess, onfailure) => {
            dbApi.bot.logExecutionMachine(botScheduleId, processid)
                .then(onsuccess)
                .catch(onfailure);
        });
    },
    updatedScheduleStatus: async (botExecutionStatusId, logtypeid, jobCount, atsJobCount, failedJobCount) => {
        return new Promise((onsuccess, onfailure) => {
            dbApi.bot.updatedScheduleStatus(botExecutionStatusId, logtypeid, jobCount, atsJobCount, failedJobCount)
                .then(onsuccess)
                .catch(onfailure);
        });
    },
    createBotInput: (scheduleid, configuration, parameters) => {
        return new BotInputConfiguration(scheduleid, configuration, parameters);
    },
    createBotOutput: (scheduleid, jobcount, atsJobCount, failedJobCount) => {
        return new BotOutputConfiguration(scheduleid, jobcount, atsJobCount, failedJobCount);
    },
    createBotErrorOutput: (scheduleid, jobcount, atsJobCount, failedJobCount, error) => {
        return new BotOutputErrorConfiguration(scheduleid, jobcount, atsJobCount, failedJobCount, error);
    }
}

exports.log = {
    setProgress: (botScheduleId, logType, message) => {

        logInConsole(botScheduleId, logType, message);

        if (config.filelogEnabled == "true" || config.filelogEnabled == true) {
            //write appropriate method to write log data into file
        }
    }
};

var logInConsole = (botScheduleId, logType, message) => {
    var time = new Date();
    var timestamp = "Time - " + time.getHours() + ":" + time.getMinutes() + ":" + time.getSeconds();

    var log = package.resource.constants.log;
    var comment = "";
    switch (logType) {
        case log.logType.error:
            comment = log.mode.text("schedule id - " + botScheduleId + " : log Type - " + logType + " : message - ") + log.mode.error(message) + " : " + log.mode.text(timestamp);
            break;
        case log.logType.warning:
            comment = log.mode.text("schedule id - " + botScheduleId + " : log Type - " + logType + " : message - ") + log.mode.warning(message) + " : " + log.mode.text(timestamp);
            break;
        default:
            comment = log.mode.text("schedule id - " + botScheduleId + " : log Type - " + logType + " : message - ") + log.mode.text(message) + " : " + log.mode.text(timestamp);
            break;
    }
    console.log(comment);
}

// Bot Input Model
function BotInputConfiguration(scheduleid, configuration, parameters) {
    this.scheduleid = scheduleid;
    this.configuration = configuration;
    this.parameters = parameters;
}

// Bot Output Model
function BotOutputConfiguration(scheduleid, jobcount, atsjobcount, failedJobCount) {
    this.scheduleid = scheduleid;
    this.jobcount = jobcount;
    this.atsjobcount = atsjobcount;
    this.failedJobCount = failedJobCount;
}

function BotOutputErrorConfiguration(scheduleid, jobcount, atsjobcount, failedJobCount, error) {
    this.scheduleid = scheduleid;
    this.jobcount = jobcount;
    this.atsjobcount = atsjobcount;
    this.failedJobCount = failedJobCount;
    this.error = error;
}

// Initialize Defaults
var init = require(__dirname + '/init');
init.loadAppConstants();

// Load Package
var package = global.createPackage();

// Load Components
var util = package.util;
var service = package.service;
var resource = package.resource;
var config = package.config;

//Load Parameters
var process = require('process');
var parameter = util.readParameters(process);

// Logging Type Selection
var log = service.log;
if (config.dblogEnabled == "true" || config.dblogEnabled == true)
    log = service.bot;

var logType = resource.constants.log.logType;
var activity = resource.constants.log.activity;

(async () => {
    try {
        //await service.bot.logExecutionMachine(parameter.botScheduleId, process.pid);
        await service.bot.updatedScheduleStatus(parameter.botScheduleId, activity.scrapeType.inprogress, 0, 0, 0);
        try {
            await log.setProgress(parameter.botScheduleId, logType.activity, activity.bot.api.read.start);
            try {
                var botConfig = await service.bot.loadByScheduleId(parameter.botScheduleId);
                await log.setProgress(parameter.botScheduleId, logType.activity, activity.bot.download.started);

                //var botName = botConfig.execBotConfig.botClientConfig.clientDetails.name.toLowerCase() + "_" + botConfig.execBotConfig.name.toLowerCase();
                
                var bot = resource.download.bot("MSNew");
                if (bot != null) {

                    await log.setProgress(parameter.botScheduleId, logType.activity, activity.scrape.started)
                    var configuration = service.bot.createBotInput(parameter.botScheduleId, botConfig, parameter);

                    bot.execute(configuration)
                        .then(result => {
                            (async () => {
                                await log.setProgress(parameter.botScheduleId, logType.activity, activity.scrape.completed);
                                try {
                                    await service.bot.updatedScheduleStatus(parameter.botScheduleId, activity.scrapeType.completed, result.jobcount, result.atsjobcount, result.failedJobCount);
                                    process.exit();
                                } catch (err) {
                                    console.log(err);
                                    process.exit();
                                };
                            })();
                        }).catch(err => {
                            (async () => {
                                await log.setProgress(parameter.botScheduleId, logType.error, activity.scrape.failed);
                                await log.setProgress(parameter.botScheduleId, logType.error, err.error.message);
                                try {
                                    await service.bot.updatedScheduleStatus(parameter.botScheduleId, activity.scrapeType.failed, err.jobcount, err.atsjobcount, err.failedJobCount);
                                    process.exit();
                                } catch (err) {
                                    console.log(err);
                                    process.exit();
                                };
                            })();
                        });

                } else {
                    await log.setProgress(parameter.botScheduleId, logType.error, activity.bot.download.failed, "Bot file " + botConfig.name.toLowerCase() + " not found");
                    try {
                        await service.bot.updatedScheduleStatus(parameter.botScheduleId, activity.scrapeType.failed, 0, 0, 0);
                        process.exit();
                    } catch (err) {
                        console.log(err);
                        process.exit();
                    }
                }

            } catch (err) {
                await log.setProgress(parameter.botScheduleId, logType.error, activity.bot.api.read.failed);
                await log.setProgress(parameter.botScheduleId, logType.error, err.message);
                try {
                    await service.bot.updatedScheduleStatus(parameter.botScheduleId, activity.scrapeType.failed, 0, 0, 0);
                    process.exit();
                } catch (err) {
                    console.log(err);
                    process.exit();
                }
            }
        } catch (err) {
            console.log(err);
            process.exit();
        }
    } catch (err) {
        console.log(err);
        process.exit();
    }    

})();

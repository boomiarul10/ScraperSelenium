var Promise = require('promise');
var package = global.createPackage();
var http = require('http');
var fs = require('fs');
var path = require('path');
var service = package.service;
var resource = package.resource;
var log = resource.constants.log;
var selenium = package.scrape.selenium();
var botScheduleID = "";

exports.execute = (configuration) => {
    return new Promise((onsuccess, onfailure) => {
        try {
            var result = core(configuration, onsuccess, onfailure);
        } catch (e) {
            var output = package.service.bot.createBotErrorOutput(configuration.scheduleid, 0, 0, 0, e);
            onfailure(output);
        }
    });
}

var core = async (configuration, onsuccess, onfailure) => {
    try {
        botScheduleID = configuration.scheduleid;
        var options = {
            hostname: "api.icims.tmp.com",
            path: '/api/trocservice'
        };
        await service.bot.setProgress(botScheduleID, log.logType.activity, 'Requesting API call');
        var gsaReq = http.get(options, function (response) {
            var completeResponse = '';
            response.on('data', function (chunk) {
                completeResponse += chunk;
            });
            response.on('end', function () {
                var jobCount = (completeResponse.match(/<Job>/g)).length;
                var Filepath = package.config.outputRoot + configuration.configuration.execBotConfig.botClientConfig.clientDetails.name;
                var filename = configuration.configuration.execBotConfig.name + ".xml";
                var normalizedPath = path.normalize(Filepath + "/");
                package.util.createDirectory(normalizedPath)
                    .then(() => {
                        service.bot.setProgress(botScheduleID, log.logType.activity, log.activity.snippet.started + Filepath).then(values => {
                        });
                    });
                fs.writeFile(normalizedPath + filename, completeResponse, function (err) {
                    if (err) {
                        var output = package.service.bot.createBotErrorOutput(configuration.scheduleid, 0, 0, 0, err);
                        onfailure(output);
                    }
                    else {
                        service.bot.updatedScheduleStatus(botScheduleID, resource.constants.log.activity.scrapeType.completed, jobCount, jobCount, 0)
                            .then((data) => {
                            });                        
                    }
                });
            })
        }).on('error', function (e) {
            console.log('problem with request: ' + e.message);
        });
    }
    catch (e) {
        throw e;
    }

}
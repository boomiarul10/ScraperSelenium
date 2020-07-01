﻿var package = global.createPackage();
var async = require("async");
var fs = require('fs');
var jsonxml = require('jsontoxml');
var he = require('he');
var path = require('path');
var service = package.service;
var resource = package.resource;
var log = resource.constants.log;

exports.createInput = (configuration, jobs) => {
    return new snippetInput(configuration, jobs);
}

function snippetInput(configuration, jobs) {

    var input = {
        jobs: jobs.jobs,
        path: package.config.outputRoot + configuration.configuration.execBotConfig.botClientConfig.clientDetails.name,
        filename: configuration.configuration.execBotConfig.name + ".xml",
        botScheduleId: configuration.scheduleid
    };

    return input;

}

exports.execute = (input) => {
    return new Promise((onsuccess, onfailure) => {
        try {
            var normalizedPath = path.normalize(input.path + "/");
            package.util.createDirectory(normalizedPath)
                .then(() => {
                    service.bot.setProgress(input.botScheduleId, log.logType.activity, log.activity.snippet.started + input.path).then(values => {
                        var jobs = { "Objects": input.jobs };
                        var data = jsonxml(jobs, { escape: true, xmlHeader: true });
                        data = he.encode(data, {                           
                            'allowUnsafeSymbols': true
                        });
                        fs.writeFile(normalizedPath + input.filename, data, function (err) {
                            if (err) {
                                onfailure(err);
                            }
                            service.bot.setProgress(input.botScheduleId, log.logType.activity, log.activity.snippet.completed).then(values => {
                                onsuccess(input.jobs.length);
                            });
                        });
                    });
                })
                .catch((err) => {
                    onfailure(err);
                });

        } catch (e) {
            console.log(e);
        }
    });
}
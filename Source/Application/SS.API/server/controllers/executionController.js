var Sequelize = require('sequelize');
var config = require('../config/config');

var fileRepo = require('../config/const.json');

var sequelize = new Sequelize(config.url);
var exec = require('child_process').exec;
var async = require("async");
var prettyCron = require("prettycron");

var Schedule = require('../models').scheduleexecution;
var ExecBot = require('../models').botexecution;
var Logs = require('../models').executionlogs;
var botConfig = require('../models').botconfiguration;
var logType = require('../models').logtype;
var User = require('../models').userdetail;
var clientBots = require('../models').clientbotconfiguration;
var Client = require('../models').client;
var Botexecutionstatus = require('../models').botexecutionstatus;
var BotExecServerDetails = require('../models').botexecutionserverdetails;
botConfig.hasOne(ExecBot, { as: 'botconfigId', foreignKey: 'botconfigid' });
ExecBot.belongsTo(botConfig, { as: 'botconfigId', foreignKey: 'id' });
botConfig.hasOne(ExecBot, { as: 'execBotConfig', foreignKey: 'id' });
ExecBot.belongsTo(botConfig, { as: 'execBotConfig', foreignKey: 'botconfigid' });
Logs.hasOne(logType, { as: 'logtypeId', foreignkey: 'id' });
User.hasMany(botConfig, { as: 'userdetailId', foreignKey: 'id' });
botConfig.belongsTo(User, { as: 'userdetailId', foreignKey: 'userdetailid' });
botConfig.hasOne(clientBots, { as: 'botClientConfig', foreignKey: 'botconfigid' });
clientBots.belongsTo(botConfig, { as: 'botClientConfig', foreignKey: 'id' });
botConfig.hasOne(clientBots, { as: 'clientBotConfig', foreignKey: 'id' });
clientBots.belongsTo(botConfig, { as: 'clientBotConfig', foreignKey: 'botconfigid' });
Client.hasOne(clientBots, { as: 'clientDetails', foreignKey: 'id' });
clientBots.belongsTo(Client, { as: 'clientDetails', foreignKey: 'clientid' });
var clearRequire = require('clear-require');

var executionController = function () { };

executionController.prototype.getAllBotExecutionStatus = function (req, res) {
    Botexecutionstatus.findAll({
    })
        .then(function (server) {
            res.status(200).json(server);
        })
        .catch(function (error) {
            res.status(500).json(error);
        });
};

executionController.prototype.createScheduleExecution = function (req, res) {
    req.body.clientid = req.params.clientId;
    Client.findOne({
        where: {
            id: req.params.clientId,
            active: true
        }
    }).then(function (client) {
        if (client != null) {
            Schedule.create(req.body)
                .then(function (newSchedule) {
                    clientBots.findAll({
                        where: {
                            clientid: req.params.clientId,
                        },
                        include: [{ model: botConfig, as: 'clientBotConfig', where: { isdeleted: false, active: true } }]
                    })
                        .then(function (bots) {
                            GetExecutionArray(bots.length);
                            async.eachSeries(arrayValue, function (i, callback) {
                                ExecBot.create({
                                    botconfigid: bots[i].dataValues.botconfigid,
                                    userdetailid: req.body.userdetailid,
                                    scheduleexecutionid: newSchedule.dataValues.id,
                                    botexecutionstatusid: 2,
                                    jobcount: 0,
                                    atsjobcount: 0,
                                    failedjobcount: 0,
                                    isretry: false
                                }).catch(function (error) {
                                    res.status(500).json(error);
                                })
                                    .then(function (botexec) {
                                        Logs.create({
                                            botexecutionid: botexec.id,
                                            logtypeid: 3,
                                            message: 'Scrape Initiated'
                                        })
                                        exec(fileRepo.botExecutionPath + ' ' + botexec.id + ' ' + 'false',
                                            function (error, stdout) {
                                                callback();
                                                if (i + 1 == bots.length)
                                                    res.status(200).json("Schedule Execution added");

                                            });
                                    })
                            })

                        })
                        .catch(function (error) {
                            res.status(500).json(error);
                        });
                })
                .catch(function (error) {
                    res.status(500).json(error);
                });
        }
    });


};

executionController.prototype.saveSchedule = function (req, res) {

    var cronString = cronData(req.body, req.body.length);
    exec(fileRepo.clientExecutionPath + ' ' + req.params.clientId + ' true true "' + cronString + '"',
        function (error, stdout) {
            res.json(stdout);
        });

};

function cronData(cron, length) {
    sche = [];
    for (var i = 0; i < length; i++) {
        sche.push(cron[i]);
    }
    var cronString = sche.join('" "');
    return cronString;
}

executionController.prototype.createBotExecution = function (req, res) {

    Schedule.create({
        userdetailid: req.body.userdetailid,
        clientid: req.body.clientid
    })
        .then(function (newSchedule) {
            ExecBot.create({
                botconfigid: req.body.botconfigid,
                userdetailid: req.body.userdetailid,
                botexecutionstatusid: 2,
                scheduleexecutionid: newSchedule.id,
                jobcount: 0,
                atsjobcount: 0,
                failedjobcount: 0,
                isretry: false
            })
                .then(function (newBotSchedule) {
                    Logs.create({
                        botexecutionid: newBotSchedule.id,
                        logtypeid: 3,
                        message: 'Scrape Initiated'
                    })
                    exec(fileRepo.botExecutionPath + ' ' + newBotSchedule.id + ' ' + 'false',
                        function (error, stdout) {
                            res.status(200).json(newBotSchedule);

                        });
                })
                .catch(function (error) {
                    res.status(500).json(error);
                });
        })
        .catch(function (error) {
            res.status(500).json(error);
        });
};

executionController.prototype.createExecutionLogs = function (req, res) {
    Logs.create({
        botexecutionid: req.body.botexecutionid,
        logtypeid: req.body.logtypeid,
        message: req.body.message
    })
        .then(function (newLog) {
            res.status(200).json(true);
        })
        .catch(function (error) {
            res.status(500).json(error);
        });
};

// Framework - Api Methods
executionController.prototype.findBotByExecutionId = function (req, res) {
    ExecBot.findOne({
        where: {
            id: req.params.botExecutionId
        },
        include: [{
            model: botConfig, as: 'execBotConfig', where: { isdeleted: false },
            include: [{
                model: clientBots, as: 'botClientConfig',
                include: [{ model: Client, as: 'clientDetails' }]
            }]
        }]
    })
        .then(function (bot) {
            res.status(200).json(bot);
        })
        .catch(function (error) {
            res.status(500).json(error);
        });
}

executionController.prototype.createBotExecutionServerDetail = function (req, res) {
    BotExecServerDetails.create(req.body)
        .then(function (serverDetails) {
            res.status(200).json(serverDetails);
        })
        .catch(function (error) {
            res.status(500).json(error);
        });
};

executionController.prototype.updateBotExecutionServerDetail = function (req, res) {
    BotExecServerDetails.update({ processid: req.body.processid }, {
        where: { botexecutionid: req.body.botexecutionid },
        returning: true,
        plain: true
    })
        .then(function (serverDetails) {
            res.status(200).json(serverDetails);
        })
        .catch(function (error) {
            res.status(500).json(error);
        });
};


executionController.prototype.updateExecutionStatus = function (req, res) {
    ExecBot.update({
        botexecutionstatusid: req.body.logtypeid,
        jobcount: req.body.jobcount,
        atsjobcount: req.body.atsjobcount,
        failedjobcount: req.body.failedjobcount
    },
        {
            where: {
                id: req.params.executionId
            },
            returning: true,
            plain: true
        })
        .then(function (executionStatus) {
            res.status(200).json(true);
        })
        .catch(function (error) {
            res.status(500).json(error);
        });
};


executionController.prototype.stopBotExecution = function (req, res) {
    BotExecServerDetails.findOne({
        where: {
            botexecutionid: req.params.executionId
        }
    }).then(function (botExecServerDetails) {
        if (botExecServerDetails == null) {
            exec(fileRepo.interuptBotExecutionJarPath + " false" + ' ' + req.params.executionId,
                function (error, stdout) {
                    res.status(200).json("Bot Exection Stopped");
                });
        }
        else {
            exec(fileRepo.interuptBotExecutionJarPath + " true" + ' ' + botExecServerDetails.botexecutionid + ' ' + botExecServerDetails.servername + ' ' + botExecServerDetails.processid,
                function (error, stdout) {
                    res.status(200).json("Bot Exection Stopped");
                });
        }
    });
}

executionController.prototype.isBotExecutionStarted = function (req, res) {
    BotExecServerDetails.findOne({
        where: {
            botexecutionid: req.params.executionId
        }
    }).then(function (botExecutionServerDetail) {
        if (BotExecServerDetails == null) {
            res.status(200).json(null);
        }
        else
            res.status(200).json(botExecutionServerDetail);
    });
}

executionController.prototype.updateExecutionStatusIfNotUpdated = function (req, res) {
    ExecBot.findOne({
        where: {
            id: req.params.executionId
        },
        include: [{
            model: botConfig, as: 'execBotConfig', where: { isdeleted: false },
            include: [{
                model: clientBots, as: 'botClientConfig',
                include: [{ model: Client, as: 'clientDetails' }]
            }]
        }]
    })
        .then(function (bot) {
            if (bot.botexecutionstatusid != 1 && bot.botexecutionstatusid != 5) {
                ExecBot.update({
                    botexecutionstatusid: 3
                },
                    {
                        where: {
                            id: req.params.executionId
                        },
                        returning: true,
                        plain: true
                    })
                    .then(function (executionStatus) {
                        res.status(200).json(true);
                    })
                    .catch(function (error) {
                        res.status(500).json(error);
                    });
            }
        })
        .catch(function (error) {
            res.status(500).json(error);
        });
};

executionController.prototype.getBotExecutionLogs = function (req, res) {
    Logs.findAll({
        where: {
            botexecutionid: req.params.botexecutionId
        }
    }
    )
        .then(function (logs) {
            res.status(200).json(logs);
        })
        .catch(function (error) {
            res.status(500).json(error);
        });
}

executionController.prototype.getBotExecutionHistory = function (req, res) {
    ExecBot.findAll({
        where: {
            updated_at: {
                $lt: new Date(),
                $gt: new Date(new Date() - 72 * 60 * 60 * 1000)
            }
        },
        order: 'updated_at DESC',
        include: [{
            model: botConfig, as: 'execBotConfig', where: { isdeleted: false },
            include: [{
                model: clientBots, as: 'botClientConfig',
                include: [{ model: Client, as: 'clientDetails' }]
            }]
        }]
    })
        .then(function (bot) {
            res.status(200).json(bot);
        })
        .catch(function (error) {
            res.status(500).json(error);
        });
}

executionController.prototype.getBotExecutionDetail = function (req, res) {
    ExecBot.findOne({
        where: {
            id: req.params.botexecutionId
        },
        include: [{
            model: botConfig, as: 'execBotConfig', where: { isdeleted: false },
            include: [{
                model: clientBots, as: 'botClientConfig',
                include: [{ model: Client, as: 'clientDetails' }]
            }]
        }]
    })
        .then(function (bot) {
            res.status(200).json(bot);
        })
        .catch(function (error) {
            res.status(500).json(error);
        });
}


executionController.prototype.getBotExecution = function (req, res) {
    sequelize.query('SELECT * from getschedulehistory(:scheduleId)',
        { replacements: { scheduleId: req.params.scheduleId }, type: sequelize.QueryTypes.SELECT }

    )
        .then(function (execution) {
            GetExecutionArray(execution.length);
            async.eachSeries(arrayValue, function (i, callback) {
                Logs.findAll({
                    where: {
                        botexecutionid: execution[i].botexecutionid
                    },

                })
                    .then(function (botExecutionLogs) {
                        execution[i]["executionlogs"] = new Array();
                        if (botExecutionLogs.length > 0)
                            for (var j = 0; j < botExecutionLogs.length; j++) {
                                execution[i]["executionlogs"].push(botExecutionLogs[j].dataValues);
                                if (botExecutionLogs.length == j + 1) {
                                    if (execution.length == i + 1)
                                        res.status(200).json(execution)
                                    callback();
                                }
                            }
                        else {
                            if (execution.length == i + 1)
                                res.status(200).json(execution)
                            callback();
                        }

                    })
                    .catch(function (error) {
                        res.status(500).json(error);
                    });
            })
        })
        .catch(function (error) {
            res.status(500).json(error);
        });
}

var arrayValue;

function GetExecutionArray(count) {
    arrayValue = new Array();
    for (var i = 0; i < count; i++) {
        arrayValue.push(i);
    }
}

executionController.prototype.getClientExecution = function (req, res) {
    sequelize.query('SELECT * from getschedulestatus(:clientId) ORDER BY enddate DESC LIMIT 20',
        { replacements: { clientId: req.params.clientId }, type: sequelize.QueryTypes.SELECT }
    )
        .then(function (execution) {
            res.status(200).json(execution);
        })
        .catch(function (error) {
            res.status(500).json(error);
        });
}


executionController.prototype.getSchedules = function (req, res) {
    sequelize.query('SELECT cron_expression FROM qrtz_cron_triggers where trigger_name like :schedule',
        { replacements: { schedule: 'Client ' + req.params.clientId + ' Trigger%' }, type: sequelize.QueryTypes.SELECT }
    )
        .then(function (execution) {
            if (execution.length > 0) {
                for (var i = 0; i < execution.length; i++) {
                    var time = prettyCron.toString(execution[i].cron_expression, true);

                    time = time.split(" ");
                    execution[i].cron_expression = time[0];
                }
                execution.sort(function (a, b) {
                    for (var cron in a) {
                        var c = a[cron].split(":");
                        var d = b[cron].split(":");
                    }
                    if (parseInt(c[0]) > parseInt(d[0])) {
                        return 1;
                    }
                });
                res.status(200).json(execution);
            }
            else {
                res.status(200).json(execution);
            }
        })
        .catch(function (error) {
            res.status(500).json(error);
        });
}

executionController.prototype.getExecutionProgressStatus = function (req, res) {
    sequelize.query('SELECT * from  public.getexecutionprogressstatus() ORDER BY clientname',
        { type: sequelize.QueryTypes.SELECT }
    )
        .then(function (execution) {
            res.status(200).json(execution);
        })
        .catch(function (error) {
            res.status(500).json(error);
        });
}

executionController.prototype.getBotExecutionHistory = function (req, res) {
    if (req.params.clientID == "null")
        req.params.clientID = null;
    if (req.params.botID == "null")
        req.params.botID = null;
    if (req.params.executionStatus == "null")
        req.params.executionStatus = null;
    if (req.params.createdAT == "null")
        req.params.createdAT = null;
    if (req.params.updatedAT == "null")
        req.params.updatedAT = null;
    if (req.params.serverName == "null")
        req.params.serverName = null;
    if (req.params.selectSort == "null")
        req.params.selectSort = "clientname";
    if (req.params.sortOrder == "null")
        req.params.sortOrder = "ASC";
    var Sort = req.params.selectSort + ' ' + req.params.sortOrder;
    sequelize.query('SELECT * from  public.getbotexecutionhistory(:clientID, :botID, :createdat, :updatedat, :servername, :executionstatus) ORDER BY ' + Sort,
        { replacements: { clientID: req.params.clientID, botID: req.params.botID, createdat: req.params.createdAT, updatedat: req.params.updatedAT, servername: req.params.serverName, executionstatus: req.params.executionStatus}, type: sequelize.QueryTypes.SELECT }
    )
        .then(function (execution) {
            res.status(200).json(execution);
        })
        .catch(function (error) {
            res.status(500).json(error);
        });
}

executionController.prototype.executeJDBot = async (req, res) => {
    try {
        var botDetails = await botConfig.findOne({ where: { id: req.params.botId, isdeleted: false }, include: [{ model: clientBots, as: 'botConfig', include: [{ model: Client, as: 'clientDetails' }] }] });
        var botSchedule = await Schedule.create({ userdetailid: 1, clientid: botDetails.botConfig.clientDetails.dataValues.id });
        var botExecutionSchedule = await ExecBot.create({ botconfigid: req.params.botId, userdetailid: 1, botexecutionstatusid: 2, scheduleexecutionid: botSchedule.id, jobcount: 0, atsjobcount: 0, failedjobcount: 0, isretry: false });
        await Logs.create({ botexecutionid: botExecutionSchedule.id, logtypeid: 3, message: 'Scrape Initiated' });
        ExecBot.update({ botexecutionstatusid: 4 }, {
            where: { id: botExecutionSchedule.id }
        }).then(() => {
            var botFileName = botDetails.botConfig.clientDetails.dataValues.name.toLowerCase() + '_' + botDetails.dataValues.name.toLowerCase() + '.js'
            var botPath = botDetails.dataValues.filepath + '/bot/' + botFileName;
            var bot = downloadJDBot(botPath);
            var configuration = { jobID: req.params.jobId, botExecutionId: botExecutionSchedule.id, botDetail: botDetails.dataValues };
            bot.execute(configuration).then(job => {
                Logs.create({ botexecutionid: botExecutionSchedule.id, logtypeid: 3, message: "Scrape Completed" });
                ExecBot.update({ botexecutionstatusid: 1 }, {
                    where: { id: botExecutionSchedule.id }
                });
                
                res.contentType('application/xml').status(200).send(job);
            }).catch(error => {
                Logs.create({ botexecutionid: botExecutionSchedule.id, logtypeid: 1, message: error.message });
                Logs.create({ botexecutionid: botExecutionSchedule.id, logtypeid: 1, message: "Scrape Failed" });
                ExecBot.update({ botexecutionstatusid: 3 }, {
                    where: { id: botExecutionSchedule.id }
                });
                res.status(500).json(error);
            });
        });
    }
    catch (error) {
        await Logs.create({ botexecutionid: botExecutionSchedule.id, logtypeid: 4, message: error.message });
        await Logs.create({ botexecutionid: botExecutionSchedule.id, logtypeid: 4, message: 'Scrape Failed' });
        ExecBot.update({ botexecutionstatusid: 3 }, {
            where: { id: botExecutionSchedule.id }
        });
        res.status(500).json(error);
    }
};

function downloadJDBot(botPath) {
    try {
        //clearRequire(botPath);
        return require(botPath);
    } catch (e) {
        throw e;
    }
}


module.exports = new executionController();

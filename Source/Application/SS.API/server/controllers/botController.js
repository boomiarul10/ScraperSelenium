var exec = require('child_process').exec;
var Bot = require('../models').botconfiguration;
var User = require('../models').userdetail;
var botHistory = require('../models').bothistory;
var clientBots = require('../models').clientbotconfiguration;
var Client = require('../models').client;
var Bottype = require('../models').bottype;

var fileRepo = require('../config/const.json');

User.hasMany(Bot, { as: 'userdetailId', foreignKey: 'id' });
Bot.belongsTo(User, { as: 'userdetailId', foreignKey: 'userdetailid' });

Bot.hasOne(clientBots, { as: 'botConfig', foreignKey: 'botconfigid' });
clientBots.belongsTo(Bot, { as: 'botConfig', foreignKey: 'id' });

Bot.hasOne(clientBots, { as: 'clientBotConfig', foreignKey: 'id' });
clientBots.belongsTo(Bot, { as: 'clientBotConfig', foreignKey: 'botconfigid' });

Client.hasOne(clientBots, { as: 'clientDetails', foreignKey: 'id' });
clientBots.belongsTo(Client, { as: 'clientDetails', foreignKey: 'clientid' });

var botController = function () { };

botController.prototype.getAllBotTypes = function (req, res) {
    Bottype.findAll({        
    })
        .then(function (botType) {
            res.status(200).json(botType);
        })
        .catch(function (error) {
            res.status(500).json(error);
        });
};

botController.prototype.getAllBots = function (req, res) {
    Bot.findAll({
        include: [{ model: User, as: 'userdetailId' }], 
        order: 'id ASC'
    })
        .then(function (bot) {
        res.status(200).json(bot);
    })
        .catch(function (error) {
        res.status(500).json(error);
    });
};

botController.prototype.createBot = function (req, res) {
    Bot.create(req.body)
        .then(function (newBot) {
        botHistory.create({
            botconfigid: newBot.id,
            //botname: newBot.name,
            browsertype: newBot.browsertype,
            outputpath: newBot.outputpath,
            active: newBot.active,
            script: newBot.script,
            filepath: newBot.filepath
        });
        clientBots.create({
            clientid: req.params.clientId,
            botconfigid: newBot.id
        });
        exec(fileRepo.fileWriterPath + ' Bot ' + newBot.id + ' true',
            function (error, stdout) {
                if (error !== null) {
                    var json = { 'data': error.toString() };
                    //res.status(500).send(json);
                }
                else {
                    //res.json(stdout);
                }

            });
        res.status(200).json(newBot);
    })
        .catch(function (error) {
        res.status(500).json(error);
    });
};

botController.prototype.deleteBot = function (req, res) {
    Bot.update({
        isdeleted: true
    }, {
        where: {
            id: req.params.botId
        }
    })
        .then(function (deletedRecords) {
        botHistory.create({
            botconfigid: req.params.botId,
            //botname: req.body.name,
            browsertype: req.body.browsertype,
            outputpath: req.body.outputpath,
            active: req.body.active,
            script: req.body.script,
            filepath: req.body.filepath,
            message: 'Bot is deleted'
        })
        exec(fileRepo.fileWriterPath + ' Bot ' + req.params.botId + ' true',
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

botController.prototype.updateBot = function (req, res) {
    Bot.update(req.body, {
        where: {
            id: req.params.botId
        },
        returning: true
    })
        .then(function (updatedRecords) {
        botHistory.create({
            botconfigid: req.params.botId,
            //botname: req.body.name,
            browsertype: req.body.browsertype,
            outputpath: req.body.outputpath,
            active: req.body.active,
            script: req.body.script,
            filepath: req.body.filepath
        })
        exec(fileRepo.fileWriterPath + ' Bot ' + req.params.botId + ' true',
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

botController.prototype.findBotById = function (req, res) {
    Bot.findById(req.params.botId, {
    })
        .then(function (bot) {
        res.status(200).json(bot);
    })
        .catch(function (error) {
        res.status(500).json(error);
    });
};

botController.prototype.getClientBotsList = function (req, res) {
    clientBots.findAll({
        where: {
            clientid: req.params.clientId,
        },
        order: 'id ASC',
        include: [{ model: Bot, as: 'clientBotConfig', where: { isdeleted: false } }]
    })
        .then(function (bots) {
        res.status(200).json(bots);
    })
        .catch(function (error) {
        res.status(500).json(error);
    });
};

botController.prototype.findBotHistoryById = function (req, res) {
    botHistory.findAll({
        where: {
            botconfigid: req.params.botId,
        }
    })
        .then(function (bot) {
        res.status(200).json(bot);
    })
        .catch(function (error) {
        res.status(500).json(error);
    });
};

botController.prototype.findClientBotsList = function (req, res) {
    Bot.findAll({
        where: { isdeleted: false },
        order: 'id ASC', 
        include: [{
                model: clientBots, as: 'botConfig',
                include: [{ model: Client, as: 'clientDetails' }]
            }]
    })
        .then(function (bots) {
        res.status(200).json(bots);
    })
        .catch(function (error) {
        res.status(500).json(error);
    });
};

botController.prototype.findBotDetailsByClientId = function (req, res) {
    clientBots.findAll({
        where: {
            clientid: req.params.clientId,
        },
        order: 'id ASC',
        include: [{ model: Bot, as: 'clientBotConfig', where: { isdeleted: false, active:true } }]
    })
        .then(function (bots) {
        res.status(200).json(bots);
    })
        .catch(function (error) {
        res.status(500).json(error);
    });
};

botController.prototype.findDetailsbyBotId = function (req, res) {
    Bot.findOne({
        where: { id : req.params.botId, isdeleted: false },
        include: [{
                model: clientBots, as: 'botConfig',
                include: [{ model: Client, as: 'clientDetails' }]
            }]
    })
        .then(function (bots) {
        res.status(200).json(bots);
    })
        .catch(function (error) {
        res.status(500).json(error);
    });
};

module.exports = new botController();

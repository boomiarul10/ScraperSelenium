
exports.loadAppConstants = () => {
    global.path = loadPath();
    global.file = loadFile();
    global.createPackage = loadPackages;
}

var createConstant = (object, name, value) => {
    Object.defineProperty(object, name, {
        value: value,
        writable: false,
        enumerable: true,
        configurable: true
    });
}

var loadPath = () => {
    var path = require('path');
    var paths = {};
    var root = path.resolve(__dirname) + "/";

    createConstant(paths, "root", root);
    createConstant(paths, "bot", root + "bot/");
    createConstant(paths, "snippet", root + "snippet/");
    createConstant(paths, "variable", root + "variable/");
    return paths;
}

var loadFile = () => {
    var path = require('path');
    var files = {}
    var root = path.resolve(__dirname) + "/";

    createConstant(files, "util", root + "components/ss.util");
    createConstant(files, "resource", root + "components/ss.resource");
    createConstant(files, "scrape", root + "components/ss.scrape");
    createConstant(files, "service", root + "components/ss.service");
    createConstant(files, "api_service", root + "components/ss.api.service");
    createConstant(files, "config", root + "config.json");
    createConstant(files, "config_production", root + "config.prod.json");
    createConstant(files, "config_staging", root + "config.staging.json");
    return files;
}

var loadPackages = () => {
    return new createPackage();
}

function createPackage() {
    var env = process.env.NODE_ENV || 'development';

    this.service = require(global.file.service);
    this.resource = require(global.file.resource);
    this.util = require(global.file.util);
    this.config = readConfiguration(env);
    this.scrape = require(global.file.scrape);
}

var readConfiguration = (environment) => {
    var config = require(global.file.config);
    switch (environment.toLowerCase()) {
        case "development":
            config = require(global.file.config);
            break;
        case "staging":
            config = require(global.file.config_staging);
            break;
        case "production":
            config = require(global.file.config_production);
            break;
        default:
            config = require(global.file.config);
            break;
    }
    return config;
}
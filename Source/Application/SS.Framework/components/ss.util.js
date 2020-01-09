var mkdir = require('mkdirp')

exports.readParameters = function (process) {

    //read the parameters and return them in Json
    var botScheduleId = 1;
    if (process.argv.length > 2) {
        botScheduleId = process.argv[2];
    }

    return {
        botScheduleId: botScheduleId
        //,...
    };
}

exports.format = function (value) {
    var formatted = value;
    for (var i = 1; i < arguments.length; i++) {
        var regexp = new RegExp('\\{' + (i - 1) + '\\}', 'gi');
        formatted = formatted.replace(regexp, arguments[i]);
    }
    return formatted;
};

exports.createDirectory = async (normalizedPath) => {
    return new Promise((onsuccess, onfailure) => {
        mkdir(normalizedPath, function (err) {
            if (err) {
                onfailure(err);
            }
            else {
                onsuccess();
            }
        });
    });
}

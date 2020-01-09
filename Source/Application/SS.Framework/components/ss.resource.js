var chalk = require('chalk');

exports.constants = {
    log: {
        logType: {
            activity: 3,
            warning: 2,
            error: 1
        },
        mode: {
            error: (message) => {
                return chalk.bgBlack(chalk.red(message));
            },
            warning: (message) => {
                return chalk.bgBlack(chalk.yellow(message));
            },
            text: (message) => {
                return chalk.green(message);
            }
        }
        ,
        activity: {
            snippet: {
                download: "Loading snippet ",
                started: "Writing Feed at : ",
                completed: "Feed Generated Successfully",
				failed:"Variance Limit Exceeded 50%"
            },

            scrape: {
                started: "Scraping Started",
                completed: "Scraping Completed",
                failed: "Scraping Failed"
            },
            scrapeType: {
                completed: 1,
                notstarted: 2,
                failed: 3,
                inprogress: 4

            },
            bot: {
                api: {
                    read: {
                        start: "Loading Bot data from API",
                        completed: "Bot details loaded successfully from DB",
                        failed: "Failed to load Bot details from DB"
                    }
                },
                download: {
                    started: "Bot download started",
                    completed: "Bot download successfully",
                    failed: "Bot download failed"
                }
            }

        }
    }
};

exports.config = global.createPackage().config;

exports.download = {
    bot: (name) => {
        try {
            return require(global.path.bot + name.toLowerCase());
        } catch (e) {
            return null;
        }
    },
    snippet: (name) => {
        try {
            return require(global.path.snippet + name.toLowerCase());
        } catch (e) {
            return null;
        }
    },
    variable: (name) => {
        try {
            return require(global.path.variable + name.toLowerCase());
        } catch (e) {
            return null;
        }
    }
}
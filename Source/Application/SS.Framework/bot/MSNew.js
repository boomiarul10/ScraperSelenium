var Promise = require('promise');
var package = global.createPackage();
var he = require('he');
var cleanHtml = require('clean-html');
var feed = require("feed-read");
var service = package.service;
var resource = package.resource;
var log = resource.constants.log;
var selenium = package.scrape.selenium();
var jobMaker = package.resource.download.variable("job");
jobMaker.setAlertCount(5);
var botScheduleID = "";

exports.execute = (configuration) => {
    return new Promise((onsuccess, onfailure) => {
        try {
            var result = core(configuration, onsuccess, onfailure);
        } catch (e) {
            var output = package.service.bot.createBotErrorOutput(configuration.scheduleid, jobMaker.jobs.length, jobMaker.atsJobCount, jobMaker.failedJobs.length, e);
            onfailure(output);
        }
    });
}

var core = async (configuration, onsuccess, onfailure) => {
    try {
        botScheduleID = configuration.scheduleid;
        var By = selenium.By;
        var until = selenium.until;
        var driver = selenium.createDriver(configuration.configuration.execBotConfig.browsertype.toLowerCase());

        feed("https://management-config.tal.net/vx/mobile-0/appcentre-2/brand-4/candidate/jobboard/vacancy/4/feed", async function (err, jobsContent) {
            if (err) throw err;
            jobMaker.setatsJobCount(jobsContent.length);
            for (var item in jobsContent) {
                try {
                    var val = jobsContent[item];
                    var title = val.title;
                    var l3Url = val.id;
                    var description = val.content;
                    var date = val.published;
                    var url = val.link.getAttribute("href");
                    var job = jobMaker.create();
                    job.TEXT = description;
                    job.ASSIGNMENT_START_DATE = date;
                    job.JOB_APPLY_URL = url;
                    await driver.get(l3Url);
                    await driver.sleep(3000);
                    var idElement = await driver.findElement(By.xpath("//div[@id='form_label_93306_1']"));
                    var idVal = await idElement.getText();
                    var locElement = await driver.findElement(By.xpath("//div[@id='form_label_93306_1']"));
                    var locVal = await locElement.getText();
                    var catElement = await driver.findElement(By.xpath("//div[@id='form_field_97324_1']"));
                    var catVal = await catElement.getText();
                    var typeElement = await driver.findElement(By.xpath("//div[@id='form_field_97313_1']"));
                    var typeVal = await typeElement.getText();
                    job.JOB_CATEGORY = catVal;
                    job.JOB_LOCATION_CITY = locVal;
                    job.JOB_TYPE = typeVal;
                    job.JOB_LOCATION_COUNTRY = "United Kingdom";
                    jobMaker.successful.add(job, botScheduleID);
                }
                } catch (e) {
                jobMaker.failed.add(job.JDTID_UNIQUE_NUMBER, e.message);
            }
            await driver.quit();
            snippet(configuration, jobMaker.atsJobCount, jobMaker.failedJobs.length, jobMaker, onsuccess, onfailure);
        });
    } catch (e) {
        await driver.quit();
        var output = package.service.bot.createBotErrorOutput(configuration.scheduleid, jobMaker.jobs.length, jobMaker.atsJobCount, jobMaker.failedJobs.length, e);
        onfailure(output);
    }
}
function HtmlEscape(description) {
    description = he.encode(description, { 'useNamedReferences': true, 'decimal': true, 'allowUnsafeSymbols': true });
    description = description.replace(/&#9;/g, ' ');
    description = description.replace(/&nbsp;/g, ' ');
    description = description.replace(/\s\s+/g, ' ');
    description = description.replace(/\r?\n|\r/g, '');
    return description;
}

var snippet = (configuration, atsJobCount, failedJobCount, jobs, onsuccess, onfailure) => {
    service.bot.setProgress(botScheduleID, log.logType.activity, log.activity.snippet.download + "Feed Generator").then(values => {
        var snippet = package.resource.download.snippet("feedgenerator");
        var input = snippet.createInput(configuration, jobs);
        snippet
            .execute(input)
            .then(jobcount => {
                var output = package.service.bot.createBotOutput(configuration.scheduleid, jobcount, jobMaker.atsJobCount, jobMaker.failedJobs.length);
                onsuccess(output);
            })
            .catch(err => {
                var output = package.service.bot.createBotErrorOutput(configuration.scheduleid, jobMaker.jobs.length, jobMaker.atsJobCount, jobMaker.failedJobs.length, err);
                onfailure(output);
            });
    });
}
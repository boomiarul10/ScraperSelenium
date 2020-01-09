var Promise = require('promise');
var package = global.createPackage();
var he = require('he');
var service = package.service;
var resource = package.resource;
var log = resource.constants.log;
var selenium = package.scrape.selenium();
var jobMaker = package.resource.download.variable("job");
jobMaker.setAlertCount(1);
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
        var driverjobdetails = selenium.createDriver(configuration.configuration.execBotConfig.browsertype.toLowerCase());

        await driver.get('https://can850.dayforcehcm.com/CandidatePortal/en-US/yyc');
        
        var atsJobCount = await driver.findElements(By.xpath('/html/body/div[2]/div[2]/div/div[1]/div'));
        var atscount = await atsJobCount.length;
        jobMaker.setatsJobCount(parseInt(atscount));
        var counter = 1;
        do {
            var jobContainer = await driver.findElements(By.xpath('/html/body/div[2]/div[2]/div/div[1]/div[' + counter + ']/div[1]/a'));
            var isPresent = await jobContainer.length;
            if (isPresent) {
                try {
                    var job = jobMaker.create();
                    var element = await driver.findElement(By.xpath('/html/body/div[2]/div[2]/div/div[1]/div[' + counter + ']/div[1]/a'));
                    var id = await element.getAttribute("href");
                    await driverjobdetails.get(id);

                    var jobdetailspage = await driverjobdetails.findElements(By.xpath("/html/body/div[2]/div[2]/div/div[1]"));
                    var isDetailPage = await jobdetailspage.length;
                    if (isDetailPage) {
                        var titleElement = await driverjobdetails.findElement(By.xpath('/html/body/div[2]/div[1]/div[3]'));
                        job.JOB_TITLE = await titleElement.getText();
                        var idElement = await driverjobdetails.findElement(By.xpath('/html/body/div[2]/div[1]/div[2]'));
                        job.JDTID_UNIQUE_NUMBER = await idElement.getText();
                        var dateElement = await driverjobdetails.findElement(By.xpath('/html/body/div[2]/div[1]/div[4]/div[4]'));
                        var date = await dateElement.getText();

                        if (date) {
                            var dateArr = date.split("Date:");
                            job.ASSIGNMENT_START_DATE = dateArr[0];
                        }

                        if (job.JOB_TITLE.includes("Student")) {
                            job.JOB_CATEGORY = "Student";
                        }
                        else {
                            job.JOB_CATEGORY = "Employee Category";
                        }
                        job.JOB_LOCATION_CITY = "Calgary";
                        job.JOB_LOCATION_STATE = "Alberta";
                        job.JOB_LOCATION_COUNTRY = "Canada";

                        var applyElement = await driverjobdetails.findElement(By.xpath("/html/body/div[2]/div[2]/div/div[3]/a"));
                        job.JOB_APPLY_URL = await applyElement.getAttribute("href");

                        var JobDescription = await driverjobdetails.findElement(By.xpath("/html/body/div[2]/div[2]/div/div[1]"));
                        var desc = await JobDescription.getAttribute("outerHTML");
                        if (desc) {
                            job.TEXT = HtmlEscape(desc);
                        }
                    }
                    jobMaker.successful.add(job, botScheduleID);
                    counter++;
                } catch (e) {
                    jobMaker.failed.add(job.JDTID_UNIQUE_NUMBER, e.message);
                    counter++;
                }
            }
        } while (isPresent);

        await driver.quit();
        await driverjobdetails.quit();
        await snippet(configuration, jobMaker.atsJobCount, jobMaker.failedJobs.length, jobMaker, onsuccess, onfailure);
    } catch (err) {
        await driver.quit();
        await driverjobdetails.quit();
        var output = package.service.bot.createBotErrorOutput(configuration.scheduleid, jobMaker.jobs.length, jobMaker.atsJobCount, jobMaker.failedJobs.length, err);
        onfailure(output);
    }
}

function HtmlEscape(description) {
    description = he.encode(description, { 'useNamedReferences': true, 'decimal': true, 'allowUnsafeSymbols': true });
    description = description.replace(/&#9;/g, ' ');
    description = description.replace(/&nbsp;/g, '');
    description = description.replace(/\s\s+/g, ' ');
    description = description.replace(/\r?\n|\r/g, '');
    return description;
}

var snippet = async (configuration, atsJobCount, failedJobCount, jobs, onsuccess, onfailure) => {
    await service.bot.setProgress(botScheduleID, log.logType.activity, log.activity.snippet.download + "feedgeneratorwithasync");
    var snippet = await package.resource.download.snippet("feedgeneratorwithasync");
    var input = await snippet.createInput(configuration, jobs);

    var jobcount = await snippet.execute(input);
    try {
        var output = await package.service.bot.createBotOutput(configuration.scheduleid, jobcount, jobMaker.atsJobCount, jobMaker.failedJobs.length);
        onsuccess(output);
    }
    catch (err) {
        var output = package.service.bot.createBotErrorOutput(configuration.scheduleid, jobMaker.jobs.length, jobMaker.atsJobCount, jobMaker.failedJobs.length, err);
        onfailure(output);
    }
}
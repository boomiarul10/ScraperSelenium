var Promise = require('promise');
var package = global.createPackage();
var he = require('he');
var service = package.service;
var resource = package.resource;
var log = resource.constants.log;
var selenium = package.scrape.selenium();
var jobMaker = package.resource.download.variable("job");

jobMaker.setAlertCount(20);
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
    botScheduleID = configuration.scheduleid;
    var By = selenium.By;
    var until = selenium.until;
    var driver = selenium.createDriver(configuration.configuration.execBotConfig.browsertype.toLowerCase());
    var driverjobdetails = selenium.createDriver(configuration.configuration.execBotConfig.browsertype.toLowerCase());
    //var driver = selenium.createDriver("chrome");
    //var driverjobdetails = selenium.createDriver("chrome");

    var jobs = new Array();
    var jobCount;


    try {
        await driver.get('https://hospitals.unm.edu/apps/live_hire_20/live_hire_cc.cfm');

        var countElement = await driver.findElements(By.xpath('//table[@class="posting_table"]/tbody/tr'));
        var record = await countElement.length;
        jobMaker.setatsJobCount(parseInt(record - 4));


        var prime = 5;
        do {
            var jobList = await driver.findElements(By.xpath('//table[@class="posting_table"]/tbody/tr[' + prime + ']'));
            var ispresent = jobList.length;
            if (ispresent) {
                try {
                    var job = jobMaker.create();
                    var title = await driver.findElement(By.xpath("//table[@class='posting_table']/tbody/tr[" + prime + "]/td[3]/a")).getText();
                    if (title != null) {
                        var urlElement = await driver.findElement(By.xpath("//table[@class='posting_table']/tbody/tr[" + prime + "]/td[3]/a")).getAttribute('href');
                        var id = await driver.findElement(By.xpath("//table[@class='posting_table']/tbody/tr[" + prime + "]/td[2]")).getText();
                        var category = await driver.findElement(By.xpath("//table[@class='posting_table']/tbody/tr[" + prime + "]/td[4]")).getText();
                        var status = await driver.findElement(By.xpath("//table[@class='posting_table']/tbody/tr[" + prime + "]/td[6]")).getText();

                        await driverjobdetails.get(urlElement);

                        var salary = await driverjobdetails.findElement(By.xpath("//table[@class='posting_detail_table'][1]/tbody/tr[10]/td")).getText();
                        var jobtype = await driverjobdetails.findElement(By.xpath("//table[@class='posting_detail_table'][1]/tbody/tr[9]/td")).getText();
                        var description = await driverjobdetails.findElement(By.xpath("//table[@class='posting_detail_table'][2]/tbody")).getAttribute("outerHTML");

                        job.JOB_TITLE = title;
                        job.JOB_CATEGORY = category;
                        job.JDTID_UNIQUE_NUMBER = id;
                        job.JOB_APPLY_URL = urlElement;
                        job.JOB_LOCATION_CITY = "Albuquerque";
                        job.JOB_LOCATION_STATE = "NM";
                        job.JOB_STATUS = status;
                        job.JOB_TYPE = jobtype;
                        job.JOB_SALARY = salary;
                        job.TEXT = HtmlEscape(description);
                        jobMaker.successful.add(job, botScheduleID);
                        prime++;
                    }
                }

                catch (e) {
                    jobMaker.failed.add(job.JDTID_UNIQUE_NUMBER, e.message);
                    prime++;
                }
            }
        } while (ispresent);
        driver.quit();
        driverjobdetails.quit();
        snippet(configuration, jobMaker.atsJobCount, jobMaker.failedJobs.length, jobMaker, onsuccess, onfailure);
    }

    catch (err) {
        driver.quit();
        driverjobdetails.quit();
        var output = package.service.bot.createBotErrorOutput(configuration.scheduleid, jobMaker.jobs.length, jobMaker.atsJobCount, jobMaker.failedJobs.length, e);
        onfailure(output);
    }
}

function HtmlEscape(description) {
    description = he.encode(description, { 'useNamedReferences': true, 'decimal': true, 'allowUnsafeSymbols': true });
    description = description.replace(/&#x9;/g, '');
    description = description.replace(/&nbsp;/g, '');
    description = description.replace(/&#9;/g, '');
    description = description.replace(/^\s+|\s+$/g, '');
    description = description.replace(/\r?\n|\r/g, '');
    return description;
}

var snippet = (configuration, atsJobCount, failedJobCount, jobs, onsuccess, onfailure) => {
    service.bot.setProgress(botScheduleID, log.logType.activity, log.activity.snippet.download + "feedgenerator").then(values => {
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
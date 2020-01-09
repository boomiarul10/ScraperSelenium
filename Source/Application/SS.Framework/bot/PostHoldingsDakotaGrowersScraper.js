var Promise = require('promise');
var package = global.createPackage();
var he = require('he');
var cleanHtml = require('clean-html');
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
        var driverjobdetails = selenium.createDriver(configuration.configuration.execBotConfig.browsertype.toLowerCase());

        // var driver = selenium.createDriver("chrome");
        //var driverjobdetails = selenium.createDriver("chrome");

        await driver.get('https://recruiting2.ultipro.com/POS1003POST/JobBoard/305f7190-071c-4e7b-b084-4e28794d752b');

        var jobCount = await driver.findElement(By.xpath('//*[@id="SearchCount"]/div[1]/span'));
        var atsCount = await jobCount.getText();
        atsCount = atsCount.split(' ');
        var count = atsCount[2].trim();
        jobMaker.setatsJobCount(parseInt(count));
       
        var prime = 1;
        do {
            var jobContainer = await driver.findElements(By.xpath('//*[@id="Opportunities"]/div[3]/div[' + prime + ']'));
            var isPresent = await jobContainer.length;
            if (isPresent) {
                try {
                    var job = jobMaker.create();
                    //   
                    var titleElement = await driver.findElement(By.xpath('//*[@id="Opportunities"]/div[3]/div[' + prime + ']//a'));
                    var title = await titleElement.getText();

                    var categoryElement = await driver.findElement(By.xpath('//*[@id="Opportunities"]/div[3]/div[' + prime + ']/div[2]//div[@class="row"]/div[1]'));
                    var category = await categoryElement.getText();

                    var url = await titleElement.getAttribute('href');
                    var id = url.split('opportunityId=');
                    id = id[1].trim();

                    await driverjobdetails.get(url);

                    var locationElement = await driverjobdetails.findElement(By.xpath('//address[@id="Preview"]/span[4]/span'));
                    var location = await locationElement.getAttribute("innerHTML");

                    var typeElement = await driverjobdetails.findElement(By.xpath('//*[@id="JobFullTime"]'));
                    var type = await typeElement.getText();

                    var dateElement = await driverjobdetails.findElement(By.xpath('//*[@class="opportunity-sidebar list-unstyled"]/li[1]'));
                    var date = await dateElement.getText();

                    var jobDescription = await driverjobdetails.findElement(By.xpath('//*[@class="col-md-18"]'));
                    var description = await jobDescription.getAttribute("outerHTML");

                    var optionsTag = {
                        'add-remove-tags': ['ul']
                    };
                    cleanHtml.clean(description, optionsTag, function (html) {
                        description = html;
                    });

                    job.JOB_TITLE = title;
                    job.JDTID_UNIQUE_NUMBER = id;
                    job.TEXT = HtmlEscape(description);
                    job.JOB_CATEGORY = category;
                    job.JOB_APPLY_URL = url;
                    if (location) {
                        var loc = location.split(",");
                        if (loc.length == 3) {
                            job.JOB_LOCATION_CITY = loc[0];
                            job.JOB_LOCATION_STATE = loc[1];
                            job.JOB_LOCATION_COUNTRY = loc[2];
                        } else if (loc.length == 2) {
                            job.JOB_LOCATION_STATE = loc[0];
                            job.JOB_LOCATION_COUNTRY = loc[1];
                        }
                    }
                    job.JOB_TYPE = type;
                    job.ASSIGNMENT_START_DATE = date.replace('Posted: ', '');

                    jobMaker.successful.add(job, botScheduleID);
                    prime++;
                }
                catch (e) {
                    jobMaker.failed.add(job.JDTID_UNIQUE_NUMBER, e.message);
                    prime++;
                }
            }
        } while (isPresent);

        await driverjobdetails.quit();
        await driver.quit();
        snippet(configuration, jobMaker.atsJobCount, jobMaker.failedJobs.length, jobMaker, onsuccess, onfailure);
    } catch (e) {
        await driverjobdetails.quit();
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
    description = description.replace(/ZeroWidthSpace;/g, '#8203;');
    description = description.replace(/mldr/g, 'hellip;');
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
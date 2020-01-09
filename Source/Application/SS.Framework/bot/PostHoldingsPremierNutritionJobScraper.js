var Promise = require('promise');
var package = global.createPackage();
var he = require('he');
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

        await driver.get('https://recruiting2.ultipro.com/POS1003POST/JobBoard/10fbb5ca-fd35-4b73-98aa-9053d964e2e2');
        
        var jobCount = await driver.findElement(By.xpath("//*[@data-automation='opportunities-count']"));
        var atsCount = await jobCount.getText();
        var atsJobCount = atsCount.split('are').pop().split('opportunities').shift();
        if (atsJobCount) {
            atsJobCount = atsJobCount.trim();
            jobMaker.setatsJobCount(parseInt(atsJobCount));
        }
        
        var prime;
        prime = 1;
        do {
            var jobContainer = await driver.findElements(By.xpath("//*[@data-automation='opportunity'][" + prime + "]"));
            var isPresent = await jobContainer.length;
            if (isPresent) {
                try {
                    var job = jobMaker.create();
                    var titleElement = await driver.findElement(By.xpath("//*[@data-automation='opportunity'][" + prime + "]//*[@class='opportunity-link']"));
                    job.JOB_TITLE = await titleElement.getText();

                    var categoryElement = await driver.findElement(By.xpath("//*[@data-automation='opportunity'][" + prime + "]//span/span[contains(@data-bind, 'Category')]"));
                    job.JOB_CATEGORY = await categoryElement.getText();

                    var url = await titleElement.getAttribute('href');
                    if (url) {
                        job.JOB_APPLY_URL = url;
                        job.JDTID_UNIQUE_NUMBER = url.split("opportunityId=").pop();
                    }
                    await driverjobdetails.get(url);
                    
                    var countryElement = await driverjobdetails.findElement(By.xpath("//*[@data-automation='city-state-zip-country-label']"));
                    var location = await countryElement.getAttribute("textContent");

                    if (location) {
                        var rex = /.*,(.*)/;
                        var rexPresent = rex.test(location);

                        if (rexPresent) {
                            var countryData1 = rex.exec(location);
                            job.JOB_LOCATION_COUNTRY = countryData1[1];
                        } else {
                            job.JOB_LOCATION_COUNTRY = country;
                        }
                        rex.lastIndex = 0; 

                        var stateRex = /.*,(.*),.*/;
                        var stateRexPresent = stateRex.test(location);

                        if (stateRexPresent) {
                            var stateData1 = stateRex.exec(location);
                            job.JOB_LOCATION_STATE = stateData1[1];
                        } else {
                            job.JOB_LOCATION_STATE = location;
                        }
                        stateRex.lastIndex = 0;

                        var cityRex = /(.*),(.*),(.*)/;
                        var cityRexPresent = cityRex.test(location);

                        if (cityRexPresent) {
                            var cityData1 = cityRex.exec(location);
                            job.JOB_LOCATION_CITY = cityData1[1];
                        } else {
                            job.JOB_LOCATION_CITY = location;
                        }
                        cityRex.lastIndex = 0;

                    }

                    var typeElement = await driverjobdetails.findElement(By.xpath("//*[@data-automation='JobFullTime']"));
                    job.JOB_TYPE = await typeElement.getText();

                    var dateElement = await driverjobdetails.findElement(By.xpath("//*[@data-automation='job-posted-date']"));
                    job.ASSIGNMENT_START_DATE = await dateElement.getText();

                    var jobDescription = await driverjobdetails.findElement(By.xpath("//div[@class='col-md-18' and //p[@data-automation='job-description']]"));
                    var descriptionText = await jobDescription.getAttribute("outerHTML");
                    descriptionText = descriptionText.replace(/<ul/g, '<font').replace(/\/ul>/g, '/font>');
                    job.TEXT = HtmlEscape(descriptionText);

                    jobMaker.successful.add(job, botScheduleID);
                    prime++;
                } catch (e) {
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
    description = description.replace(/\s\s+/g, ' ');
    description = description.replace(/&nbsp;/g, ' ');
    description = description.replace(/\r?\n|\r/g, '');
    description = description.replace(/ZeroWidthSpace;/g, '#8203;');
    description = description.replace(/&mldr+/g, '&hellip');
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
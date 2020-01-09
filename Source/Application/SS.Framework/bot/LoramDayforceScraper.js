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

        await driver.get('https://us851.dayforcehcm.com/CandidatePortal/en-US/lmow');
        var loop;
        var atsJobCount = await driver.findElements(By.xpath('//div[@class="posting-title"]'));
        var atscount = await atsJobCount.length;
        jobMaker.setatsJobCount(parseInt(atscount));
        var counter = 1;
        do {
            var jobContainer = await driver.findElements(By.xpath('//div[' + counter + ']/div[@class="posting-title"]/a'));
            var isPresent = await jobContainer.length;
            if (isPresent) {
                try {
                    var job = jobMaker.create();

                    var titleElement = await driver.findElement(By.xpath('//div[' + counter + ']/div[@class="posting-title"]/a'));
                    job.JOB_TITLE = await titleElement.getText();
                    var idElement = await driver.findElement(By.xpath(' //div[' + counter + ']/div[@class="posting-JobReqId"]'));
                    job.JDTID_UNIQUE_NUMBER = await idElement.getText();
                    var dateElement = await driver.findElement(By.xpath(' //div[' + counter + ']/div[@class="posting-date"]'));
                    job.ASSIGNMENT_START_DATE = await dateElement.getText();


                    var urlElement = await driver.findElement(By.xpath('//div[' + counter + ']/div[@class="posting-title"]/a'));
                    var id = await urlElement.getAttribute("href");
                    await driverjobdetails.get(id);

                    var jobdetailspage = await driverjobdetails.findElements(By.xpath('//*[@class="description section"]'));
                    var isDetailPage = await jobdetailspage.length;
                    if (isDetailPage) {

                        var jobcategoryElement = await driverjobdetails.findElements(By.xpath('//*[@data-label="Job Family"]'));
                        var iscategory = await jobcategoryElement.length;
                        if (iscategory) {
                            var categoryElement = await driverjobdetails.findElement(By.xpath('//*[@data-label="Job Family"]'));
                            job.JOB_CATEGORY = await categoryElement.getText();
                        }

                        var statusElement = await driverjobdetails.findElement(By.xpath('//*[@data-label="Pay Type"]'));
                        job.JOB_STATUS = await statusElement.getText();

                        var type = await driverjobdetails.findElement(By.xpath('/html/body/div[2]/div[1]/div[4]/div[3]')).getText();
                        job.JOB_TYPE = type;

                        var testElement = await driverjobdetails.findElements(By.xpath('//*[@data-label="Location"]'));
                        var isTest = await testElement.length;
                        if (isTest) {
                            var element = await driverjobdetails.findElement(By.xpath('//*[@data-label="Location"]'));
                            var test = await element.getText();

                            if (test == "Virtual") {
                                var locationElement = await driverjobdetails.findElement(By.xpath('//*[@class="job-name"]'));
                                var location = await locationElement.getText();

                                job.JOB_LOCATION_COUNTRY = "United States of America";
                                if (location) {
                                    if (location.includes("-")) {
                                        var loc = location.split("-");
                                        if (loc[1].includes(",")) {
                                            var locationValue = loc[1].split(",");
                                            job.JOB_LOCATION_CITY = locationValue[0];
                                            job.JOB_LOCATION_STATE = locationValue[1];
                                        }
                                        else if (loc[1].includes("/")) {
                                            var locationValue = loc[1].split("/");
                                            job.JOB_LOCATION_CITY = locationValue[0];
                                            job.JOB_LOCATION_STATE = locationValue[1];
                                        }
                                        else {
                                            job.JOB_LOCATION_CITY = location;
                                            job.JOB_LOCATION_STATE = location;
                                        }
                                    }
                                    else if (location.includes("/")) {
                                        var loc = location.split("/");
                                        job.JOB_LOCATION_CITY = loc[0];
                                        job.JOB_LOCATION_STATE = loc[1];
                                    }
                                    else {
                                        job.JOB_LOCATION_CITY = location;
                                        job.JOB_LOCATION_STATE = location;
                                    }
                                }
                            }
                            else {
                                if (test) {
                                    if (test.includes(",")) {
                                        var loc = test.split(",");
                                        job.JOB_LOCATION_CITY = loc[1];
                                        job.JOB_LOCATION_STATE = loc[2];
                                        job.JOB_LOCATION_COUNTRY = loc[3];
                                    }
                                }
                            }
                        }

                        var applyElement = await driverjobdetails.findElement(By.xpath('//*[@class="button blue apply responsive-button"]'));
                        job.JOB_APPLY_URL = await applyElement.getAttribute("href");

                        var JobDescription = await driverjobdetails.findElement(By.xpath('//*[@class="description section"]'));
                        var desc = await JobDescription.getAttribute("outerHTML");
                        if (desc) {
                            job.TEXT = HtmlEscape(desc);
                            jobMaker.successful.add(job, botScheduleID);
                        }
                    }
                    counter++;
                } catch (e) {
                    jobMaker.failed.add(job.JDTID_UNIQUE_NUMBER, e.message);
                    counter++;
                }
            }
        } while (isPresent);

        driver.quit();
        driverjobdetails.quit();
        snippet(configuration, jobMaker.atsJobCount, jobMaker.failedJobs.length, jobMaker, onsuccess, onfailure);
    } catch (e) {
        driver.quit();
        driverjobdetails.quit();
        var output = package.service.bot.createBotErrorOutput(configuration.scheduleid, jobMaker.jobs.length, jobMaker.atsJobCount, jobMaker.failedJobs.length, e);
        onfailure(output);
    }
}

function HtmlEscape(description) {
    description = he.encode(description, { 'useNamedReferences': true, 'decimal': true, 'allowUnsafeSymbols': true });
    description = description.replace(/&#9;/g, ' ');
    description = description.replace(/\s\s+/g, ' ');
    description = description.replace(/\r?\n|\r/g, '');
    return description;
}

var snippet = async (configuration, atsJobCount, failedJobCount, jobs, onsuccess, onfailure) => {
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
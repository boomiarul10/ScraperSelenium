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


        await driver.get('http://jobs.jobvite.com/santander-consumer-usa');

        var totalJobElement = await driver.findElements(By.xpath('//table[@class="jv-job-list"]/tbody/tr'));
        var totalJobCount = await totalJobElement.length;
        jobMaker.setatsJobCount(parseInt(totalJobCount));


        var categoryList = await driver.findElements(By.xpath('//table[@class="jv-job-list"]'));
        var optionArray = await categoryList.length;
        for (var i = 1; i <= optionArray; i++) {
            var counter = 1;
            do {
                var jobContainer = await driver.findElements(By.xpath("//table[@class='jv-job-list'][" + i + "]/tbody/tr[" + counter + "]"));
                var isPresent = await jobContainer.length;
                if (isPresent) {
                    try {
                        var job = jobMaker.create();

                        var titleElement = await driver.findElement(By.xpath("//table[@class='jv-job-list'][" + i + "]/tbody/tr[" + counter + "]//a"));
                        job.JOB_TITLE = await titleElement.getText();
                        var locationElement = await driver.findElement(By.xpath("//table[@class='jv-job-list'][" + i + "]/tbody/tr[" + counter + "]/td[@class='jv-job-list-location']"));
                        var location = await locationElement.getText();

                        if (location) {
                            location = location.trim();
                            var loc = location.split(",");
                            if (loc.length >= 2) {
                                job.JOB_LOCATION_CITY = loc[0];
                                job.JOB_LOCATION_STATE = loc[1];
                                job.JOB_LOCATION_COUNTRY = "United States";
                            }
                            else {
                                job.JOB_LOCATION_STATE = location;
                                job.JOB_LOCATION_COUNTRY = "United States";
                            }
                        }

                        var url = await titleElement.getAttribute("href");
                        job.JOB_APPLY_URL = url + "/apply";
                        var jobId = url.split("job/");
                        job.JDTID_UNIQUE_NUMBER = jobId[1].trim();

                        await driverjobdetails.get(url);
                        var jobdetailspage = await driverjobdetails.findElements(By.xpath('//div[@class="jv-job-detail-description"]'));
                        var isDetailPage = await jobdetailspage.length;
                        if (isDetailPage) {
                            var categoryElement = await driverjobdetails.findElement(By.xpath('//p[@class="jv-job-detail-meta"]'));
                            var category = await categoryElement.getAttribute("innerHTML");
                            if (category) {
                                var value = category.split("<");
                                value = HtmlEscape(value[0]);
                                job.JOB_CATEGORY = value.trim();
                            }
                            var jobDescriptionElement = await driverjobdetails.findElement(By.xpath('//div[@class="jv-job-detail-description"]'));
                            var JobDescription = await jobDescriptionElement.getAttribute("outerHTML");

                            job.TEXT = HtmlEscape(JobDescription);
                        }
                        jobMaker.successful.add(job, botScheduleID);
                        counter++;
                    } catch (e) {
                        jobMaker.failed.add(job.JDTID_UNIQUE_NUMBER, e.message);
                        counter++;
                    }
                }
            } while (isPresent);
        }
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
    description = description.replace(/&nbsp;/g, ' ');
    description = description.replace(/\s\s+/g, ' ');
    description = description.replace(/\r?\n|\r/g, '');
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
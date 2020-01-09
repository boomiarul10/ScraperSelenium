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

        await driver.get('https://memorialcare.referrals.selectminds.com/jobs/search/54833');
        
        var jobCountElement = await driver.findElement(By.xpath('//*[@id="jobs_filters_title"]/div/span'));
        var atsCount = await jobCountElement.getText();
        jobMaker.setatsJobCount(parseInt(atsCount));

        var nextPageCount = atsCount / 10 + 1;
        var nextPageCountValue = Math.trunc(nextPageCount);
        var nextCounter = 1;
        var loop;
        do {
            loop = false;
            var counter = 1;
            do {
                var jobContainer = await driver.findElements(By.xpath('//*[@id="job_results_list_hldr"]//div[contains(@id,"job_list")][' + counter + ']'));
                var isPresent = await jobContainer.length;
                if (isPresent) {
                    try {
                        var job = jobMaker.create();
                        var titleElement = await driver.findElement(By.xpath('//*[@id="job_results_list_hldr"]//div[contains(@id,"job_list")][' + counter + ']/div/div/p/a'));
                        job.JOB_TITLE = await titleElement.getText();
                        var categoryElement = await driver.findElement(By.xpath('//*[@id="job_results_list_hldr"]//div[contains(@id,"job_list")][' + counter + ']//*[@class="category"]'));
                        job.JOB_CATEGORY = await categoryElement.getText();

                        var jobDetailURL = await titleElement.getAttribute("href");
                        await driverjobdetails.get(jobDetailURL);

                        var companyElement = await driverjobdetails.findElement(By.xpath('//*[@class="field_company"]/dd/span'));
                        job.JOB_CONTACT_COMPANY = await companyElement.getText();

                        var jobIdElement = await driverjobdetails.findElement(By.xpath('//*[@class="job_external_id"]/span'));
                        job.JDTID_UNIQUE_NUMBER = await jobIdElement.getText();
                        var locationElement = await driverjobdetails.findElement(By.xpath('//*[@class="primary_location"]/a'));
                        var location = await locationElement.getText();

                        var descriptionElement = await driverjobdetails.findElement(By.xpath('//*[@class="job_description"]'));
                        var desc = await descriptionElement.getAttribute("outerHTML");

                        job.JOB_APPLY_URL = "https://memorialcare.taleo.net/careersection/jobdetail.ftl?job=" + job.JDTID_UNIQUE_NUMBER + "&lang=en"
                        if (location != null) {

                            location = location.replace("🔍", "");
                            var loc = location.split(",");
                            if (loc.length == 2) {
                                job.JOB_LOCATION_STATE = loc[0];
                                job.JOB_LOCATION_COUNTRY = loc[1];
                            }
                            else if (loc.length == 3) {
                                job.JOB_LOCATION_COUNTRY = loc[2];
                                job.JOB_LOCATION_STATE = loc[1];
                                job.JOB_LOCATION_CITY = loc[0];
                            }
                            else if (loc.length == 1) {
                                job.JOB_LOCATION_COUNTRY = location;
                                job.JOB_LOCATION_STATE = location;
                                job.JOB_LOCATION_CITY = location;
                            }
                        }
                        job.TEXT = HtmlEscape(desc);
                        jobMaker.successful.add(job, botScheduleID);
                        counter++;
                    } catch (e) {
                        jobMaker.failed.add(job.JDTID_UNIQUE_NUMBER, e.message);
                        counter++;
                    }
                }
            } while (isPresent);
            try {
                if (nextCounter < nextPageCountValue) {
                    nextCounter++;
                    var nextURL = "https://memorialcare.referrals.selectminds.com/jobs/search/54833/page" + nextCounter;
                    await driver.get(nextURL);
                    loop = true;
                }
            } catch (e) {
            }
        } while (loop);
        await driver.quit();
        await driverjobdetails.quit();
        snippet(configuration, jobMaker.atsJobCount, jobMaker.failedJobs.length, jobMaker, onsuccess, onfailure);
    } catch (e) {
        await driver.quit();
        await driverjobdetails.quit();
        var output = package.service.bot.createBotErrorOutput(configuration.scheduleid, jobMaker.jobs.length, jobMaker.atsJobCount, jobMaker.failedJobs.length, e);
        onfailure(output);
    }
}
function HtmlEscape(description) {
    description = he.encode(description, { 'useNamedReferences': true, 'decimal': true, 'allowUnsafeSymbols': true });
    description = description.replace(/&#9;/g, ' ');
    description = description.replace(/\s\s+/g, ' ');
    description = description.replace(/\r?\n|\r/g, '');
    description = description.replace(/&#x9;/g, '');
    description = description.replace(/&ensp;+/g, "");
    description = description.replace(/&mldr;+/g, "&hellip;");
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

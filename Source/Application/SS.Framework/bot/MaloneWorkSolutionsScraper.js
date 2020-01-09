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


        await driver.get('https://jcm.avionte.com/staffing?');

        var searchElement = await driver.findElement(By.xpath('//button[@id="search-button"]'));
        await searchElement.click();
        var jobcount = await driver.findElements(By.xpath('//div[@id="search-results-summary-text"]/div'));
        var count = await jobcount[0].getText();
        var atsjobcount = await count.split("jobs");
        var atscount = atsjobcount[0];
        jobMaker.setatsJobCount(parseInt(atscount));

        do {
            var loop = false;
            var i = 1;
            do {               
                var jobContainer = await driver.findElements(By.xpath('//div[@id="search-result-list"]/div[' + i + ']'));
                var isPresent = await jobContainer.length;
                if (isPresent) {
                    try {
                        var job = jobMaker.create();

                        var titleElement = await driver.findElement(By.xpath('//div[@id="search-result-list"]/div[' + i + ']//div[@class="row"]/span[@class="title col-sm-6 col-md-5 col-lg-6"]'));
                        job.JOB_TITLE = await titleElement.getText();

                        var locationElement = await driver.findElement(By.xpath('//div[@id="search-result-list"]/div[' + i + ']//div[@class="row"]/span[@class="location col-sm-4"]'));
                        var location = await locationElement.getText();

                        var loc = await location.split(",");
                        job.JOB_LOCATION_CITY = loc[0];
                        job.JOB_LOCATION_STATE = loc[1];

                        var appurlElement = await driver.findElement(By.xpath('//div[@id="search-result-list"]/div[' + i + ']//div[@class="pull-right"]/a[@class="btn btn-primary-hollow apply"]'));
                        var titleurl = await appurlElement.getAttribute("href");
                        job.JOB_APPLY_URL = titleurl;

                        var urlid = titleurl.split("&");
                        var jobdetailsurl = urlid[0].split("=");

                        var joburl = "https://jcm.avionte.com/staffing/posting/" + jobdetailsurl[1];
                        await driverjobdetails.get(joburl);

                        var categoryElement = await driverjobdetails.findElement(By.xpath('//div[@class="details-fields clearfix"]//span[@class="form-control-static job-category"]'));
                        job.JOB_CATEGORY = await categoryElement.getText();

                        var idElement = await driverjobdetails.findElement(By.xpath('//div[@class="details-fields clearfix"]//span[@class="form-control-static job-id"]'));
                        job.JDTID_UNIQUE_NUMBER = await idElement.getText();

                        var jobtypeElement = await driverjobdetails.findElement(By.xpath('//div[@class="details-fields clearfix"]//span[@class="form-control-static job-type"]'));
                        job.JOB_TYPE = await jobtypeElement.getText();

                        var jdElement = await driverjobdetails.findElement(By.xpath('//div[@class="description rte-context"]'));
                        var desc = await jdElement.getAttribute("outerHTML");
                        if (desc) {
                            job.TEXT = HtmlEscape(desc);
                        }
                        jobMaker.successful.add(job, botScheduleID);
                        i++;

                        if (i != 1 && i % 5 == 0) {
                            await driver.executeScript("scrollTo(0, 80000)");
                            await driver.sleep(5000);
                        }

                    }
                    catch (e) {
                        jobMaker.failed.add(job.JDTID_UNIQUE_NUMBER, e.message);
                        i++;
                        if (i != 1 && i % 5 == 0) {
                            await driver.executeScript("scrollTo(0, 80000)");
                            await driver.sleep(5000);
                        }
                    }
                }

            } while (isPresent);
        } while (loop);
        await driver.quit();
        await driverjobdetails.quit();
        await snippet(configuration, jobMaker.atsJobCount, jobMaker.failedJobs.length, jobMaker, onsuccess, onfailure);
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


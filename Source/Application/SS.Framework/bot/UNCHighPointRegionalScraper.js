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

        await driver.get('https://www.healthcaresource.com/highpoint/index.cfm?fuseaction=search.categoryList&template=dsp_job_categories.cfm');

        var searchelement = await driver.findElement(By.xpath('//*[@id="categories"]/input'));
        await searchelement.click();

        var totalJobElement = await driver.findElement(By.xpath("//*[@id='jobListSummary']/div[2]"));
        var totalJobCount = await totalJobElement.getText();
        var record = totalJobCount.split("of");
        var atsCount = record[1].split("Record");
        jobMaker.setatsJobCount(parseInt(atsCount[0]));
        await driver.navigate().back();

        var categoryElement = await driver.findElement(By.xpath('//*[@id="iJobCatId"]'));
        var optionArray = await categoryElement.findElements(By.tagName('option'));

        for (var i = 2; i <= optionArray.length; i++) {
            var option = await driver.findElement(By.xpath('//Select[@id="iJobCatId"]/Option[' + i + ']'));
            var optionValue = await option.getAttribute('text');
            await option.click();

            var removeTag = i - 1;
            var optionRemove = await driver.findElement(By.xpath('//Select[@id="iJobCatId"]/Option[' + removeTag + ']'));
            await optionRemove.click();
            var searchelement = await driver.findElement(By.xpath('//*[@id="categories"]/input'));
            await searchelement.click();
            do {
                loop = false;
                var counter = 2;
                do {
                    var jobContainer = await driver.findElements(By.xpath("//*[@id='jobListSummary']/table/tbody/tr[" + counter + "]/td[3]/a"));
                    var isPresent = await jobContainer.length;
                    if (isPresent) {
                        try {
                            var job = jobMaker.create();
                            job.JOB_CATEGORY = optionValue;

                            var titleElement = await driver.findElement(By.xpath("//*[@id='jobListSummary']/table/tbody/tr[" + counter + "]/td[3]/a"));
                            job.JOB_TITLE = await titleElement.getText();
                            var locationElement = await driver.findElement(By.xpath("//*[@id='jobListSummary']/table/tbody/tr[" + counter + "]/td[3]"));
                            var location = await locationElement.getAttribute("innerHTML");
                            var dateElement = await driver.findElement(By.xpath("//*[@id='jobListSummary']/table/tbody/tr[" + counter + "]/td[2]"));
                            job.ASSIGNMENT_START_DATE = await dateElement.getText();

                            if (location) {
                                var loc = location.split("<br>");
                                var state = loc[loc.length - 1].split(",");
                                job.JOB_LOCATION_STATE = state[2];
                                job.JOB_CONTACT_COMPANY = state[0];
                            }

                            var urlElement = await driver.findElement(By.xpath("//*[@id='jobListSummary']/table/tbody/tr[" + counter + "]/td[3]/a"));
                            var url = await urlElement.getAttribute("href");
                            if (url) {
                                job.JOB_APPLY_URL = url;
                                var jobID = url.split("JobId=");
                                job.JDTID_UNIQUE_NUMBER = jobID[1];
                            }
                            await driverjobdetails.get(url);

                            var jobdetailspage = await driverjobdetails.findElements(By.xpath("/html/body/div[2]/table/tbody/tr[6]"));
                            var isDetailPage = await jobdetailspage.length;
                            if (isDetailPage) {

                                var jobEducation = await driverjobdetails.findElement(By.xpath('/html/body/div[2]/table/tbody/tr[2]/td[2]'));
                                job.EDUCATION = await jobEducation.getText();

                                var statusElement = await driverjobdetails.findElement(By.xpath("/html/body/div[2]/table/tbody/tr[3]/td[2]"));
                                job.JOB_STATUS = await statusElement.getText();

                                var jobSalaryFrom = await driverjobdetails.findElement(By.xpath('/html/body/div[2]/table/tbody/tr[4]/td[2]'));
                                job.JOB_SALARY_FROM = await jobSalaryFrom.getText();

                                var jobSalaryTo = await driverjobdetails.findElement(By.xpath('/html/body/div[2]/table/tbody/tr[5]/td[2]'));
                                job.JOB_SALARY_TO = await jobSalaryTo.getText();

                                var jobDescriptionElement = await driverjobdetails.findElement(By.xpath("/html/body/div[2]/table/tbody/tr[6]"));
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
                try {
                    var nextContainer = await driver.findElements(By.xpath('//input[@value="Next Page >>"]'));
                    var next = nextContainer.length;
                    if (next == 1) {
                        var nextLink = await driver.findElement(By.xpath('//input[@value="Next Page >>"]'));
                        await nextLink.click();
                        loop = true;
                    }
                    else {
                        var previousContainer = await driver.findElements(By.xpath('//input[@value="<< Previous Page"]'));
                        var previous = previousContainer.length;
                        if (previous == 1) {
                            await driver.navigate().back();
                            var previousElement = await driver.findElements(By.xpath('//input[@value="<< Previous Page"]'));
                            var previousValue = previousElement.length;
                            if (previousValue == 1) {
                                await driver.navigate().back();
                            }
                            await driver.navigate().back();
                        }
                        else {
                            await driver.navigate().back();
                        }
                    }
                } catch (e) {

                }
            } while (loop);
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
    description = description.replace(/&#9;/g, '');
    description = description.replace(/^\s+|\s+$/g, '');
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
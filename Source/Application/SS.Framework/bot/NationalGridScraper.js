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

        await driver.get('https://nationalgrid.taleo.net/careersection/2/jobsearch.ftl?lang=en');
        await driver.sleep(3000);

        var jobCountElement = await driver.findElement(By.xpath('//*[@class="subtitle"][contains(text(),"Search Results")]'));
        var atsCount = await jobCountElement.getText();
        var jobCount = atsCount.split("(");
        var atsJobCount = jobCount[1].split("jobs");
        jobMaker.setatsJobCount(parseInt(atsJobCount[0]));

        var loop;
        do {
            loop = false;
            var counter = 1;
            do {
                var jobContainer = await driver.findElements(By.xpath('//*[@id="requisitionListInterface.listRequisition"]/tbody/tr[' + counter + ']//span[@class="titlelink"]/a'));
                var isPresent = await jobContainer.length;
                if (isPresent) {
                    try {
                        var job = jobMaker.create();
                        var jobSalaryElement = await driver.findElements(By.xpath('//*[@id="requisitionListInterface.listRequisition"]/tbody/tr[' + counter + ']//img[@title="Urgent need job"]'));
                        var isJobSalary = await jobSalaryElement.length;
                        if (isJobSalary) {
                            job.JOB_SALARY = 'Y';
                        }
                        else {
                            job.JOB_SALARY = 'N';
                        }

                        var titleElement = await driver.findElement(By.xpath('//*[@id="requisitionListInterface.listRequisition"]/tbody/tr[' + counter + ']//span[@class="titlelink"]/a'));
                        job.JOB_TITLE = await titleElement.getText();
                        var jobIdElement = await driver.findElement(By.xpath('//*[@id="requisitionListInterface.listRequisition"]/tbody/tr[' + counter + ']//span[contains(@id,"requisitionListInterface.reqContestNumberValue")]'));
                        job.JDTID_UNIQUE_NUMBER = await jobIdElement.getText();

                        var jobDetailURL = "https://nationalgrid.taleo.net/careersection/2/jobdetail.ftl?lang=en&job=" + job.JDTID_UNIQUE_NUMBER;
                        job.JOB_APPLY_URL = jobDetailURL;
                        await driverjobdetails.get(jobDetailURL);
                        await driverjobdetails.sleep(1000);

                        var jobdetailspage = await driverjobdetails.findElements(By.xpath('//div[@class="editablesection"]'));
                        var isDetailPage = await jobdetailspage.length;
                        if (isDetailPage) {
                            var locationElement = await driverjobdetails.findElement(By.xpath('//*[@id="requisitionDescriptionInterface.ID1765.row1"]'));
                            var location = await locationElement.getText();
                            var dateElement = await driverjobdetails.findElement(By.xpath('//*[@id="requisitionDescriptionInterface.reqPostingDate.row1"]'));
                            job.ASSIGNMENT_START_DATE = await dateElement.getText();
                            var categoryElement = await driverjobdetails.findElement(By.xpath('//*[@id="requisitionDescriptionInterface.ID1877.row1"][@class="text"]'));
                            job.JOB_CATEGORY = await categoryElement.getText();
                            var relocationElement = await driverjobdetails.findElements(By.xpath('//*[@id="requisitionDescriptionInterface.ID1821.row1"]'));
                            var isRelocation = await relocationElement.length;
                            if (isRelocation) {
                                var relocationElemData = await driverjobdetails.findElement(By.xpath('//*[@id="requisitionDescriptionInterface.ID1821.row1"]'));
                                job.TRAVEL = await relocationElemData.getText();
                            }
                            var descriptionElement = await driverjobdetails.findElement(By.xpath('//div[@class="editablesection"]'));
                            var desc1 = await descriptionElement.getAttribute("outerHTML");

                            var descr = desc1.split('<span class="subtitle">Description</span></div></h2>');

                            var desc = 'Description' + descr[1];

                            if (location != null) {
                                var loc = location.split("-");
                                if (loc.length == 2) {
                                    job.JOB_LOCATION_CITY = loc[1];
                                    job.JOB_LOCATION_STATE = loc[0];
                                }
                                else if (loc.length == 3) {
                                    job.JOB_LOCATION_COUNTRY = loc[0];
                                    job.JOB_LOCATION_STATE = loc[1];
                                    job.JOB_LOCATION_CITY = loc[2];
                                }
                                else {
                                    job.JOB_LOCATION_CITY = location;
                                    job.JOB_LOCATION_STATE = location;
                                }
                            }

                            job.TEXT = HtmlEscape(desc);
                            jobMaker.successful.add(job, botScheduleID);
                        }
                        counter = counter + 2;
                    } catch (e) {
                        jobMaker.failed.add(job.JDTID_UNIQUE_NUMBER, e.message);
                        counter = counter + 2;
                    }
                }
            } while (isPresent);
            try {
                var e = await driver.findElements(By.xpath('//*[@id="requisitionListInterface.pagerDivID3976.panel.Next"]/span[@class="pagerlink"]/a'));
                if (e.length == 1) {
                    var nextPage = await driver.findElement(By.xpath('//*[@id="requisitionListInterface.pagerDivID3976.panel.Next"]/span[@class="pagerlink"]/a'));
                    await nextPage.click();
                    loop = true;
                }
            } catch (e) {
                var ex = e.message;
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
    description = description.replace(/&#xfffd;+/g, "")
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

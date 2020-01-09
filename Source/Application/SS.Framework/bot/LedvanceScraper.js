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

        await driver.get('https://ledvance.taleo.net/careersection/2/jobsearch.ftl?lang=en#');
        await driver.sleep(4000);
        var loop;
        var atsJobCount = await driver.wait(until.elementLocated(By.xpath('//*[@id="infoPanelContainer"]/div')), 4000);
        var atscount = await atsJobCount.getText();
        var record = atscount.split("of");
        jobMaker.setatsJobCount(parseInt(record[1].trim()));
        var pagenumber = 1;
        do {
            loop = false;
            var counter = 1;
            do {
                var jobContainer = await driver.findElements(By.xpath('//*[@id="jobs"]/tbody/tr[' + counter + ']'));
                var isPresent = await jobContainer.length;
                if (isPresent) {
                    try {
                        var job = jobMaker.create();

                        var titleElement = await driver.findElement(By.xpath('//*[@id="jobs"]/tbody/tr[' + counter + ']/th'));
                        job.JOB_TITLE = await titleElement.getText();
                        var industryElement = await driver.findElement(By.xpath('//*[@id="jobs"]/tbody/tr[' + counter + ']/td[3]'));
                        job.JOB_INDUSTRY = await industryElement.getText();
                        var locationElement = await driver.findElement(By.xpath('//*[@id="jobs"]/tbody/tr[' + counter + ']/td[2]'));
                        var location = await locationElement.getText();

                        if (location) {
                            if (location.includes("-")) {
                                var loc = location.split("-");
                                job.JOB_LOCATION_COUNTRY = loc[0];
                                job.JOB_LOCATION_STATE = loc[1];
                                job.JOB_LOCATION_CITY = loc[2];
                                if (loc[3]) {
                                    job.JOB_LOCATION_CITY = loc[2] + "-" + loc[3];
                                }
                            }
                            else {
                                job.JOB_LOCATION_COUNTRY = location;
                            }
                        }

                        var urlElement = await driver.findElement(By.xpath('//*[@id="jobs"]/tbody/tr[' + counter + ']/th/div/div/span/a'));
                        var id = await urlElement.getAttribute("href");
                        await driverjobdetails.get(id);

                        var jobdetailspage = await driverjobdetails.findElements(By.xpath("//*[@id='requisitionDescriptionInterface.ID3203.row.row1']/td/div/div[2]"));
                        var isDetailPage = await jobdetailspage.length;
                        if (isDetailPage) {
                            var idElement = await driverjobdetails.findElement(By.xpath('//*[@id="requisitionDescriptionInterface.reqContestNumberValue.row1"]'));
                            job.JDTID_UNIQUE_NUMBER = await idElement.getText();
                            if (job.JDTID_UNIQUE_NUMBER) {
                                job.JOB_APPLY_URL = "https://ledvance.taleo.net/careersection/jobdetail.ftl?job=" + job.JDTID_UNIQUE_NUMBER + "&lang=en";
                            }

                            var categorypage = await driverjobdetails.findElements(By.xpath('//*[@id="requisitionDescriptionInterface.ID1670.row1"]//*[contains(text(), "amily")]'));
                            var iscategory = await categorypage.length;
                            if (iscategory) {
                                var categoryElement = await driverjobdetails.findElement(By.xpath('//*[@id="requisitionDescriptionInterface.ID1670.row1"]//*[contains(text(), "amily")]'));
                                var category = await categoryElement.getText();
                                var cate = category.split(":");
                                job.JOB_CATEGORY = cate[1].trim();
                            }

                            var statuspage = await driverjobdetails.findElements(By.xpath('//*[@id="requisitionDescriptionInterface.ID1670.row1"]//*[contains(text(), "Job category")]'));
                            var isstatus = await statuspage.length;
                            if (isstatus) {
                                var statusElement = await driverjobdetails.findElement(By.xpath('//*[@id="requisitionDescriptionInterface.ID1670.row1"]//*[contains(text(), "Job category")]'));
                                var jobStatus = await statusElement.getText();
                                var status = jobStatus.split("Job category:");
                                job.JOB_STATUS = status[1].trim();
                            }
                            var typepage = await driverjobdetails.findElements(By.xpath('//*[@id="requisitionDescriptionInterface.ID1670.row1"]//*[contains(text(), "Job schedule")]'));
                            var istype = await typepage.length;
                            if (istype) {
                                var type = await driverjobdetails.findElement(By.xpath('//*[@id="requisitionDescriptionInterface.ID1670.row1"]//*[contains(text(), "Job schedule")]')).getText();
                                var jobType = type.split("Job schedule:");
                                job.JOB_TYPE = jobType[1].trim();
                            }

                            var JobDescription = await driverjobdetails.findElement(By.xpath("//*[@id='requisitionDescriptionInterface.ID1581.row1']"));
                            var desc = await JobDescription.getAttribute("outerHTML");
                            var recruiterElement = await driverjobdetails.findElement(By.xpath("//*[@id='requisitionDescriptionInterface.ID1685.row1']"));
                            job.TRAVEL = await recruiterElement.getAttribute("outerHTML");

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

            try {
                var nextContainer = await driver.findElements(By.xpath('//span/a[@class="navigation-link-disabled"][text()="Next"]'));
                var next = nextContainer.length;
                if (!(next)) {
                    var nextLink = await driver.findElement(By.xpath('//*[@id="next"]'));
                    await nextLink.click();
                    loop = true;
                    pagenumber++;
                }
            } catch (e) {

            }
        } while (loop);
        driver.quit();
        driverjobdetails.quit();
        await snippet(configuration, jobMaker.atsJobCount, jobMaker.failedJobs.length, jobMaker, onsuccess, onfailure);
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
    description = description.replace(/&nbsp;/g, '');
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

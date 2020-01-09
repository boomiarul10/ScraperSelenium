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

        await driver.get('https://ericksonjobs.taleo.net/careersection/3/jobsearch.ftl?lang=en&portal=10140702057');
        await driver.sleep(4000);
        var jobCountElement = await driver.findElement(By.xpath('//*[@class="paging-info paging-info-data"]'));
        var atsCount = await jobCountElement.getText();
        var jobCount = atsCount.split("of");
        var atsJobCount = jobCount[1].trim();
        jobMaker.setatsJobCount(parseInt(atsJobCount));

        var loop;
        do {
            loop = false;
            var counter = 1;
            do {
                var jobContainer = await driver.findElements(By.xpath('//*[@summary="Job Openings"]/tbody/tr[' + counter + '] '));
                var isPresent = await jobContainer.length;
                if (isPresent) {
                    try {
                        var job = jobMaker.create();

                        var titleElement = await driver.findElement(By.xpath('//*[@summary="Job Openings"]/tbody/tr[' + counter + ']//span/a'));
                        job.JOB_TITLE = await titleElement.getText();

                        var url = await titleElement.getAttribute('href');
                        await driverjobdetails.get(url);
                        await driverjobdetails.sleep(2000);
                        var jobdetailspage = await driverjobdetails.findElements(By.xpath('//div[@class="editablesection"]'));
                        var isDetailPage = await jobdetailspage.length;
                        if (isDetailPage) {

                            var locationElement = await driverjobdetails.findElement(By.xpath('//*[@id="requisitionDescriptionInterface.ID1730.row1"][@class="text"]'));
                            var location = await locationElement.getText();
                            var categoryElement = await driverjobdetails.findElement(By.xpath('//*[@id="requisitionDescriptionInterface.ID1674.row1"][@class="text"]'));
                            job.JOB_CATEGORY = await categoryElement.getText();
                            var jobIdElement = await driverjobdetails.findElement(By.xpath('//*[@id="requisitionDescriptionInterface.reqContestNumberValue.row1"]'));
                            job.JDTID_UNIQUE_NUMBER = await jobIdElement.getText();
                            job.JOB_APPLY_URL = "https://ericksonjobs.taleo.net/careersection/3/jobapply.ftl?lang=en&job=" + job.JDTID_UNIQUE_NUMBER;
                            var jobtypeElement = await driverjobdetails.findElements(By.xpath('//*[@id="requisitionDescriptionInterface.ID1898.row1"][@class="text"]'));
                            var isJobType = await jobtypeElement.length;
                            if (isJobType) {
                                var type = await driverjobdetails.findElement(By.xpath('//*[@id="requisitionDescriptionInterface.ID1898.row1"][@class="text"]')).getText();
                                job.JOB_TYPE = type;
                            }
                            var dateElement = await driverjobdetails.findElement(By.xpath('//*[@id="requisitionDescriptionInterface.reqPostingDate.row1"]'));
                            job.ASSIGNMENT_START_DATE = await dateElement.getText();
                            var descriptionElement = await driverjobdetails.findElement(By.xpath('//div[@class="editablesection"]'));
                            var desc1 = await descriptionElement.getAttribute("outerHTML");

                            var descr = desc1.split('<span class="subtitle">Description');
                            var desc = descr[1].split('<span id="requisitionDescriptionInterface.ID1654');
                            var description = ' <span class="subtitle">Description' + desc[0].replace('Description', 'Description<br>') + '<span id="requisitionDescriptionInterface.ID1654.row1" class="subtitle" title="" style="">:</span><span class="inline">&nbsp;</span>';

                            if (location != null) {
                                var loc = location.split("-");
                                if (loc.length == 2) {
                                    job.JOB_LOCATION_CITY = loc[1];
                                    job.JOB_LOCATION_COUNTRY = loc[0];
                                }
                                else if (loc.length == 3) {
                                    job.JOB_LOCATION_COUNTRY = loc[0];
                                    job.JOB_LOCATION_STATE = loc[1];
                                    job.JOB_LOCATION_CITY = loc[2];
                                }
                                else {
                                    job.JOB_LOCATION_CITY = location;
                                }
                            }

                            if (job.JOB_LOCATION_COUNTRY == "United States") {
                                job.JOB_LOCATION_COUNTRY = "US";
                            }
                            job.TEXT = HtmlEscape(description);
                            jobMaker.successful.add(job, botScheduleID);
                        }
                        counter++;
                    } catch (e) {
                        jobMaker.failed.add(job.JDTID_UNIQUE_NUMBER, e.message);
                        counter++;
                    }
                }
            } while (isPresent);
            try {
                var e = await driver.findElements(By.xpath('//*[@class="navigation-link-enabled"][contains(text(),"Next")]'));
                if (e.length == 1) {
                    var nextPage = await driver.findElement(By.xpath('//*[@class="navigation-link-enabled"][contains(text(),"Next")]'));
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

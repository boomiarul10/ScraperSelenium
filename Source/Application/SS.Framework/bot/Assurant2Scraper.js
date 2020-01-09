var Promise = require('promise');
var package = global.createPackage();
var he = require('he');
var service = package.service;
var resource = package.resource;
var log = resource.constants.log;
var selenium = package.scrape.selenium();
var jobMaker = package.resource.download.variable("job");
jobMaker.setAlertCount(3);
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
        await driver.get('https://assurant.taleo.net/careersection/11380/jobsearch.ftl?lang=en&amp;portal=6160180096');
        await driver.sleep(10000);

        var jobCountElement = await driver.findElement(By.xpath('//*[@id="currentPageInfo"]'));
        var atsCount = await jobCountElement.getText();
        var jobCount = atsCount.split("of");
        var atsJobCount = jobCount[1].trim();
        jobMaker.setatsJobCount(parseInt(atsJobCount));

        var loop;
        do {
            loop = false;
            var counter = 1;
            do {
                var jobContainer = await driver.findElements(By.xpath('//*[@summary="Job Openings"]/tbody/tr[' + counter + ']'));
                var isPresent = await jobContainer.length;
                if (isPresent) {
                    try {
                        var job = jobMaker.create();
                        job.COMPANY_URL = "https://assurant.taleo.net/careersection/11380/jobsearch.ftl?lang=en&src=CWS-10920";
                        job.JOB_CONTACT_COMPANY = "Assurant";
                        job.JOB_LOCATION_COUNTRY = "US";
                        var jobIdElement = await driver.findElement(By.xpath('//*[@summary="Job Openings"]/tbody/tr[' + counter + ']/td[2]//span'));
                        job.JDTID_UNIQUE_NUMBER = await jobIdElement.getText();
                        var relocationElement = await driver.findElement(By.xpath('//*[@summary="Job Openings"]/tbody/tr[' + counter + ']/td[3]//span'));
                        job.RELOCATION = await relocationElement.getText();

                        var jobDetailURL = "https://assurant.taleo.net/careersection/11380/jobdetail.ftl?lang=en&job=" + job.JDTID_UNIQUE_NUMBER;
                        job.JOB_APPLY_URL = jobDetailURL;
                        await driverjobdetails.get(jobDetailURL);
                        await driverjobdetails.sleep(1000);

                        var jobdetailspage = await driverjobdetails.findElements(By.xpath('//div[@class="editablesection"]'));
                        var isDetailPage = await jobdetailspage.length;
                        if (isDetailPage) {
                            var titleElement = await driverjobdetails.findElement(By.xpath('//*[@id="requisitionDescriptionInterface.reqTitleLinkAction.row1"]'));
                            job.JOB_TITLE = await titleElement.getText();
                            var locationElement = await driverjobdetails.findElement(By.xpath('//*[@id="requisitionDescriptionInterface.ID1566.row1"]'));
                            var location = await locationElement.getText();

                            var categoryElement = await driverjobdetails.findElement(By.xpath('//*[@id="requisitionDescriptionInterface.ID1526.row1"][@class="text"]'));
                            job.JOB_CATEGORY = await categoryElement.getText();
                            job.JOB_CATEGORY = job.JOB_CATEGORY.replace('Light Manufacturing-HV', 'Light Manufacturing');
                            var descriptionElement = await driverjobdetails.findElement(By.xpath('//div[@class="editablesection"]'));
                            var desc1 = await descriptionElement.getAttribute("outerHTML");

                            var descr = desc1.split('<div id="requisitionDescriptionInterface.ID1377.row1"');
                            var desc = descr[1].split('<div id="requisitionDescriptionInterface.ID1489.row1');
                            var text = '<div id="requisitionDescriptionInterface.ID1377.row1"' + desc[0] + 'Primary location';

                            text = text.replace('<div class="staticcontentlinepanel"><p></p></div>Primary location', '').
                                replace('Send this job to a friend', '').replace('Return to the job list', '').replace('Send a Résumé', '');
                            text = text + '<br/> Requisition Number:' + job.JDTID_UNIQUE_NUMBER;

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

                            job.TEXT = HtmlEscape(text);
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
                var e = await driver.findElements(By.xpath('//*[@id="next"][@aria-disabled="false"]'));
                if (e.length == 1) {
                    var nextPage = await driver.findElement(By.xpath('//*[@id="next"][@aria-disabled="false"]'));
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

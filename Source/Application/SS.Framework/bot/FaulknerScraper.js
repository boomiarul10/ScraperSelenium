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

        await driver.get('https://partners.taleo.net/careersection/bwfh/jobsearch.ftl?lang=en');

        var search = await driver.wait(until.elementLocated(By.xpath('//*[@id="ORGANIZATION-content"]/div[1]/div[3]/a/label/div')), 5000);
        await search.click();
        await driver.sleep(2000);
        var totalJobElement = await driver.findElement(By.xpath('//*[@id="currentPageInfo"]'));
        var totalJobCount = await totalJobElement.getText();
        var atsCount = totalJobCount.split("of");
        jobMaker.setatsJobCount(parseInt(atsCount[1].trim()));

        do {
            loop = false;
            var counter = 1;
            do {

                var jobContainer = await driver.findElements(By.xpath('//*[@id="jobs"]/tbody/tr[' + counter + ']/th'));
                var isPresent = await jobContainer.length;
                if (isPresent) {
                    try {
                        var job = jobMaker.create();

                        var titleElement = await driver.findElement(By.xpath('//*[@id="jobs"]/tbody/tr[' + counter + ']/th/div/div/span/a'));
                        job.JOB_TITLE = await titleElement.getText();

                        var urlElement = await driver.findElement(By.xpath('//*[@id="jobs"]/tbody/tr[' + counter + ']/th/div/div/span/a'));
                        var url = await urlElement.getAttribute("href");
                        await driverjobdetails.get(url);
                        job.JOB_APPLY_URL = url;
                        await driver.sleep(2000);
                        var jobdetailspage = await driverjobdetails.findElements(By.xpath('//*[@id="requisitionDescriptionInterface.descRequisition"]'));
                        var isDetailPage = await jobdetailspage.length;
                        if (isDetailPage) {

                            var idElement = await driverjobdetails.findElement(By.xpath('//*[@id="requisitionDescriptionInterface.reqContestNumberValue.row1"]'));
                            var jobId = await idElement.getText();
                            job.JDTID_UNIQUE_NUMBER = parseInt(jobId.trim());

                            var locationElement = await driverjobdetails.findElement(By.xpath('//*[@id="requisitionDescriptionInterface.ID1717.row1"]'));
                            var location = await locationElement.getText();
                            job.JOB_LOCATION_COUNTRY = "US"
                            if (location) {
                                var loc = location.split("-");
                                job.JOB_LOCATION_CITY = loc[1];
                                job.JOB_LOCATION_STATE = loc[0];
                            }
                            var categoryElement = await driverjobdetails.findElement(By.xpath('//*[@id="requisitionDescriptionInterface.ID1929.row1"]'));
                            job.JOB_CATEGORY = await categoryElement.getText();

                            var dateElement = await driverjobdetails.findElement(By.xpath('//*[@id="requisitionDescriptionInterface.reqPostingDate.row1"]'));
                            job.ASSIGNMENT_START_DATE = await dateElement.getText();

                            var contactElement = await driverjobdetails.findElement(By.xpath('//*[@id="requisitionDescriptionInterface.ID1979.row1"]'));
                            job.JOB_CONTACT_COMPANY = await contactElement.getText();

                            var typeElement = await driverjobdetails.findElements(By.xpath('//*[@id="requisitionDescriptionInterface.ID2121.row1"]'));
                            var isJobType = await typeElement.length;
                            if (isJobType) {
                                var jobTypeElement = await driverjobdetails.findElement(By.xpath('//*[@id="requisitionDescriptionInterface.ID2121.row1"]'));
                                var jobtype = await jobTypeElement.getText();
                                job.JOB_TYPE = jobtype;
                            }
                            var descriptionElement = await driverjobdetails.findElement(By.xpath('//*[@id="requisitionDescriptionInterface.ID3171.row"]/td/div/h1/div'));
                            var desc1 = await descriptionElement.getAttribute("outerHTML");

                            var jobDescriptionElement = await driverjobdetails.findElement(By.xpath('//*[@id="requisitionDescriptionInterface.ID1472.row1"]'));
                            var desc2 = await jobDescriptionElement.getAttribute("outerHTML");
                            var jobDescElement = await driverjobdetails.findElement(By.xpath('//*[@id="requisitionDescriptionInterface.ID1518.row1"]'));
                            var desc3 = await jobDescElement.getAttribute("outerHTML");
                            var jobDescrElement = await driverjobdetails.findElement(By.xpath('//*[@id="requisitionDescriptionInterface.ID1576.row1"]'));
                            var desc4 = await jobDescrElement.getAttribute("outerHTML");
                            var description = desc1 + desc2 + desc3 + desc4;
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
                var nextContainer = await driver.findElements(By.xpath('//a[@id="next"][@class="navigation-link-disabled"]'));
                var next = nextContainer.length;
                if (next == 0) {
                    var nextLink = await driver.findElement(By.xpath('//a[@id="next"]'));
                    await nextLink.click();
                    await driver.sleep(2000);
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
    description = description.replace(/&#9;/g, '');
    description = description.replace(/^\s+|\s+$/g, ' ');
    description = description.replace(/\r?\n|\r/g, ' ');
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
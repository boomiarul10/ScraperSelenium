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

        await driver.get('https://ericksonjobs.taleo.net/careersection/2/jobsearch.ftl?lang=en&portal=101430233');

        var jobCountElement = await driver.findElement(By.xpath('//*[@class="subtitle"][contains(text(),"Search Results")]'));
        var atsCount = await jobCountElement.getText();
        var jobCount = atsCount.split("(");
        var atsJobCount = jobCount[1].split(")");
        jobMaker.setatsJobCount(parseInt(atsJobCount[0]));

        var jobSizePerPageElement = await driver.findElement(By.xpath('//*[@id="requisitionListInterface.dropListSize"]/option[5]'));
        await jobSizePerPageElement.click();
        await driver.sleep(5000);

        var categoryElement = await driver.findElement(By.xpath('//*[@id="basicSearchInterface.jobfield1L1"]'));
        var optionArray = await categoryElement.findElements(By.tagName('option'));

        for (var i = 2; i <= optionArray.length; i++) {

            if (i > 2) {
                var showCriteriaLink = await driver.findElement(By.xpath('//*[@id="basicSearchFooterInterface.showCriteriaAction"]'));
                await showCriteriaLink.click();
                await driver.sleep(2000);
            }

            var option = await driver.findElement(By.xpath('//*[@id="basicSearchInterface.jobfield1L1"]/option[' + i + ']'));
            var category = await option.getAttribute('text');
            await option.click();
            await driver.sleep(7000);
            var submitElement = await driver.findElement(By.xpath('//*[@id="basicSearchFooterInterface.searchAction"]'));
            await submitElement.click();
            await driver.sleep(3000);

            var categoryJobCountElement = await driver.findElement(By.xpath('//*[@class="subtitle"][contains(text(),"Search Results")]'));
            var categoryCount = await categoryJobCountElement.getText();
            if (categoryCount.includes('jobs')) {
                var jobcategoryCount = categoryCount.split("(");
                var cateCount = jobcategoryCount[1].split("jobs");
                var catCount = cateCount[0].trim();

                if (catCount > 10) {
                    var jobSizePerPage50Element = await driver.findElement(By.xpath('//*[@id="requisitionListInterface.dropListSize"]/option[4]'));
                    await jobSizePerPage50Element.click();
                    await driver.sleep(3000);

                    var jobSizePerPage100Element = await driver.findElement(By.xpath('//*[@id="requisitionListInterface.dropListSize"]/option[5]'));
                    await jobSizePerPage100Element.click();
                    await driver.sleep(3000);
                }
            }
            var loop;
            do {
                loop = false;
                var counter = 1;
                do {
                    var jobContainer = await driver.findElements(By.xpath('//*[@id="requisitionListInterface.listRequisition"]/tbody/tr[' + counter + ']'));
                    var isPresent = await jobContainer.length;
                    if (isPresent) {
                        try {
                            var job = jobMaker.create();

                            var titleElement = await driver.findElement(By.xpath('//*[@id="requisitionListInterface.listRequisition"]/tbody/tr[' + counter + ']//span[@class="titlelink"]/a'));
                            var title = await titleElement.getText();
                            var jobIdElement = await driver.findElement(By.xpath('//*[@id="requisitionListInterface.listRequisition"]/tbody/tr[' + counter + ']//span[contains(@id,"requisitionListInterface.reqContestNumberValue")]'));
                            job.JDTID_UNIQUE_NUMBER = await jobIdElement.getText();
                            job.JOB_APPLY_URL = "https://ericksonjobs.taleo.net/careersection/2/jobapply.ftl?lang=en&job=" + job.JDTID_UNIQUE_NUMBER;

                            var jobDetailURL = "https://ericksonjobs.taleo.net/careersection/2/jobdetail.ftl?job=" + job.JDTID_UNIQUE_NUMBER;
                            await driverjobdetails.get(jobDetailURL);
                            await driver.sleep(3000);

                            var locationElement = await driverjobdetails.findElement(By.xpath('//*[@id="requisitionDescriptionInterface.ID1819.row1"]'));
                            var location = await locationElement.getText();
                            var dateElement = await driverjobdetails.findElement(By.xpath('//*[@id="requisitionDescriptionInterface.reqPostingDate.row1"]'));
                            job.ASSIGNMENT_START_DATE = await dateElement.getText();

                            var descriptionElement = await driverjobdetails.findElement(By.xpath('//*[@id="requisitionDescriptionInterface.ID1564.row1"][@class="contentlinepanel"]'));
                            var desc1 = await descriptionElement.getAttribute("outerHTML");
                            var jobDescriptionElement = await driverjobdetails.findElement(By.xpath('//*[@id="requisitionDescriptionInterface.ID3295.row.row1"]/td[1]/div/div[4]'));
                            var desc2 = await jobDescriptionElement.getAttribute("outerHTML");
                            var jobDescElement = await driverjobdetails.findElement(By.xpath('//*[@id="requisitionDescriptionInterface.ID1626.row1"][@class="contentlinepanel"]'));
                            var desc3 = await jobDescElement.getAttribute("outerHTML");

                            var desc = desc1 + desc2 + desc3;
                            job.JOB_TITLE = title;

                            job.JOB_CATEGORY = category;
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
                            job.TEXT = HtmlEscape(desc);
                            jobMaker.successful.add(job, botScheduleID);
                            counter = counter + 2;
                        } catch (e) {
                            jobMaker.failed.add(job.JDTID_UNIQUE_NUMBER, e.message);
                            counter = counter + 2;
                        }
                    }
                } while (isPresent);
                try {
                    var e = await driver.findElements(By.xpath('//*[@id="requisitionListInterface.pagerDivID4494.panel.Next"]/span[@class="pagerlink"]/a'));
                    if (e.length == 1) {
                        var nextPage = await driver.findElement(By.xpath('//*[@id="requisitionListInterface.pagerDivID4494.panel.Next"]/span[@class="pagerlink"]/a'));
                        await nextPage.click();
                        loop = true;
                    }
                } catch (e) {
                    var ex = e.message;
                }
            } while (loop);
        }
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

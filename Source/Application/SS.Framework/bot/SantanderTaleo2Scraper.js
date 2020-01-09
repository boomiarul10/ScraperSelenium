var Promise = require('promise');
var package = global.createPackage();
var he = require('he');
var cleanHtml = require('clean-html');
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

        await driver.get('https://santanderus.taleo.net/careersection/2/jobsearch.ftl?lang=en');

        var atsJobCount = await driver.wait(until.elementLocated(By.xpath("//div[@id='requisitionListInterface.searchResultHeaderId']")), 4000);
        var atscount = await atsJobCount.getText();
        var record = atscount.split("Results (").pop().split("jobs").shift();
        jobMaker.setatsJobCount(parseInt(record.trim()));

        await driver.findElement(By.xpath('//*[@id="requisitionListInterface.dropListSize"]/option[5]')).click();

        var categoryElement = await driver.findElement(By.xpath('//*[@id="advancedSearchInterface.jobfield1L1"]'));
        var optionArray = await categoryElement.findElements(By.tagName('option'));

        for (var i = 2; i <= optionArray.length; i++) {
            var option = await driver.findElement(By.xpath('//*[@id="advancedSearchInterface.jobfield1L1"]/option[' + i + ']'));
            var category = await option.getAttribute('text');
            await option.click();
            var submitElement = await driver.findElement(By.xpath('//*[@id="advancedSearchFooterInterface.searchAction"]'));
            await submitElement.click();

            var loop;
            var pagenumber = 1;
            do {
                loop = false;
                var counter = 1;
                do {
                    var jobContainer = await driver.findElements(By.xpath("//*[@id='requisitionListInterface.listRequisition']/tbody/tr[@class='ftlcopy ftlrow'][" + counter + ']'));
                    var isPresent = await jobContainer.length;
                    if (isPresent) {
                        try {
                            var job = jobMaker.create();

                            var idElement = await driver.findElement(By.xpath("//*[@id='requisitionListInterface.listRequisition']/tbody/tr[@class='ftlcopy ftlrow'][" + counter + "]//div[@class='editablesection']//span[starts-with(@id,'requisitionListInterface.reqContestNumberValue.row')]"));
                            job.JDTID_UNIQUE_NUMBER = await idElement.getText();

                            var zipElement = await driver.findElement(By.xpath("//*[@id='requisitionListInterface.listRequisition']/tbody/tr[@class='ftlcopy ftlrow'][" + counter + "]/td[2]/div"));
                            job.JOB_CONTACT_ADDRESS = await zipElement.getAttribute("id");

                            var titleElement = await driver.findElement(By.xpath("//*[@id='requisitionListInterface.listRequisition']/tbody/tr[@class='ftlcopy ftlrow'][" + counter + "]//a[starts-with(@id,'requisitionListInterface.reqTitleLinkAction.row')]"));
                            job.JOB_TITLE = await titleElement.getText();

                            var locElement = await driver.findElement(By.xpath("//*[@id='requisitionListInterface.listRequisition']/tbody/tr[@class='ftlcopy ftlrow'][" + counter + "]//span[starts-with(@id,'requisitionListInterface.reqBasicLocation.row')]"));
                            var location = await locElement.getText();
                            if (location) {
                                var loc = location.split("-");
                                if (loc.length >= 2) {
                                    job.JOB_LOCATION_CITY = loc[1];
                                    job.JOB_LOCATION_STATE = loc[0];
                                    job.JOB_LOCATION_COUNTRY = "United States";
                                }
                                else {
                                    job.JOB_LOCATION_STATE = location;
                                    job.JOB_LOCATION_COUNTRY = "United States";
                                }
                            }


                            var url = "https://santanderus.taleo.net/careersection/2/jobdetail.ftl?job=" + job.JDTID_UNIQUE_NUMBER;
                            var applyURL = "https://santanderus.taleo.net/careersection/2/jobapply.ftl?job=" + job.JDTID_UNIQUE_NUMBER;
                            job.JOB_APPLY_URL = applyURL;

                            await driverjobdetails.get(url);

                            var jobdetailspage = await driverjobdetails.findElements(By.xpath("//div[@class='editablesection']"));
                            var isDetailPage = await jobdetailspage.length;
                            if (isDetailPage) {
                                var descElement = await driverjobdetails.findElement(By.xpath("//div[@class='editablesection' and div[position()>1 and position()<last()]]"));
                                var desc = await descElement.getAttribute("innerHTML");
                                job.TEXT = desc;

                                var otherlocElement = await driverjobdetails.findElements(By.xpath('//*[@id="requisitionDescriptionInterface.ID1805.row1"]'));
                                var otherLoc = await otherlocElement.length;
                                if (otherLoc) {
                                    var otherlocElement = await driverjobdetails.findElement(By.xpath('//*[@id="requisitionDescriptionInterface.ID1805.row1"]'));
                                    job.TRAVEL = await otherlocElement.getText();
                                }

                                var dateElement = await driverjobdetails.findElement(By.xpath("//span[@id='requisitionDescriptionInterface.reqPostingDate.row1']"));
                                job.ASSIGNMENT_START_DATE = await dateElement.getText();

                                var typeElement = await driverjobdetails.findElements(By.xpath("//span[contains(@class,'jobtype')]"));
                                var typeLength = await typeElement.length;
                                if (typeLength) {
                                    var typeElement = await driverjobdetails.findElement(By.xpath("//span[contains(@class,'jobtype')]"));
                                    job.JOB_TYPE = await typeElement.getText();
                                }

                                job.JOB_CATEGORY = category;

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
                    var pagerLink = await driver.findElement(By.xpath('//*[@class="editablesection"]'));
                    var pager = await pagerLink.getText();
                    if (pager.indexOf('No jobs') < 0) {
                        var HomeElement = await driver.findElements(By.xpath('//*[@class="pagerpanel"]//span[contains(@id,"Next")]/span[@class="pagerlink"]'));
                        var home = await HomeElement.length;
                        if (home) {
                            var nextLink = await driver.findElement(By.xpath('//a[contains(@id,"Next")]'));
                            await nextLink.click();
                            loop = true;
                        }
                    }
                } catch (e) {

                }
            } while (loop);
            var clearElementData = await driver.findElements(By.xpath("//input[@id='advancedSearchFooterInterface.clearAction']"));
            var isclearElementPresent = await clearElementData.length;
            if (isclearElementPresent) {
                var clearElement = await driver.findElement(By.xpath("//input[@id='advancedSearchFooterInterface.clearAction']"));
                await clearElement.click();
                await driver.sleep(1000);
            }
        }
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

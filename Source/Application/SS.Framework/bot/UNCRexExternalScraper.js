var Promise = require('promise');
var package = global.createPackage();
var he = require('he');
var service = package.service;
var resource = package.resource;
var log = resource.constants.log;
var selenium = package.scrape.selenium();
var jobMaker = package.resource.download.variable("job");
jobMaker.setAlertCount(2);
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

        await driver.manage().window().maximize();

        await driver.get('https://unchealthcare.taleo.net/careersection/rex+external+career+section/jobsearch.ftl?lang=en');

        var atsJobCount = await driver.wait(until.elementLocated(By.xpath("//div[@id='requisitionListInterface.searchResultHeaderId']")), 4000);
        var atscount = await atsJobCount.getText();
        var record = atscount.split("Results (").pop().split("jobs").shift();
        jobMaker.setatsJobCount(parseInt(record.trim()));

        await driver.findElement(By.xpath('//*[@id="requisitionListInterface.dropListSize"]/option[5]')).click();

        var categoryElement = await driver.findElement(By.xpath('//*[@id="basicSearchInterface.jobfield1L1"]'));
        var optionArray = await categoryElement.findElements(By.tagName('option'));

        for (var i = 2; i <= optionArray.length; i++) {
            var option = await driver.findElement(By.xpath('//*[@id="basicSearchInterface.jobfield1L1"]/option[' + i + ']'));
            var category = await option.getAttribute('text');
            await option.click();
            await driver.sleep(1000);
            var submitElement = await driver.findElement(By.xpath('//*[@id="basicSearchFooterInterface.searchAction"]'));
            await submitElement.click();

            var loop;
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

                            var titleElement = await driver.findElement(By.xpath("//*[@id='requisitionListInterface.listRequisition']/tbody/tr[@class='ftlcopy ftlrow'][" + counter + "]//a[starts-with(@id,'requisitionListInterface.reqTitleLinkAction.row')]"));
                            job.JOB_TITLE = await titleElement.getText();

                            var locElement = await driver.findElement(By.xpath("//*[@id='requisitionListInterface.listRequisition']/tbody/tr[@class='ftlcopy ftlrow'][" + counter + "]//span[contains(@id,'requisitionListInterface.reqBasicLocation.row')]"));
                            var location = await locElement.getText();

                            var url = "https://unchealthcare.taleo.net/careersection/rex+external+career+section/jobdetail.ftl?job=" + job.JDTID_UNIQUE_NUMBER;
                            var applyURL = "https://unchealthcare.taleo.net/careersection/rex+external+career+section/jobapply.ftl?lang=en&job=" + job.JDTID_UNIQUE_NUMBER + "";

                            job.JOB_APPLY_URL = applyURL;

                            await driverjobdetails.get(url);

                            if (location) {
                                var loc = location.split("-");
                                if (loc.length == 3) {
                                    job.JOB_LOCATION_CITY = loc[2];
                                    job.JOB_LOCATION_STATE = loc[1];
                                    job.JOB_LOCATION_COUNTRY = loc[0];
                                }
                            }

                            var typeElement = await driverjobdetails.findElements(By.xpath("//*[@id='requisitionDescriptionInterface.ID1879.row1']"));
                            var typeLength = await typeElement.length;
                            if (typeLength) {
                                var typeElement = await driverjobdetails.findElement(By.xpath("//*[@id='requisitionDescriptionInterface.ID1879.row1']"));
                                job.JOB_TYPE = await typeElement.getText();
                            }

                            var descElement = await driverjobdetails.findElement(By.xpath("//div[@class='editablesection']"));
                            var desc = await descElement.getAttribute("innerHTML");

                            job.TEXT = HtmlEscape(desc);

                            job.JOB_CATEGORY = category;

                            jobMaker.successful.add(job, botScheduleID);
                            counter++;
                        } catch (e) {
                            jobMaker.failed.add(job.JDTID_UNIQUE_NUMBER, e.message);
                            counter++;
                        }
                    }
                } while (isPresent);
                try {
                    var HomeElement = await driver.findElements(By.xpath('//*[@class="pagerpanel"]//span[contains(@id,"Next")]/span[@class="pagerlink"]'));
                    var home = await HomeElement.length;
                    if (home) {
                        var nextLink = await driver.findElement(By.xpath('//a[contains(@id,"Next")]'));
                        await nextLink.click();
                        loop = true;
                    }
                } catch (e) {
                }
            } while (loop);
            var clearElementData = await driver.findElements(By.xpath("//input[@id='basicSearchFooterInterface.clearAction']"));
            var isclearElementPresent = await clearElementData.length;
            if (isclearElementPresent) {
                var clearElement = await driver.findElement(By.xpath("//input[@id='basicSearchFooterInterface.clearAction']"));
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
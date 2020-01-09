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

        await driver.manage().window().maximize();

        await driver.get('https://schwans.taleo.net/careersection/external/jobsearch.ftl?lang=en');

        var atsJobCount = await driver.wait(until.elementLocated(By.xpath("//div[@id='requisitionListInterface.searchResultHeaderId']")), 4000);
        var atscount = await atsJobCount.getText();
        var record = atscount.split("Results (").pop().split("jobs").shift();
        jobMaker.setatsJobCount(parseInt(record.trim()));

        await driver.findElement(By.xpath('//*[@id="requisitionListInterface.dropListSize"]/option[5]')).click();

        var categoryElement = await driver.findElement(By.xpath('//select[@id="basicSearchInterface.jobfield1L1"]'));
        var optionArray = await categoryElement.findElements(By.tagName('option'));

        for (var i = 2; i <= optionArray.length; i++) {
            var option = await driver.findElement(By.xpath('//select[@id="basicSearchInterface.jobfield1L1"]/Option[' + i + ']'));
            var category = await option.getAttribute('text');
            await option.click();
            await driver.wait(until.elementLocated(By.xpath('//select[@name="jobfield1L2"]')), 10000);
            var submitElement = await driver.findElement(By.xpath('//*[@id="basicSearchFooterInterface.searchAction"]'));
            await submitElement.click();

            var loop;
            do {
                var prime = 1;
                loop = false;
                do {
                    var jobContainer = await driver.findElements(By.xpath("//*[@id='requisitionListInterface.listRequisition']/tbody/tr[@class='ftlcopy ftlrow'][" + prime + "]"));
                    var isPresent = await jobContainer.length;
                    if (isPresent) {
                        try {
                            var job = jobMaker.create();

                            var titleElement = await driver.findElement(By.xpath("//*[@id='requisitionListInterface.listRequisition']/tbody/tr[@class='ftlcopy ftlrow'][" + prime + "]//a[starts-with(@id,'requisitionListInterface.reqTitleLinkAction.row')]"));
                            var title = await titleElement.getText();

                            var idElement = await driver.findElement(By.xpath("//*[@id='requisitionListInterface.listRequisition']/tbody/tr[@class='ftlcopy ftlrow'][" + prime + "]//div[@class='editablesection']//span[starts-with(@id,'requisitionListInterface.reqContestNumberValue.row')]"));
                            var jobId = await idElement.getText();

                            var url = "https://schwans.taleo.net/careersection/external/jobdetail.ftl?job=" + jobId + "&lang=en";
                            await driverjobdetails.get(url);
                            await driverjobdetails.wait(until.elementLocated(By.xpath('//div[@class="editablesection"]')), 15000);

                            var jobCompany = await driverjobdetails.findElement(By.xpath('//*[@id="requisitionDescriptionInterface.ID1644.row1"]'));
                            var company = await jobCompany.getText();

                            var locationElement = await driverjobdetails.findElement(By.xpath('//*[@id="requisitionDescriptionInterface.ID1694.row1"]'));
                            var location = await locationElement.getText();

                           var zipElement = await driverjobdetails.findElement(By.xpath('//*[@id="requisitionDescriptionInterface.ID1706.row1"]'));
                            var zip = await zipElement.getText();

                           // var zipElement = await driverjobdetails.findElement(By.xpath('//*[@id="requisitionno"]'));
                           // var zip = await zipElement.getAttribute("value");

                            if (location) {
                                job.JOB_SALARY = location + " " + zip;
                            }

                            var jobDescription = await driverjobdetails.findElement(By.xpath('//div[@class="editablesection"]'));
                            var description = await jobDescription.getAttribute("innerHTML");//
                            var descRemove = await driverjobdetails.findElement(By.xpath('//*[@id="requisitionDescriptionInterface.ID1601.row1"]'));
                            var Remove = await descRemove.getAttribute("outerHTML");
                            description = description.split('<span class="subtitle">Description</span>');
                            description = description[1].split(Remove);
                            description = '<div class="staticcontentlinepanel"><p></p></div><div id="requisitionDescriptionInterface.ID1493.row1" class="contentlinepanel" title=""><h2 xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:htm="http://www.w3.org/1999/xhtml" xmlns:ftl="http://www.taleo.net/ftl" class="no-change-header-inline"><div id="requisitionDescriptionInterface.ID1509.row1" class="inlinepanel" title="" style="display: inline;"><span class="subtitle">Description</span>' + description[0];
                            description = description.replace('<span class="subtitle">Description</span>', '<b>Description</b>').replace('Career Area', '<b>Career Area </b>').replace('<font color="#ffffff">#vfj-11-11#</font>', '');
                            description = description.replace(/<o:p>/g, '<p>').replace(/<\/o:p>/g, '</p>').replace(/h2/g, 'b');

                            var jobtype = await driverjobdetails.findElements(By.xpath('//*[@id="requisitionDescriptionInterface.ID1794.row1"]'));
                           if (jobtype.length >= 1) {
                                var jobtype = await driverjobdetails.findElement(By.xpath('//*[@id="requisitionDescriptionInterface.ID1794.row1"]'));
                                job.JOB_TYPE = await jobtype.getText();
                            }
                            var jobstatus = await driverjobdetails.findElements(By.xpath('//*[@id="requisitionDescriptionInterface.ID1804.row1"]'));
                            if (jobstatus.length >= 1) {
                                var jobstatus = await driverjobdetails.findElement(By.xpath('//*[@id="requisitionDescriptionInterface.ID1804.row1"]'));
                                job.JOB_STATUS = await jobstatus.getText();
                            }

                            job.JOB_TITLE = title;
                            job.JDTID_UNIQUE_NUMBER = jobId;
                            job.TEXT = HtmlEscape(description).replace('protectedclass', 'protected class');
                            job.JOB_CATEGORY = category;
                            job.JOB_APPLY_URL = url;
                            if (location) {
                                var loc = location.split("-");
                                job.JOB_LOCATION_CITY = loc[2];
                                job.JOB_LOCATION_STATE = loc[1];
                                job.JOB_LOCATION_COUNTRY = loc[0];
                            }
                            job.JOB_CONTACT_COMPANY = company;
                            job.JOB_LOCATION_ZIP = zip;

                            jobMaker.successful.add(job, botScheduleID);
                            prime++;
                        }
                        catch (e) {
                            jobMaker.failed.add(job.JDTID_UNIQUE_NUMBER, e.message);
                            prime++;
                        }
                    }
                } while (isPresent);
                try {
                    var pageElement = await driver.findElements(By.xpath('//*[@id="requisitionListInterface.pagerDivID4943" and contains(@style, "display: block")]'));
                    var page = pageElement.length;
                    if (page) {
                        var HomeElement = await driver.findElements(By.xpath('//*[@id="requisitionListInterface.pagerDivID4943.panel.Next"]/span[@class="pagerlink"]'));
                        var home = await HomeElement.length;
                        if (home) {
                            var nextLink = await driver.findElement(By.xpath('//*[@id="requisitionListInterface.pagerDivID4943.Next"]'));
                            await nextLink.click();
                            loop = true;
                        }
                        else {
                            await driver.get('https://schwans.taleo.net/careersection/external/jobsearch.ftl?lang=en');
                        }
                    }
                    else {
                        await driver.get('https://schwans.taleo.net/careersection/external/jobsearch.ftl?lang=en');
                    }
                }
                catch (e) { }
            } while (loop);
        }
        await driverjobdetails.quit();
        await driver.quit();
        snippet(configuration, jobMaker.atsJobCount, jobMaker.failedJobs.length, jobMaker, onsuccess, onfailure);
    } catch (e) {
        await driverjobdetails.quit();
        await driver.quit();
        var output = package.service.bot.createBotErrorOutput(configuration.scheduleid, jobMaker.jobs.length, jobMaker.atsJobCount, jobMaker.failedJobs.length, e);
        onfailure(output);
    }
}

function HtmlEscape(description) {
    description = he.encode(description, { 'useNamedReferences': true, 'decimal': true, 'allowUnsafeSymbols': true });
    description = description.replace(/&#9;/g, ' ');
    description = description.replace(/&nbsp;/g, ' ');
    description = description.replace(/\s\s+/g, ' ');
    description = description.replace(/\r?\n|\r/g, ' ');
    description = description.replace(/ZeroWidthSpace;/g, '#8203;');
    description = description.replace(/mldr/g, 'hellip;');
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
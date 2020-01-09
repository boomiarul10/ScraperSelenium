﻿var Promise = require('promise');
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

        await driver.get('https://unchealthcare.taleo.net/careersection/2/jobsearch.ftl?lang=en');

        var jobCount = await driver.findElement(By.xpath('//*[@id="requisitionListInterface"]/div[2]'));
        var atsCount = await jobCount.getText();
        atsCount = atsCount.split('(');
        var count = atsCount[1].split(' ');
        count = count[0].trim();
        jobMaker.setatsJobCount(parseInt(count));

        var categoryElement = await driver.findElement(By.xpath('//select[@id="basicSearchInterface.jobfield1L1"]'));
        var optionArray = await categoryElement.findElements(By.tagName('option'));

        for (var i = 2; i <= optionArray.length; i++) {
            var option = await driver.findElement(By.xpath('//select[@id="basicSearchInterface.jobfield1L1"]/Option[' + i + ']'));
            var category = await option.getAttribute('text');
            await option.click();
            driver.sleep(6000);
            var submitElement = await driver.findElement(By.xpath('//*[@id="basicSearchFooterInterface.searchAction"]'));
            await submitElement.click();

            var loop;
            do {
                var prime = 1;
                loop = false;
                do {
                    var jobContainer = await driver.findElements(By.xpath('//*[@id="requisitionListInterface.ID6724.row"][' + prime + ']'));
                    var isPresent = await jobContainer.length;
                    if (isPresent) {
                        try {
                            var job = jobMaker.create();

                            var titleElement = await driver.findElement(By.xpath('//*[@id="requisitionListInterface.ID6724.row"][' + prime + ']//*[@id="requisitionListInterface.ID3613.row' + prime + '"]//*[@class="titlelink"]/a'));
                            var title = await titleElement.getText();
                            var locationElement = await driver.findElement(By.xpath('//*[@id="requisitionListInterface.ID6724.row"][' + prime + ']//*[@id="requisitionListInterface.ID3807.row' + prime + '"]'));
                            var location = await locationElement.getText();
                            var typeElement = await driver.findElement(By.xpath('//*[@id="requisitionListInterface.ID6724.row"][' + prime + ']//*[@id="requisitionListInterface.ID3613.row' + prime + '"]//*[@class="jobtype"]'));
                            var type = await typeElement.getText();
                            var idElement = await driver.findElement(By.xpath('//*[@id="requisitionListInterface.ID6724.row"][' + prime + ']//*[@id="requisitionListInterface.reqContestNumberValue.row' + prime + '"]'));
                            var jobId = await idElement.getText();

                            var url = "https://unchealthcare.taleo.net/careersection/jobdetail.ftl?job=" + jobId + "&lang=en"
                            await driverjobdetails.get(url);
                            await driverjobdetails.wait(until.elementLocated(By.xpath('//div[@class="editablesection"]')), 10000);

                            var jobDescription = await driverjobdetails.findElement(By.xpath('//div[@class="editablesection"]'));
                            var description = await jobDescription.getAttribute("outerHTML");

                            var jobIndustry = await driverjobdetails.findElements(By.xpath('//*[@id="requisitionDescriptionInterface.ID1706.row1"]'));
                            if (jobIndustry.length == 1) {
                                var jobIndustry = await driverjobdetails.findElement(By.xpath('//*[@id="requisitionDescriptionInterface.ID1706.row1"]'));
                                var industry = await jobIndustry.getText();
                                industry = industry.replace('Department ', '');
                                job.JOB_INDUSTRY = industry;
                            }

                            job.JOB_TITLE = title;
                            job.JDTID_UNIQUE_NUMBER = jobId;
                            job.TEXT = HtmlEscape(description);
                            job.JOB_CATEGORY = category;
                            job.JOB_APPLY_URL = url;
                            if (location) {
                                location = location.replace("Location:", "");
                                var loc = location.split("-");
                                job.JOB_LOCATION_CITY = loc[2];
                                job.JOB_LOCATION_STATE = loc[1];
                                job.JOB_LOCATION_COUNTRY = loc[0];
                            }
                            job.JOB_TYPE = type;
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
                    var HomeElement = await driver.findElements(By.xpath('//*[@id="requisitionListInterface.pagerDivID4070.panel.Next"]/span[@class="pagerlink"]'));
                    var home = await HomeElement.length;
                    if (home) {
                        var nextLink = await driver.findElement(By.xpath('//*[@id="requisitionListInterface.pagerDivID4070.Next"]'));
                        await nextLink.click();
                        loop = true;
                    }
                    else {
                        await driver.get('https://unchealthcare.taleo.net/careersection/2/jobsearch.ftl?lang=en');
                        //var clearLink = await driver.findElement(By.xpath('//*[@id="basicSearchFooterInterface.clearAction"]'));
                        // await clearLink.click();
                        //await driver.wait(until.elementLocated(By.xpath('//select[@id="basicSearchInterface.jobfield1L1"]')), 30000);
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
    description = description.replace(/\r?\n|\r/g, '');
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
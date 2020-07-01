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

        await driver.get('https://re22.ultipro.com/ORA1000/JobBoard/SearchJobs.aspx?Page=Search');

        var searchElement = await driver.findElement(By.xpath('//input[@id="Submit"]'));
        await searchElement.click();
        var jobCount = await driver.findElement(By.xpath('//*[@id="PXForm"]/table[1]/tbody/tr/td'));
        var atsCount = await jobCount.getText();
        var atsJobCount = atsCount.split(':');
        jobMaker.setatsJobCount(parseInt(atsJobCount[2]));
        await driver.navigate().back();

        var categoryElement = await driver.findElement(By.xpath('//select[@id="Req_JobFamilyFK"]'));
        var optionArray = await categoryElement.findElements(By.tagName('option'));

        for (var i = 2; i <= optionArray.length; i++) {
            var option = await driver.findElement(By.xpath('//select[@id="Req_JobFamilyFK"]/Option[' + i + ']'));
            var category = await option.getAttribute('text');
            await option.click();
            var resultCount = await driver.findElement(By.xpath('//Select[@id="RecordsPerPage"]/Option[4]'));
            await resultCount.click();
            var submitElement = await driver.findElement(By.xpath('//input[@id="Submit"]'));
            await submitElement.click();

            var loop;
            var prime;

            do {
                prime = 2;
                loop = false;
                do {
                    var jobContainer = await driver.findElements(By.xpath("//*[@name='PXForm']/table[2]/tbody/tr[" + prime + "]/td[2]"));
                    var isPresent = await jobContainer.length;
                    if (isPresent) {
                        try {
                            var job = jobMaker.create();
                            var titleElement = await driver.findElement(By.xpath("//*[@name='PXForm']/table/tbody/tr[" + prime + "]/td[3]/a"));
                            var title = await titleElement.getText();
                            var idElement = await driver.findElement(By.xpath("//*[@name='PXForm']/table/tbody/tr[" + prime + "]/td[2]/a"));
                            var jobId = await idElement.getText();
                            var dateElement = await driver.findElement(By.xpath("//*[@name='PXForm']/table/tbody/tr[" + prime + "]/td[1]/a"));
                            var assignDate = await dateElement.getText();
                            var statusElement = await driver.findElement(By.xpath("//*[@name='PXForm']/table/tbody/tr[" + prime + "]/td[4]/a"));
                            var status = await statusElement.getText();
                            var cityElement = await driver.findElement(By.xpath("//*[@name='PXForm']/table/tbody/tr[" + prime + "]/td[5]/a"));
                            var city = await cityElement.getText();
                            var stateElement = await driver.findElement(By.xpath("//*[@name='PXForm']/table/tbody/tr[" + prime + "]/td[6]/a"));
                            var state = await stateElement.getText();

                            var url = await titleElement.getAttribute('href');

                            await driverjobdetails.get(url);

                            var jobDescription = await driverjobdetails.findElement(By.xpath('//*[@id="DataCell_Req_Description"]'));
                            var description = await jobDescription.getAttribute("outerHTML");
                            var QualificationElement = await driverjobdetails.findElement(By.xpath('//*[@id="DataCell_Req_Requirements"]'));
                            var qualification = await QualificationElement.getAttribute("outerHTML");
                            var applyurlElement = await driverjobdetails.findElement(By.xpath("//*[@name='PXForm']//a[@title='Apply On-line']"));
                            var applyurl = await applyurlElement.getAttribute("href");


                            var appURL = applyurl.split('JobID=').pop().split('&').shift();
                            applyurl = "https://re22.ultipro.com/ORA1000/JobBoard/NewCandidateExt.aspx?__JobID=" + appURL;

                            job.JOB_TITLE = title;
                            job.JDTID_UNIQUE_NUMBER = jobId;
                            job.ASSIGNMENT_START_DATE = assignDate;
                            var descriptionText = description + qualification;
                            job.TEXT = HtmlEscape(descriptionText);
                            job.JOB_CATEGORY = category;
                            job.JOB_APPLY_URL = applyurl;
                            job.JOB_LOCATION_CITY = city;
                            job.JOB_LOCATION_STATE = state;
                            job.JOB_STATUS = status;

                            jobMaker.successful.add(job, botScheduleID);
                            prime++;
                        } catch (e) {
                            jobMaker.failed.add(job.JDTID_UNIQUE_NUMBER, e.message);
                            prime++;
                        }
                    }
                } while (isPresent);
                try {
                    var pagerElement = await driver.findElements(By.xpath('//*[@title="Alt+n"]'));
                    var pager = pagerElement.length;
                    if (pager) {
                        var nextLink = await driver.findElement(By.xpath('//*[@title="Alt+n"]'));
                        await nextLink.click();
                        loop = true;
                    }
                    else {
                        var nextLink = await driver.findElement(By.xpath('//*[@href="SearchJobs.aspx?Page=Search"]'));
                        await nextLink.click();
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
    description = description.replace(/&nbsp;/g, '');
    description = description.replace(/\s\s+/g, ' ');
    description = description.replace(/\r?\n|\r/g, '');
    description = description.replace(/ZeroWidthSpace;/g, '#8203;');
    description = description.replace(/mldr;+/g, "hellip;");
    //description = description.replace(/"/g, '&quot');
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
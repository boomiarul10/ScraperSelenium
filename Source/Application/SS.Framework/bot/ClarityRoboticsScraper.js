﻿var Promise = require('promise');
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
        var driver = selenium.createDriverWithCapabilties();
        var driverjobdetails = selenium.createDriverWithCapabilties();
              
        await driver.manage().window().maximize();
        await driverjobdetails.manage().window().maximize();

        await driver.get('https://jobs-jobdistributionsandbox.icims.com/jobs/intro');
        await driver.sleep(3000);
        await driver.switchTo().frame("icims_content_iframe");
        var searchElement = await driver.findElement(By.xpath('//*[@id="jsb_form_submit_i"]'));
        await searchElement.click();

        var lastLink = await driver.findElement(By.xpath('//*[@class="iCIMS_Paginator_Bottom"]/div/a[position() = last()]'));
        await lastLink.click();

        var lastPageIndex = await driver.findElement(By.xpath('//*[@class="iCIMS_PagingBatch "]/a[position() = last()]/span[position() = last()]'));
        var indexCount = await lastPageIndex.getText();
        indexCount = indexCount.replace("of", "").trim();

        var recordCount = await driver.findElements(By.xpath('//*[@class="container-fluid iCIMS_JobsTable"]/div'));
        var records = recordCount.length;
        var jobsCount = (((indexCount - 1) * 20) + records);
        jobMaker.setatsJobCount(parseInt(jobsCount));

        var firstLink = await driver.findElement(By.xpath('//*[@class="iCIMS_Paginator_Bottom"]/div/a[position() = 1]'));
        await firstLink.click();

        var loop;
        do {
            loop = false;
            var counter = 1;
            do {
                var jobContainer = await driver.findElements(By.xpath('//div[@class="container-fluid iCIMS_JobsTable"]/div[@class="row"][' + counter + ']'));
                var isPresent = await jobContainer.length;
                if (isPresent) {
                    try {
                        var job = jobMaker.create();

                        var titleElement = await driver.findElement(By.xpath('//div[@class="container-fluid iCIMS_JobsTable"]/div[@class="row"][' + counter + ']/div[contains(@class,"title")]/a/dl/dd'));
                        job.JOB_TITLE = await titleElement.getText();
                        job.JOB_TITLE = job.JOB_TITLE.replace("Job Title:", "").trim();
                        var jobIdElement = await driver.findElement(By.xpath("//div[@class='container-fluid iCIMS_JobsTable']/div[@class='row'][" + counter + "]/div[contains(@class,'additionalFields')]/dl[1]/dd"));
                        job.JDTID_UNIQUE_NUMBER = await jobIdElement.getText();

                        var locationElement = await driver.findElement(By.xpath("//div[@class='container-fluid iCIMS_JobsTable']/div[@class='row'][" + counter + "]/div[1]/dl/dd"));
                        var location = await locationElement.getText();
                        location = location.replace("Job Locations:", "").trim();
                        job.TRAVEL = location;
                        if (location != null) {
                            if (location.indexOf("|") >= 1) {
                                var loc = location.split("|");
                                location = loc[1];
                            }
                            var loc = location.split("-");
                            if (loc.length == 3) {
                                job.JOB_LOCATION_COUNTRY = loc[0];
                                job.JOB_LOCATION_STATE = loc[1];
                                job.JOB_LOCATION_CITY = loc[2];
                            }
                            else if (loc.length == 2) {
                                job.JOB_LOCATION_COUNTRY = loc[0];
                                job.JOB_LOCATION_STATE = loc[1];
                            }
                            else if (loc.length == 1) {
                                job.JOB_LOCATION_COUNTRY = loc[0];
                            }
                            else if (loc.length == 4) {
                                job.JOB_LOCATION_COUNTRY = loc[0];
                                job.JOB_LOCATION_STATE = loc[1];
                                job.JOB_LOCATION_CITY = loc[2] + ' - ' + loc[3];
                            }
                        }
                        var titleLink = await driver.findElement(By.xpath('//div[@class="container-fluid iCIMS_JobsTable"]/div[@class="row"][' + counter + ']/div[contains(@class,"title")]/a'));
                        var url = await titleLink.getAttribute("href");
                        await driverjobdetails.get(url);
                        job.JOB_APPLY_URL = url;
                        try {
                            await driverjobdetails.switchTo().frame("icims_content_iframe");
                        } catch (err) {
                            driver.sleep(2000);
                            await driverjobdetails.switchTo().frame("icims_content_iframe");
                        }

                        var categoryElements = await driverjobdetails.findElements(By.xpath("//div[@class='container-fluid iCIMS_JobsTable']/div[@class='row']/div[contains(@class,'additionalFields')]/dl[contains(.,'Category')]"));
                        var isCategory = await categoryElements.length;
                        if (isCategory) {
                            var categoryElement = await driverjobdetails.findElement(By.xpath("//div[@class='container-fluid iCIMS_JobsTable']/div[@class='row']/div[contains(@class,'additionalFields')]/dl[contains(.,'Category')]"));
                            var category = await categoryElement.getText();
                            job.JOB_CATEGORY = category.replace('Category', '').trim();
                        }

                        var jobdetailspage = await driverjobdetails.findElements(By.xpath("//h2[@class='iCIMS_InfoMsg iCIMS_InfoField_Job'][contains(text(),'Overview')]"));
                        var isDetailPage = await jobdetailspage.length;
                        if (isDetailPage) {
                            var descriptionElement = await driverjobdetails.findElement(By.xpath("//div[@class='iCIMS_JobContent']"));
                            var overview = await descriptionElement.getAttribute("outerHTML");

                            var desc = overview.split('Overview');
                            if (desc.length >= 3) {
                                var descSplit = desc[1] + desc[2];
                                var text = descSplit.split('<div class="iCIMS_JobOptions">');
                            }
                            else {
                                var text = desc[1].split('<div class="iCIMS_JobOptions">');
                            }
                            var description = '<h2 class="iCIMS_InfoMsg iCIMS_InfoField_Job">Overview' + text[0];
                            job.TEXT = HtmlEscape(description);
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
                var e = await driver.findElements(By.xpath('//a[@target="_self"]/span[@title="Next page of results"]'));
                if (e.length == 1) {
                    var nextPage = await driver.findElement(By.xpath('//*[@target="_self"]/span[@title="Next page of results"]'));
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
    description = description.replace(/&nbsp;/g, '');
    description = description.replace(/\s\s+/g, ' ');
    description = description.replace(/\r?\n|\r/g, '');
    description = description.replace(/&#x9;/g, '');
    description = description.replace(/&ensp;+/g, "");
    description = description.replace(/&mldr;+/g, "&hellip;");
    description = description.replace(/&mp;/g, "&#8723;");
    description = description.replace(/&ZeroWidthSpace;+/g, "&#8203;");
    description = description.replace(/&dash;+/g, "&#8208;");
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
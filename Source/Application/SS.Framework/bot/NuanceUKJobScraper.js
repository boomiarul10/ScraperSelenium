﻿var Promise = require('promise');
var package = global.createPackage();
var he = require('he');
var service = package.service;
var resource = package.resource;
var cleanHtml = require('clean-html');
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
        await driverjobdetails.manage().window().maximize();
        await driver.get('https://ukirelandjobs-nuance.icims.com/');

        await driver.switchTo().frame("icims_content_iframe");
        var searchElement = await driver.findElement(By.xpath('//input[@id="jsb_form_submit_i"]'));
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
        var pagenumber = 1;
        do {
            loop = false;
            var counter = 1;
            do {
                var jobContainer = await driver.findElements(By.xpath('//*[@class="container-fluid iCIMS_JobsTable"]/div[' + counter + ']'));
                var isPresent = await jobContainer.length;
                if (isPresent) {
                    try {
                        var job = jobMaker.create();
                        var run = "default";

                        var jobIdElement = await driver.findElement(By.xpath('//*[@class="container-fluid iCIMS_JobsTable"]/div[' + counter + ']//div[@class="col-xs-12 additionalFields"]//dd'));
                        job.JDTID_UNIQUE_NUMBER = await jobIdElement.getText();
                        if (job.JDTID_UNIQUE_NUMBER) {
                            if (job.JDTID_UNIQUE_NUMBER.includes("Job ID:")) {
                                job.JDTID_UNIQUE_NUMBER = job.JDTID_UNIQUE_NUMBER.split("Job ID:")[1].trim();
                            } else {
                                job.JDTID_UNIQUE_NUMBER = job.JDTID_UNIQUE_NUMBER.trim();
                            }
                        }

                        var titleElement = await driver.findElement(By.xpath('//*[@class="container-fluid iCIMS_JobsTable"]/div[' + counter + ']//div[@class="col-xs-12 title"]/a'));
                        job.JOB_TITLE = await titleElement.getText();
                        job.JOB_TITLE = job.JOB_TITLE.replace('Job Title', '');
                        var locationElement = await driver.findElement(By.xpath('//*[@class="container-fluid iCIMS_JobsTable"]/div[' + counter + ']//div[@class="col-xs-6 header left"]//dd'));
                        var location = await locationElement.getText();
                        var multipleLocationElement = await driver.findElement(By.xpath('//*[@class="container-fluid iCIMS_JobsTable"]/div[' + counter + ']//div[@class="col-xs-6 header left"]//dd'));
                        var multipleLocation = await multipleLocationElement.getAttribute("innerHTML");
                        if (location != null) {
                            if (!(location.includes('|'))) {
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
                            }
                            else {
                                var multipleLoc = multipleLocation.split("|");
                                var loct = multipleLoc[0].split("-");
                                if (loct.length == 2) {
                                    job.JOB_LOCATION_CITY = loct[1];
                                    job.JOB_LOCATION_COUNTRY = loct[0];
                                }
                                else if (loct.length == 3) {
                                    job.JOB_LOCATION_COUNTRY = loct[0];
                                    job.JOB_LOCATION_STATE = loct[1];
                                    job.JOB_LOCATION_CITY = loct[2];
                                }
                            }
                        }

                        job.JOB_LOCATION_COUNTRY = job.JOB_LOCATION_COUNTRY.replace('GER', 'DE').replace('Germany', 'DE').replace('USA', 'US').replace('Location: ', '');

                        var l3URL = undefined;
                        l3URL = await titleElement.getAttribute("href");

                        await driverjobdetails.get(l3URL);
                        await driverjobdetails.sleep(2000);
                        await driverjobdetails.switchTo().frame("icims_content_iframe");

                        while (run != "completed") {
                            try {

                                var categoryElement = await driverjobdetails.findElement(By.xpath('//div[@class="container-fluid iCIMS_JobsTable"]//div[@class="col-xs-12 additionalFields"]/dl[2]/dd'));
                                job.JOB_CATEGORY = await categoryElement.getText();
                                if (job.JOB_CATEGORY) {
                                    job.JOB_CATEGORY = job.JOB_CATEGORY.trim();
                                }

                                var typeElement = await driverjobdetails.findElement(By.xpath('//div[@class="container-fluid iCIMS_JobsTable"]//div[@class="col-xs-12 additionalFields"]/dl[3]/dd'));
                                job.JOB_TYPE = await typeElement.getText();
                                if (job.JOB_TYPE) {
                                    job.JOB_TYPE = job.JOB_TYPE.trim();
                                    job.JOB_TYPE = job.JOB_TYPE.replace(/Employee/, "");
                                }

                                var liCodeElemData = await driverjobdetails.findElements(By.xpath('//*[@class="iCIMS_JobContent"]//*[contains(text(), "#LI")]'));
                                var liCodeElemLength = liCodeElemData.length;

                                if (liCodeElemLength) {
                                    var liCodeElem = await driverjobdetails.findElement(By.xpath('//*[@class="iCIMS_JobContent"]//*[contains(text(), "#LI")]'));
                                    job.JOB_INDUSTRY = await liCodeElem.getText();
                                }

                                var descriptionElement = await driverjobdetails.findElement(By.xpath("//div[@class='iCIMS_JobContent']/div[2]"));
                                var description = await descriptionElement.getAttribute("outerHTML");
                                var qualificationElement = await driverjobdetails.findElement(By.xpath("//div[@class='iCIMS_JobContent']/div[3]"));
                                var qualification = await qualificationElement.getAttribute("outerHTML");

                                var infoElement = await driverjobdetails.findElements(By.xpath("//div[@class='iCIMS_JobContent']/div[4][@class='iCIMS_InfoMsg iCIMS_InfoMsg_Job']"));
                                var additionalInfo = null;
                                if (infoElement.length == 1) {
                                    var additionlInfoElement = await driverjobdetails.findElement(By.xpath("//div[@class='iCIMS_JobContent']/div[4]"));
                                    additionalInfo = await additionlInfoElement.getAttribute("outerHTML");
                                    if (additionalInfo.indexOf('#LI') > 0) {
                                        var info = '<h3 class="iCIMS_InfoMsg iCIMS_InfoField_Job">LI Code:</h3>' + additionalInfo;
                                    }
                                    else {
                                        var info = '<h3 class="iCIMS_InfoMsg iCIMS_InfoField_Job">Additional Information:</h3>' + additionalInfo;
                                    }
                                }
                                var LICodeElement = await driverjobdetails.findElements(By.xpath('//h2[@class="iCIMS_InfoMsg iCIMS_InfoField_Job"][contains(text(),"LI Code")]'));
                                if (LICodeElement.length == 1) {
                                    var LiCodeInfoElement = await driverjobdetails.findElement(By.xpath("//div[@class='iCIMS_JobContent']/div[5]"));
                                    var LiCodeinfo = await LiCodeInfoElement.getAttribute("outerHTML");
                                    info += '<h3 class="iCIMS_InfoMsg iCIMS_InfoField_Job">LI Code:</h3>' + LiCodeinfo;
                                }
                                var jobOptionsElement = await driverjobdetails.findElement(By.xpath("//div[@class='iCIMS_JobOptions']"));
                                var jobOptions = await jobOptionsElement.getAttribute("outerHTML");

                                var descText = "";
                                if (additionalInfo != null) {
                                    descText = '<h2 class="iCIMS_SubHeader iCIMS_SubHeader_Job"></h2><h3 class="iCIMS_InfoMsg iCIMS_InfoField_Job">Company Overview:</h3>' +
                                        description + '<h3 class="iCIMS_InfoMsg iCIMS_InfoField_Job">Job Summary:</h3>' + qualification + info;
                                } else {
                                    descText = '<h2 class="iCIMS_SubHeader iCIMS_SubHeader_Job"></h2><h3 class="iCIMS_InfoMsg iCIMS_InfoField_Job">Company Overview:</h3>' +
                                        description + '<h3 class="iCIMS_InfoMsg iCIMS_InfoField_Job">Job Summary:</h3>' + qualification;
                                }

                                var jobDescription = "";
                                jobDescription = descText.replace("More information about this job:", "");
                                jobDescription = jobDescription + jobOptions;

                                jobDescription = jobDescription.replace(/<table/g, "<font");
                                jobDescription = jobDescription.replace(/<\/table/g, "</font");
                                jobDescription = jobDescription.replace(/<tr/g, "<font");
                                jobDescription = jobDescription.replace(/<\/tr/g, "</font");
                                jobDescription = jobDescription.replace(/<th/g, "<font");
                                jobDescription = jobDescription.replace(/<\/th/g, "</font");
                                jobDescription = jobDescription.replace(/<td/g, "<font");
                                jobDescription = jobDescription.replace(/<\/td/g, "</font");
                                jobDescription = jobDescription.replace(/<tbody/g, "<font");
                                jobDescription = jobDescription.replace(/<\/tbody/g, "</font");
                                job.TEXT = HtmlEscape(jobDescription);

                                var applyElement = await driverjobdetails.findElement(By.xpath("//div[@class='iCIMS_JobContent']/div[@class='iCIMS_JobOptions']/div[1]/a[@title='Apply for this job online']"));
                                job.JOB_APPLY_URL = await applyElement.getAttribute("href");

                                var referElement = await driverjobdetails.findElement(By.xpath("//div[@class='iCIMS_JobContent']/div[@class='iCIMS_JobOptions']/div[1]/a[@title='Refer this job to a friend']"));
                                job.JOB_CONTACT_NAME = await referElement.getAttribute("href");

                                var otherlocationElement = await driverjobdetails.findElement(By.xpath('//div[@class="container-fluid iCIMS_JobsTable"]//div[@class="col-xs-6 header left"]//dd'));
                                var otherLocations = await otherlocationElement.getAttribute("innerHTML");
                                otherLocations = otherLocations.replace(/\|/g, ',');
                                job.RELOCATION = otherLocations;

                                jobMaker.successful.add(job, botScheduleID);

                                counter++;
                                run = "completed";

                            }
                            catch (ex) {
                                if (run == "default") {
                                    run = "retry 1";
                                }
                                else if (run == "retry 1") {
                                    run = "retry 2";
                                }
                                else {
                                    run = "completed";
                                    jobMaker.failed.add(job.JDTID_UNIQUE_NUMBER, ex.message);
                                    counter++;
                                }
                            }
                        }
                    } catch (e) {
                        jobMaker.failed.add(job.JDTID_UNIQUE_NUMBER, e.message);
                        counter++;
                    }
                }
            } while (isPresent);
            try {
                var e = await driver.findElements(By.xpath('//a[@target="_self"]/span[@title="Next page of results"]'));
                if (e.length == 1) {
                    var nextPage = await driver.findElement(By.xpath('//a[@target="_self"]/span[@title="Next page of results"]'));
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
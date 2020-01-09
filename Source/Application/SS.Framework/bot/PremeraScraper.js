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

        await driver.get('https://jobs.premera.com/psc/tamextprd/EMPLOYEE/HRMS/c/HRS_HRAM.HRS_CE.GBL');
        var searchElement = await driver.findElement(By.xpath('//*[@id="HRS_APP_SRCHDRV_HRS_POSTED_WTN"]/option[2]'));
        await searchElement.click();
        var submitElement = driver.findElement(By.xpath('//*[@id="HRS_APP_SRCHDRV_HRS_SEARCH_BTN"]'));
        await submitElement.click();
        await driver.wait(until.elementLocated(By.xpath('//table[@id="tdgbrHRS_AGNT_RSLT_I$0"]/tbody/tr')), 5000);

        var atsJobCount = await driver.findElement(By.id('HRS_SCH_WRK_DESCR100')).getText();
        var record = atsJobCount.split(" ");
        jobMaker.setatsJobCount(parseInt(record[0]));


        var loop;
        var counter = 1;
        var pagenumber = 1;
        do {
            await driver.wait(until.elementLocated(By.id('tdgbrHRS_AGNT_RSLT_I$0')), 10000);
            loop = false;
            do {
                var jobContainer = await driver.findElements(By.id('trHRS_AGNT_RSLT_I$0_row' + counter));
                var isPresent = await jobContainer.length;
                if (isPresent) {
                    try {
                        var job = jobMaker.create();

                        var titleElement = await driver.findElement(By.xpath('//*[@id="trHRS_AGNT_RSLT_I$0_row' + counter + '"]/td[3]'));
                        var title = await titleElement.getText();
                        var dateElement = await driver.findElement(By.xpath('//*[@id="trHRS_AGNT_RSLT_I$0_row' + counter + '"]/td[2]'));
                        var date = await dateElement.getText();
                        var jobIdElement = await driver.findElement(By.xpath('//*[@id="trHRS_AGNT_RSLT_I$0_row' + counter + '"]/td[4]'));
                        var jobid = await jobIdElement.getText();
                        var categoryElement = await driver.findElement(By.xpath('//*[@id="trHRS_AGNT_RSLT_I$0_row' + counter + '"]/td[5]'));
                        var category = await categoryElement.getText();

                        var url = "https://jobs.premera.com/psc/tamextprd/EMPLOYEE/HRMS/c/HRS_HRAM.HRS_CE.GBL?Page=HRS_CE_JOB_DTL&Action=A&JobOpeningId=" + jobid + "&PostingSeq=";
                        var test = false;
                        var postingseq = 0;
                        do {

                            postingseq = postingseq + 1;
                            await driverjobdetails.get(url + postingseq);
                            var jobPage = await driverjobdetails.findElements(By.id('win0divHRS_JO_PST_DSCR$0'));
                            test = await jobPage.length;
                            if (test) {
                                job.JOB_APPLY_URL = url + postingseq;
                            }
                        } while (!test);

                        var descriptionElement = await driverjobdetails.findElement(By.xpath("//*[@id='HRS_JO_PDSC_VW_DESCRLONG$0']"));
                        var description = await descriptionElement.getAttribute("outerHTML");
                        var positionDescElement = await driverjobdetails.findElement(By.xpath("//*[@id='ACE_HRS_JO_PST_DSCR$0']/tbody/tr[1]"));
                        var positionDesc = await positionDescElement.getAttribute("innerHTML");
                        description = description.replace('JO_PDSC_VW', 'SCH_PSTDSC');

                        var typeElement = await driverjobdetails.findElements(By.id("HRS_CE_WRK2_HRS_FULL_PART_TIME$0"));
                        var isType = typeElement.length;
                        if (isType) {
                            var jobtypeElement = await driverjobdetails.findElement(By.id("HRS_CE_WRK2_HRS_FULL_PART_TIME$0"));
                            var type = await jobtypeElement.getText();
                        }

                        var statusElement = await driverjobdetails.findElements(By.id("HRS_CE_WRK2_HRS_REG_TEMP$0"));
                        var isStatus = statusElement.length;
                        if (isStatus) {
                            var jobstatusElement = await driverjobdetails.findElement(By.id("HRS_CE_WRK2_HRS_REG_TEMP$0"));
                            var status = await jobstatusElement.getText();
                        }

                        var locationElement = await driverjobdetails.findElement(By.id("win0divHRS_CE_WRK2_HRS_CE_JO_LCTNS$0"));
                        var otherLocations = await locationElement.getText();

                        job.JOB_TITLE = title;
                        job.JDTID_UNIQUE_NUMBER = jobid;
                        if (positionDesc.indexOf('Position Description') > 0) {
                            job.TEXT = '<div id="win0divHRS_SCH_PSTDSC$0"><table border="0" id="ACE_HRS_SCH_PSTDSC$0" cellpadding="0" cellspacing="0" cols="2" width="555" class="PABACKGROUNDINVISIBLE" style="border-style:none"><tbody><div id="win0divHRS_SCH_PSTDSC_DESCR$0"> <span class="PABOLDTEXT" id="HRS_SCH_PSTDSC_DESCR$0">Position Description</span></div> <div id="win0divHRS_SCH_PSTDSC_DESCRLONG$0">' + HtmlEscape(description) + '<script type="text/javascript"></script></div> </tbody></table></div>';
                        }
                        else {
                            job.TEXT = '<div id="win0divHRS_SCH_PSTDSC_DESCRLONG$0">' + HtmlEscape(description) + '<script type="text/javascript"></script></div>';
                        }

                        job.JOB_CATEGORY = category;
                        job.ASSIGNMENT_START_DATE = date;
                        if (otherLocations != null) {
                            var locations = otherLocations.split(";");
                            var loc = locations[0].split(",");
                            job.JOB_LOCATION_CITY = loc[0];
                            job.JOB_LOCATION_STATE = loc[1];
                        }
                        job.OTHER_LOCATIONS = otherLocations;
                        if (type != null && status != null) {
                            job.JOB_TYPE = type + "/" + status;
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
                var nextContainer = await driver.findElements(By.id('HRS_SCH_WRK_HRS_LST_NEXT'));
                var next = nextContainer.length;
                if (next) {
                    var nextLink = await driver.findElement(By.id('HRS_SCH_WRK_HRS_LST_NEXT'));
                    await nextLink.click();
                    loop = true;
                    pagenumber++;
                    await driver.wait(until.elementLocated(By.id('tdgbrHRS_AGNT_RSLT_I$0')), 10000);
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
    description = description.replace(/&#9;/g, ' ');
    description = description.replace(/&nbsp;/g, '');
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
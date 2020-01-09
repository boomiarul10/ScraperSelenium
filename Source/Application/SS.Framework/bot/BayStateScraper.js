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


        await driver.get('https://bhcareers.baystatehealth.org:444/psc/APPLICANT/EMPLOYEE/HRMS/c/HRS_HRAM_FL.HRS_CG_SEARCH_FL.GBL?FOCUS=Applicant&FolderPath=PORTAL_ROOT_OBJECT.HC_HRS_CG_SEARCH_FL_GBL2&IsFolder=false&IgnoreParamTempl=FolderPath%2cIsFolder');
        await driver.sleep(10000);
        var searchelement = await driver.findElement(By.xpath('//*[@id="NAV_PB$0"]'));
        await searchelement.click();
        await driver.sleep(20000);
        var atsJobCount = await driver.findElement(By.xpath('//*[@id="win0divHRS_SCH_WRK_FLU_HRS_SES_CNTS_MSG$70$"]/div/b'));
        var atscount = await atsJobCount.getText();
        var jobCount = atscount.trim();
        jobMaker.setatsJobCount(parseInt(jobCount));

        for (var i = 49; i < jobCount - 1;) {
            var element = await driver.findElement(By.xpath('//*[@id="HRS_AGNT_RSLT_I$0_row_' + i + '"]'));
            await driver.actions().mouseMove(element).perform();
            await driver.sleep(10000);
            i += 50;
        }

        var loop;
        var counter = 1;
        do {
            try {
                var jobContainer = await driver.findElements(By.xpath('//*[@id="win0divHRS_AGNT_RSLT_I$grid$0"]/div[1]/ul/li[' + counter + ']'));
                var isPresent = await jobContainer.length;

                if (isPresent) {

                    var job = jobMaker.create();

                    var jobIdElement = await driver.findElement(By.xpath('//*[@id="win0divHRS_AGNT_RSLT_I$grid$0"]/div[1]/ul/li[' + counter + ']//span[contains(@id,"HRS_APP_JBSCH_I_HRS_JOB_OPENING_ID$")]'));
                    job.JDTID_UNIQUE_NUMBER = await jobIdElement.getText();
                    var locationElement = await driver.findElement(By.xpath('//*[@id="win0divHRS_AGNT_RSLT_I$grid$0"]/div[1]/ul/li[' + counter + ']//span[contains(@id,"LOCATION$")]'));
                    var location = await locationElement.getText();
                    var titleElement = await driver.findElement(By.xpath('//*[@id="win0divHRS_AGNT_RSLT_I$grid$0"]/div[1]/ul/li[' + counter + ']//span[contains(@id,"SCH_JOB_TITLE$")]'));
                    var title = await titleElement.getText();
                    var categoryElement = await driver.findElement(By.xpath('//*[@id="win0divHRS_AGNT_RSLT_I$grid$0"]/div[1]/ul/li[' + counter + ']//span[contains(@id,"JOB_FUNCTION$")]'));
                    job.JOB_CATEGORY = await categoryElement.getText();
                    var dataElement = await driver.findElement(By.xpath('//*[@id="win0divHRS_AGNT_RSLT_I$grid$0"]/div[1]/ul/li[' + counter + ']//span[contains(@id,"SCH_OPENED$")]'));
                    job.ASSIGNMENT_START_DATE = await dataElement.getText();

                    if (location != null) {
                        job.JOB_LOCATION_COUNTRY = 'US';
                        var loc = location.split(",");
                        if (loc.length == 2) {
                            job.JOB_LOCATION_CITY = loc[0];
                            job.JOB_LOCATION_STATE = loc[1];
                        }
                        else if (loc.length == 3) {
                            job.JOB_LOCATION_COUNTRY = loc[2];
                            job.JOB_LOCATION_STATE = loc[1];
                            job.JOB_LOCATION_CITY = loc[0];
                        }
                        else {
                            job.JOB_LOCATION_CITY = location;
                        }
                    }


                    var jobpage = "https://bhcareers.baystatehealth.org:444/psp/APPLICANT/EMPLOYEE/HRMS/c/HRS_HRAM_FL.HRS_CG_SEARCH_FL.GBL?Page=HRS_APP_JBPST_FL&Action=U&FOCUS=Applicant&SiteId=1&JobOpeningId=" + job.JDTID_UNIQUE_NUMBER + "&PostingSeq=1";
                    var jobpage2 = "https://bhcareers.baystatehealth.org:444/psp/APPLICANT/EMPLOYEE/HRMS/c/HRS_HRAM_FL.HRS_CG_SEARCH_FL.GBL?Page=HRS_APP_JBPST_FL&Action=U&FOCUS=Applicant&SiteId=1&JobOpeningId=" + job.JDTID_UNIQUE_NUMBER + "&PostingSeq=2";
                    job.JOB_APPLY_URL = jobpage;

                    job.COMPANY_URL = "https://bhcareers.baystatehealth.org:444/psp/APPLICANT/EMPLOYEE/HRMS/c/HRS_HRAM_FL.HRS_CG_SEARCH_FL.GBL";

                    job.JOB_TITLE = title;
                    await driverjobdetails.get(jobpage);
                    await driverjobdetails.sleep(2000);
                    var jobdetailspage = await driverjobdetails.findElements(By.xpath('//*[@id="win0divHRS_SCH_WRK_DESCR100$0"]'));
                    var test = await jobdetailspage.length;
                    if (test) {
                        job.TEXT = await JobDescOperation(driverjobdetails, By, job);
                    }
                    else {
                        await driverjobdetails.get(jobpage2);
                        await driverjobdetails.sleep(3000);
                        var detail = await driverjobdetails.findElements(By.xpath('//*[@id="win0divHRS_SCH_WRK_DESCR100$0"]'));
                        var len = await detail.length;
                        if (len) {
                            job.TEXT = await JobDescOperation(driverjobdetails, By, job);
                            job.JOB_APPLY_URL = jobpage2;
                        }
                    }

                    if (job.TEXT) {
                        jobMaker.successful.add(job, botScheduleID);
                    }
                    counter++;
                }
            } catch (e) {
                jobMaker.failed.add(job.JDTID_UNIQUE_NUMBER, e.message);
                counter++;
            }
        } while (isPresent);

        var varianceCount = jobCount - (jobCount * 0.05);        
        if (jobMaker.jobs.length >= varianceCount) {
            await driver.quit();
            await driverjobdetails.quit();
            snippet(configuration, jobMaker.atsJobCount, jobMaker.failedJobs.length, jobMaker, onsuccess, onfailure);
        }
        else {
            throw new Error('variance drop limit exceeds');
        }
    } catch (e) {
        await driver.quit();
        await driverjobdetails.quit();
        var output = package.service.bot.createBotErrorOutput(configuration.scheduleid, jobMaker.jobs.length, jobMaker.atsJobCount, jobMaker.failedJobs.length, err);
        onfailure(output);
    }
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

async function JobDescOperation(driverjobdetails, By, job) {
    var fullPartTime = "";
    var jobLocation = "";
    var regularTemporary = "";
    job.JOB_TYPE = await driverjobdetails.findElement(By.xpath('//*[@id="HRS_SCH_WRK_HRS_FULL_PART_TIME"]')).getText();
    if (job.JOB_TYPE.trim()) {
        fullPartTime = "<b>Full / Part Time: </b>" + job.JOB_TYPE + "<br>";
    }
    jobLocation = await driverjobdetails.findElement(By.xpath('//*[@id="HRS_SCH_WRK_HRS_DESCRLONG"]')).getText();
    if (jobLocation.trim()) {
        jobLocation = "<b>Location: </b>" + jobLocation + "<br>";
    }
    job.JOB_STATUS = await driverjobdetails.findElement(By.xpath('//*[@id="HRS_SCH_WRK_HRS_REG_TEMP"]')).getText();
    if (job.JOB_STATUS.trim()) {
        regularTemporary = "<b>Regular/Temporary: </b>" + job.JOB_STATUS + "<br>";
    }
    var description = await driverjobdetails.findElement(By.xpath('//*[@id="win0div$ICField188"]')).getAttribute("innerHTML");

    var jobDescription = fullPartTime + jobLocation + regularTemporary + description;
    return jobDescription;
}
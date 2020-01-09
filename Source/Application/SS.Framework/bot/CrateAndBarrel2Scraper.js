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

        await driver.get('https://crateandbarrel.silkroad.com/epostings/index.cfm?company_id=15635&version=2');

        var searchelement = await driver.findElement(By.xpath('//button[@id="Search"]'));
        await searchelement.click();

        var totalJobElement = await driver.findElement(By.xpath('//*[@id="box_col_center_L_Col"]/div[2]/span'));
        var totalJobCount = await totalJobElement.getText();
        jobMaker.setatsJobCount(parseInt(totalJobCount));
        await driver.navigate().back();

        var categoryElement = await driver.findElement(By.xpath('//select[@id="byCat"]'));
        var optionArray = await categoryElement.findElements(By.tagName('option'));

        for (var i = 2; i <= optionArray.length; i++) {
            var option = await driver.findElement(By.xpath('//Select[@id="byCat"]/Option[' + i + ']'));
            var optionValue = await option.getAttribute('text');
            await option.click();


            var removeTag = i - 1;
            if (removeTag <= 1) {
                var searchelement = await driver.findElement(By.xpath('//button[@id="Search"]'));
                await searchelement.click();
            } else {
                var optionRemove = await driver.findElement(By.xpath('//Select[@id="byCat"]/Option[' + removeTag + ']'));
                await optionRemove.click();
                var searchelement = await driver.findElement(By.xpath('//button[@id="Search"]'));
                await searchelement.click();
            }

            var counter = 2;
            do {
                var jobContainer = await driver.findElements(By.xpath('//*[@id="box_col_center_L_Col"]/div[3]/table/tbody/tr[' + counter + ']/td[2]'));
                var isPresent = await jobContainer.length;
                if (isPresent) {
                    try {
                        var job = jobMaker.create();
                        job.JOB_CATEGORY = optionValue;

                        var titleElement = await driver.findElement(By.xpath('//*[@id="box_col_center_L_Col"]/div[3]/table/tbody/tr[' + counter + ']/td[2]'));
                        job.JOB_TITLE = await titleElement.getText();
                        var idElement = await driver.findElement(By.xpath('//*[@id="box_col_center_L_Col"]/div[3]/table/tbody/tr[' + counter + ']/td[1]'));
                        job.PO_NUMBER = await idElement.getText();
                        var locationElement = await driver.findElement(By.xpath('//*[@id="box_col_center_L_Col"]/div[3]/table/tbody/tr[' + counter + ']/td[3]'));
                        var location = await locationElement.getText();

                        if (location) {
                            var loc = location.split(",");
                            if (loc.length <= 3) {
                                job.JOB_LOCATION_CITY = loc[0];
                                job.JOB_LOCATION_STATE = loc[1];
                                job.JOB_LOCATION_COUNTRY = loc[2];
                            }
                            else {
                                job.JOB_LOCATION_CITY = loc[0] + "," + loc[1];
                                job.JOB_LOCATION_STATE = loc[2];
                                job.JOB_LOCATION_COUNTRY = loc[3];
                            }
                        }

                        var urlElement = await driver.findElement(By.xpath('//*[@id="box_col_center_L_Col"]/div[3]/table/tbody/tr[' + counter + ']/td[2]/a'));

                        var url = await urlElement.getAttribute("href");
                        if (url) {
                            var id = url.split("jobid=");
                            var jobID = id[1].split("&");
                            job.JDTID_UNIQUE_NUMBER = jobID[0];
                        }
                        job.JOB_APPLY_URL = "https://crateandbarrel.silkroad.com/epostings/index.cfm?fuseaction=app.jobinfo&jobid=" + job.JDTID_UNIQUE_NUMBER + "&version=2";

                        await driverjobdetails.get(url);

                        var jobdetailspage = await driverjobdetails.findElements(By.xpath("//*[@id='dspJobTxtDescDiv']"));
                        var isDetailPage = await jobdetailspage.length;
                        if (isDetailPage) {

                            var type = await driverjobdetails.findElement(By.xpath('//*[@id="translatedJobPostingTypeDiv"]')).getText();
                            job.JOB_TYPE = type;

                            var jobDescriptionElement = await driverjobdetails.findElement(By.xpath("//*[@id='dspJobTxtDescDiv']"));
                            var JobDescription = await jobDescriptionElement.getAttribute("outerHTML");

                            var descriptionElement = await driverjobdetails.findElement(By.xpath("//*[@id='jobDesciptionDiv']"));
                            var description = await descriptionElement.getAttribute("outerHTML");

                            var requiredSkillsElement = await driverjobdetails.findElements(By.xpath('//*[@id="dspJobTxtReqSkillsDiv"]'));
                            var isRequiredSkills = await requiredSkillsElement.length;

                            if (isRequiredSkills) {

                                var requiredElement = await driverjobdetails.findElement(By.xpath('//*[@id="dspJobTxtReqSkillsDiv"]'));
                                var requiredSkills = await requiredElement.getAttribute("outerHTML");

                                var requiredSkillElement = await driverjobdetails.findElement(By.xpath("//*[@id='jobRequiredSkillsDiv']"));
                                var requiredSkill = await requiredSkillElement.getAttribute("outerHTML");

                                var desc = JobDescription + description + requiredSkills + requiredSkill;
                                job.TEXT = HtmlEscape(desc);
                            }
                            else {
                                var desc = JobDescription + description;
                                job.TEXT = HtmlEscape(desc);
                            }
                        }
                        jobMaker.successful.add(job, botScheduleID);
                        counter++;
                    } catch (e) {

                    }
                }
            } while (isPresent);
            await driver.navigate().back();
        }

        driver.quit();
        driverjobdetails.quit();
        snippet(configuration, jobMaker.atsJobCount, jobMaker.failedJobs.length, jobMaker, onsuccess, onfailure);
    } catch (e) {
        driver.quit();
        driverjobdetails.quit();
        var output = package.service.bot.createBotErrorOutput(configuration.scheduleid, jobMaker.jobs.length, jobMaker.atsJobCount, jobMaker.failedJobs.length, err);
        onfailure(output);
    }
}

function HtmlEscape(description) {
    description = he.encode(description, { 'useNamedReferences': true, 'decimal': true, 'allowUnsafeSymbols': true });
    description = description.replace(/&#9;/g, ' ');
    description = description.replace(/&nbsp;/g, '');
    description = description.replace(/\s\s+/g, ' ');
    description = description.replace(/\r?\n|\r/g, '');
    description = description.replace(/&#9;/g, ' ');
    description = description.replace(/ZeroWidthSpace;/g, '#8203;');
    return description;
}

var snippet = (configuration, atsJobCount, failedJobCount, jobs, onsuccess, onfailure) => {
    service.bot.setProgress(botScheduleID, log.logType.activity, log.activity.snippet.download + "writeObjectToFile").then(values => {
        var snippet = package.resource.download.snippet("writeObjectToFile");
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
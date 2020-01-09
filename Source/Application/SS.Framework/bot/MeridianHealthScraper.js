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

        await driver.get('https://careers-meridianhealth.icims.com/jobs/intro?amp;hashed=0');

        await driver.switchTo().frame("icims_content_iframe");
        var searchElement = await driver.findElement(By.xpath('//input[@id="jsb_form_submit_i"]'));
        await searchElement.click();
        var pageElement = await driver.findElements(By.xpath('//*[@id="iCIMS_Paginator"]/option'));
        var count = await pageElement.length;
        var lastPage = await driver.findElement(By.xpath('//*[@id="iCIMS_Paginator"]/option[' + count + ']'));
        await lastPage.click();
        var recordCount = await driver.findElements(By.xpath('//table[@class="iCIMS_JobsTable iCIMS_Table"]/tbody/tr'));
        var records = recordCount.length;
        var jobsCount = (((count - 1) * 20) + records);

        var submitElement = await driver.findElement(By.xpath('//input[@id="jsb_form_submit_i"]'));
        await submitElement.click();
        jobMaker.setatsJobCount(parseInt(jobsCount));

        var categoryElement = await driver.findElement(By.xpath('//select[@id="jsb_f_position_s"]'));
        var optionArray = await categoryElement.findElements(By.tagName('option'));
        for (var i = 2; i <= optionArray.length; i++) {
            var option = await driver.findElement(By.xpath('//select[@id="jsb_f_position_s"]/Option[' + i + ']'));
            var category = await option.getAttribute('text');
            await option.click();
            await driver.sleep(1000);
            var submitElement = await driver.findElement(By.xpath('//input[@id="jsb_form_submit_i"]'));
            await submitElement.click();
            await driver.sleep(2000);
            var loop;
            do {
                loop = false;
                var counter = 1;
                do {
                    var jobContainer = await driver.findElements(By.xpath('//table[@class="iCIMS_JobsTable iCIMS_Table"]/tbody/tr[' + counter + ']'));
                    var isPresent = await jobContainer.length;
                    if (isPresent) {
                        try {
                            var job = jobMaker.create();

                            var titleElement = await driver.findElement(By.xpath('//table[@class="iCIMS_JobsTable iCIMS_Table"]/tbody/tr[' + counter + ']/td[2]/a'));
                            var title = await titleElement.getText();
                            var jobIdElement = await driver.findElement(By.xpath('//table[@class="iCIMS_JobsTable iCIMS_Table"]/tbody/tr[' + counter + ']/td[1]'));
                            var jobid = await jobIdElement.getText();
                            var statusElement = await driver.findElement(By.xpath('//table[@class="iCIMS_JobsTable iCIMS_Table"]/tbody/tr[' + counter + ']/td[5]'));
                            var status = await statusElement.getText();
                            if (status) {
                                var jobStatus = status.replace("Status:", "");
                                job.JOB_STATUS = jobStatus.trim();
                            }
                            var jobtypeElement = await driver.findElement(By.xpath('//table[@class="iCIMS_JobsTable iCIMS_Table"]/tbody/tr[' + counter + ']/td[6]'));
                            var type = await jobtypeElement.getText();
                            var locationElement = await driver.findElement(By.xpath('//table[@class="iCIMS_JobsTable iCIMS_Table"]/tbody/tr[' + counter + ']/td[4]'));
                            var location = await locationElement.getText();
                            var multipleLocationElement = await driver.findElement(By.xpath('//table[@class="iCIMS_JobsTable iCIMS_Table"]/tbody/tr[' + counter + ']/td[4]'));
                            var multipleLocation = await multipleLocationElement.getAttribute("outerHTML");
                            if (jobid) {
                                var id = jobid.split("-");
                                job.JDTID_UNIQUE_NUMBER = parseInt(id[1]);
                            }
                            if (type) {
                                var jobType = type.replace("Shift:", "");
                                job.JOB_TYPE = jobType.trim();
                            }
                            job.JOB_TITLE = title;
                            job.JOB_CATEGORY = category;
                            if (location != null) {
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
                                else {
                                    var multipleLoc = multipleLocation.split("</span>");
                                    var mult = multipleLoc[1].split("<br>");
                                    var loct = mult[0].split("-");
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
                            if (job.JOB_LOCATION_COUNTRY.includes("Job Locations:")) {
                                var locCountry = job.JOB_LOCATION_COUNTRY.replace("Job Locations:", "");
                                job.JOB_LOCATION_COUNTRY = locCountry.trim();
                            }

                            var jobDetailURL = await titleElement.getAttribute("href");
                            await driverjobdetails.get(jobDetailURL);
                            await driverjobdetails.sleep(2000);
                            await driverjobdetails.switchTo().frame("icims_content_iframe");

                            var jobdetailspage = await driverjobdetails.findElements(By.xpath('//div[@class="iCIMS_JobContent"]//h2[contains(text(),"More information about this job")]'));
                            var isDetailPage = await jobdetailspage.length;
                            if (isDetailPage) {
                                var descriptionElement = await driverjobdetails.findElement(By.xpath("//div[@class='iCIMS_JobContent']"));
                                var overview = await descriptionElement.getAttribute("outerHTML");

                                var urlElement = await driverjobdetails.findElement(By.xpath("//div[@class='iCIMS_JobContent']/div[@class='iCIMS_JobOptions']/div[1]/a[@title='Apply for this job online']"));
                                var url = await urlElement.getAttribute("href");
                                var desc = overview.split('More information about');
                                var text = desc[1].split('<div class="iCIMS_JobOptions">');
                                var description = text[0].replace("this job:\n</h2>", "").replace("<br> < br >", "<br>").replace("Overview:", "Overview: <br/>").replace("Responsibilities:", "Responsibilities:<br/>").replace("Qualifications:", "<b>Qualifications:</b>").replace('<h2 class="iCIMS_SubHeader iCIMS_SubHeader_Connect">', '');
                                job.JOB_APPLY_URL = url;
                                job.TEXT = HtmlEscape(description);
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
                    var e = await driver.findElements(By.xpath('//a[@target="_self"]/img[@alt="Next page of results"]'));
                    if (e.length == 1) {
                        var nextPage = await driver.findElement(By.xpath('//*[@target="_self"]/img[@alt="Next page of results"]'));
                        await nextPage.click();
                        loop = true;
                    }
                } catch (e) {
                }
            } while (loop);
        }
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
    description = description.replace(/&ensp;+/g, "");
    description = description.replace(/&mldr;+/g, "&hellip;");
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

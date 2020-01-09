var Promise = require('promise');
var package = global.createPackage();
var he = require('he');
var cleanHtml = require('clean-html');
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

        await driver.get('https://www5.recruitingcenter.net/Clients/CDGCAREERS/PublicJobs/controller.cfm');
        var loop;
        var searchElement = await driver.findElement(By.xpath('//*[@id="SearchJobs"]'));
        await searchElement.click();
        var atsJobCount = await driver.findElement(By.xpath('//*[@id="crs_jobsearchresults"]/*[contains(text(),"Found")]'));
        var atscount = await atsJobCount.getText();
        var record = atscount.split("Found");
        var atsJob = record[1].split("Employment");
        jobMaker.setatsJobCount(parseInt(atsJob[0].trim()));
        await driver.navigate().back();

        var categoryElement = await driver.findElement(By.xpath('//*[@id="SecondaryCat"]'));
        var optionArray = await categoryElement.findElements(By.tagName('option'));
        for (var i = 3; i <= optionArray.length; i++) {
            loop = false;
            var counter = 2;

            var option = await driver.findElement(By.xpath('//*[@id="SecondaryCat"]/option[' + i + ']'));
            var category = await option.getAttribute('text');
            await option.click();

            var submitElement = await driver.findElement(By.xpath('//*[@id="SearchJobs"]'));
            await submitElement.click();
            do {
                var jobContainer = await driver.findElements(By.xpath('//*[@id="crs_jobsearchresults"]/table/tbody/tr[' + counter + ']/td'));
                var isPresent = await jobContainer.length;
                if (isPresent) {
                    try {
                        var job = jobMaker.create();

                        var titleElement = await driver.findElement(By.xpath('//*[@id="crs_jobsearchresults"]/table/tbody/tr[' + counter + ']/td'));
                        job.JOB_TITLE = await titleElement.getText();
                        job.JOB_CATEGORY = category;

                        var urlElement = await driver.findElement(By.xpath('//*[@id="crs_jobsearchresults"]/table/tbody/tr[' + counter + ']/td/a'));
                        var url = await urlElement.getAttribute("href");
                        var id = "";
                        if (url) {
                            job.JOB_APPLY_URL = url;
                            var apply = url;
                            var applyurl = apply.split("Job_Id=");
                            var jobID = applyurl[1].split("&");
                            job.JDTID_UNIQUE_NUMBER = jobID[0];
                        }

                        await driverjobdetails.get(url);

                        var jobdetailspage = await driverjobdetails.findElements(By.xpath('//*[@id="crs_jobprofile"]/form/div[2]/table[2]/tbody/tr[2]/td'));
                        var isDetailPage = await jobdetailspage.length;
                        if (isDetailPage) {
                            var jobtypeElement = await driverjobdetails.findElements(By.xpath('//*[@id="crs_jobprofile"]/form/div[2]/table[1]/tbody/tr[2]/td[2]'));
                            var isJobType = await jobtypeElement.length;
                            if (isJobType) {
                                var type = await driverjobdetails.findElement(By.xpath('//*[@id="crs_jobprofile"]/form/div[2]/table[1]/tbody/tr[2]/td[2]')).getText();
                                job.JOB_TYPE = type;
                            }

                            var locationElement = await driverjobdetails.findElement(By.xpath('//*[@id="crs_jobprofile"]/form/div[2]/table[1]/tbody/tr[3]/td[2]'));
                            var location = await locationElement.getText();

                            if (location) {
                                var loc = location.split(",");
                                job.JOB_LOCATION_CITY = loc[0];
                                if (loc.length == 2) {
                                    var shortText1 = loc[1].trim();
                                    var shortText2 = '';
                                    if (shortText1.length == 2) {
                                        shortText2 = 'State';
                                    }
                                    else {
                                        shortText2 = 'Country';
                                    }

                                    if (shortText2 == 'State') {
                                        job.JOB_LOCATION_STATE = shortText1;
                                    }
                                    else {
                                        job.JOB_LOCATION_STATE = '';
                                    }

                                    if (shortText2 == 'Country') {
                                        job.JOB_LOCATION_COUNTRY = shortText1;
                                    }
                                    else {
                                        job.JOB_LOCATION_COUNTRY = '';
                                    }
                                }
                                else if (loc.length == 3) {
                                    var shortText1 = loc[2].trim();
                                    var shortText2 = '';
                                    if (shortText1.length == 2) {
                                        shortText2 = 'State';
                                    }
                                    else {
                                        shortText2 = 'Country';
                                    }

                                    if (shortText2 == 'State') {
                                        job.JOB_LOCATION_STATE = shortText1;
                                    }
                                    else {
                                        job.JOB_LOCATION_STATE = '';
                                    }

                                    if (shortText2 == 'Country') {
                                        job.JOB_LOCATION_COUNTRY = shortText1;
                                    }
                                    else {
                                        job.JOB_LOCATION_COUNTRY = '';
                                    }
                                }
                                if (job.JOB_LOCATION_COUNTRY.length == 0) {
                                    job.JOB_LOCATION_COUNTRY = 'US';
                                }
                            }                            

                            job.OTHER_CATEGORIEs = 'CDG';
                            job.JOB_SALARY_FROM = 'CDG';
                            var JobDescription = await driverjobdetails.findElement(By.xpath('//*[@id="crs_jobprofile"]/form/div[2]/table[2]/tbody/tr[2]/td'));
                            var desc = await JobDescription.getAttribute("outerHTML");
                            job.TEXT = HtmlEscape(desc);

                        }

                        jobMaker.successful.add(job, botScheduleID);
                        counter++;
                    } catch (e) {
                        jobMaker.failed.add(job.JDTID_UNIQUE_NUMBER, e.message);
                        counter++;
                    }
                }
            } while (isPresent);
            await driver.navigate().back();
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
    description = description.replace(/&#9;/g, '');
    description = description.replace(/^\s+|\s+$/g, '');
    description = description.replace(/\r?\n|\r/g, '');
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

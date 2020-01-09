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
        
        await driver.get('http://jobs.jobvite.com/align-tech/jobs?nl=1');

        var searchelement = await driver.findElement(By.xpath('/html/body/div/div/div/article/div/form/div[4]/button[1]'));
        await searchelement.click();

        var totalJobElement = await driver.findElement(By.xpath('/html/body/div/div/div/article/div/div/div'));
        var totalJobCount = await totalJobElement.getText();
        var record = totalJobCount.split("of");
        jobMaker.setatsJobCount(parseInt(record[1]));
        await driver.navigate().back();

        var categoryElement = await driver.findElement(By.xpath('//*[@id="jv-search-category"]'));
        var optionArray = await categoryElement.findElements(By.tagName('option'));

        for (var i = 2; i <= optionArray.length; i++) {
            var option = await driver.findElement(By.xpath('//Select[@id="jv-search-category"]/Option[' + i + ']'));
            var optionValue = await option.getAttribute('text');
            await option.click();

            var searchelement = await driver.findElement(By.xpath('/html/body/div/div/div/article/div/form/div[4]/button[1]'));
            await searchelement.click();
            do {
                loop = false;
                var counter = 1;
                do {
                    var jobContainer = await driver.findElements(By.xpath("//*[contains(@class,'jv-job-list jv-search-list')]/tbody/tr[" + counter + "]/td[1]/a"));
                    var isPresent = await jobContainer.length;
                    if (isPresent) {
                        try {
                            var job = jobMaker.create();
                            job.JOB_CATEGORY = optionValue;

                            var titleElement = await driver.findElement(By.xpath("//*[contains(@class,'jv-job-list jv-search-list')]/tbody/tr[" + counter + "]/td[1]/a"));
                            job.JOB_TITLE = await titleElement.getText();
                            var locationElement = await driver.findElement(By.xpath("/html/body/div/div/div/article/div/table/tbody/tr[" + counter + "]/td[2]"));
                            var location = await locationElement.getText();

                            if (location.indexOf("Locations") < 0) {
                                if (location) {
                                    var loc = location.split(",");
                                    if (loc.length >= 2) {
                                        job.JOB_LOCATION_CITY = loc[0];
                                        job.JOB_LOCATION_STATE = loc[1].trim();
                                    }
                                    else {
                                        job.JOB_LOCATION_CITY = location;
                                    }
                                }
                            }
                            var urlElement = await driver.findElement(By.xpath("//*[contains(@class,'jv-job-list jv-search-list')]/tbody/tr[" + counter + "]/td[1]/a"));

                            var url = await urlElement.getAttribute("href");
                            if (url) {
                                job.JOB_APPLY_URL = url + "/apply?nl=1";
                                var searchurl = url.split("/job/");
                                job.TRAVEL = searchurl[0] + "/search?nl=1";
                                job.SALARYTIME = url + "?nl=1";
                            }
                            await driverjobdetails.get(url);

                            var jobdetailspage = await driverjobdetails.findElements(By.xpath("/html/body/div[1]/div/div/article/div/div[2]"));
                            var isDetailPage = await jobdetailspage.length;
                            if (isDetailPage) {

                                var jobid = await driverjobdetails.findElement(By.xpath('/html/body/div[1]/div/div/article/div/p')).getText();
                                if (jobid) {
                                    var jobID = jobid.split("(");
                                    if (jobID[1]) {
                                        if (jobID[1] == ")") {
                                            var jobId = url.split("job/");
                                            job.JDTID_UNIQUE_NUMBER = jobId[1];
                                        } else {
                                            job.JDTID_UNIQUE_NUMBER = jobID[1].replace(")", "");
                                        }
                                    }
                                }
                                var locationElement = await driverjobdetails.findElement(By.xpath("/html/body/div[1]/div/div/article/div/p"));
                                var location = await locationElement.getAttribute("innerHTML");

                                if (job.JOB_LOCATION_CITY == "") {
                                    job.RELOCATION = "";
                                    if (location) {
                                        var locSplit = location.split('<span class="jv-inline-separator"></span>');
                                        for (var r = 2; r < locSplit.length; r++) {
                                            var loc = locSplit[r].trim();
                                            loc = loc.split(",");
                                            if (r == 2) {
                                                job.JOB_LOCATION_CITY = loc[0];
                                                job.JOB_LOCATION_STATE = loc[1].trim();
                                            } else if (r == locSplit.length - 1) {
                                                if (locSplit[r].indexOf("(") >= 1) {
                                                    var loc1 = locSplit[r];
                                                    loc1 = loc1.split("(");
                                                    job.RELOCATION += loc1[0].trim();
                                                } else {
                                                    job.RELOCATION += locSplit[r].trim();
                                                }
                                            }
                                            else {
                                                job.RELOCATION += locSplit[r].trim() + ";";
                                            }
                                        }                                        
                                    }
                                }
                                job.RELOCATION = job.RELOCATION.trim();
                                var categoryElement = await driverjobdetails.findElement(By.xpath("/html/body/div[1]/div/div/article/div/p"));
                                var category = await categoryElement.getAttribute("innerHTML");
                                if (category) {
                                    var value = category.split("<");
                                    job.JOB_CATEGORY = value[0].trim();
                                }
                                var jobDescriptionElement = await driverjobdetails.findElement(By.xpath("/html/body/div[1]/div/div/article/div/div[2]"));
                                var JobDescription = await jobDescriptionElement.getAttribute("outerHTML");

                                job.TEXT = HtmlEscape(JobDescription);
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
                    var nextContainer = await driver.findElements(By.className('jv-pagination-next'));
                    var next = nextContainer.length;
                    if (next) {
                        var nextLink = await driver.findElement(By.className('jv-pagination-next'));
                        await nextLink.click();
                        loop = true;
                    }
                } catch (e) {

                }
            } while (loop);
            await driver.navigate().back();
        }

        driver.quit();
        driverjobdetails.quit();
        snippet(configuration, jobMaker.atsJobCount, jobMaker.failedJobs.length, jobMaker, onsuccess, onfailure);
    } catch (e) {
        driver.quit();
        driverjobdetails.quit();
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

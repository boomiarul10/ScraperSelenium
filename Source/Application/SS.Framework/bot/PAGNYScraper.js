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

        await driver.get('https://careers-pagny.icims.com');

        await driver.switchTo().frame("icims_content_iframe");
        var oppoutunitiesElement = await driver.findElement(By.xpath('//*[@class="iCIMS_InfoMsg iCIMS_InfoMsg_JobSearch"]/div/div/a'));
        await oppoutunitiesElement.click();
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

        var loop;
        var pagenumber = 1;
        do {
            loop = false;
            var counter = 1;
            do {
                var jobContainer = await driver.findElements(By.xpath('//table[@class="iCIMS_JobsTable iCIMS_Table"]/tbody/tr[' + counter + ']'));
                var isPresent = await jobContainer.length;
                if (isPresent) {
                    try {
                        var job = jobMaker.create();

                        var titleElement = await driver.findElement(By.xpath('//table[@class="iCIMS_JobsTable iCIMS_Table"]/tbody/tr[' + counter + ']/td[1]/a'));
                        job.JOB_TITLE = await titleElement.getText();
                        var categoryElement = await driver.findElement(By.xpath('//table[@class="iCIMS_JobsTable iCIMS_Table"]/tbody/tr[' + counter + ']/td[2]'));
                        job.JOB_CATEGORY = await categoryElement.getText();

                        var url = await titleElement.getAttribute("href");
                        await driverjobdetails.get(url);

                        try {
                            await driverjobdetails.switchTo().frame("icims_content_iframe");
                        } catch (err) {
                            driver.sleep(2000);
                            await driverjobdetails.switchTo().frame("icims_content_iframe");
                        }
                        await driverjobdetails.wait(until.elementLocated(By.xpath("//div[@class='iCIMS_JobHeaderTable iCIMS_Table']")), 10000);

                        var jobIdElement = await driverjobdetails.findElement(By.xpath("//div[@class='iCIMS_JobHeaderTable iCIMS_Table']/div[1]/dl[1]/dd"));
                        job.JDTID_UNIQUE_NUMBER = await jobIdElement.getText();
                        var jobtypeElement = await driverjobdetails.findElement(By.xpath("//div[@class='iCIMS_JobHeaderTable iCIMS_Table']/div[2]/dl[1]/dd"));
                        job.JOB_TYPE = await jobtypeElement.getText();
                        var locationElement = await driverjobdetails.findElement(By.xpath("//div[@class='iCIMS_JobHeaderTable iCIMS_Table']/div[1]/dl[2]/dd"));
                        var location = await locationElement.getText();
                        var multipleLocationElement = await driverjobdetails.findElement(By.xpath("//div[@class='iCIMS_JobHeaderTable iCIMS_Table']/div[1]/dl[2]/dd"));
                        var multipleLocation = await multipleLocationElement.getAttribute("outerHTML");
                        job.JOB_SALARY = location + " ;";
                        if (location != null) {
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
                            else {
                                var multipleLoc = multipleLocation.split('<dd class="iCIMS_JobHeaderData">');
                                var mult = multipleLoc[1].split("<br>");
                                var salary = "";
                                for (var i = 0; i < mult.length; i++) {
                                    var locValue = mult[i].replace("</dd>", "");
                                    var len = mult.length - 1;
                                    if (i == len) {
                                        salary += locValue;
                                    }
                                    else {
                                        salary += locValue + ";";
                                    }
                                }
                                job.JOB_SALARY = salary;
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
                        var jobID = 0;
                        var title = "";
                        if (job.JDTID_UNIQUE_NUMBER) {
                            var id = job.JDTID_UNIQUE_NUMBER.split("-");
                            jobID = id[1];
                        }
                        if (job.JOB_TITLE) {
                            title = job.JOB_TITLE.replace(/ +/g, "-");
                        }

                        job.JOB_APPLY_URL = "https://careers-pagny.icims.com/jobs/" + jobID + "/" + title + "/login";

                        var contactElement = await driverjobdetails.findElement(By.xpath("//div[@class='iCIMS_JobHeaderTable iCIMS_Table']/div[3]/dl[1]/dd"));
                        job.JOB_CONTACT_COMPANY = await contactElement.getText();

                        var descriptionElement = await driverjobdetails.findElement(By.xpath("//div[@class='iCIMS_JobContent']"));
                        var overview = await descriptionElement.getAttribute("outerHTML");

                        var desc = overview.split('More information about');
                        var text = desc[1].split('<div class="iCIMS_JobOptions">');
                        var description = text[0].replace("this opportunity:\n</h2>", "").replace('<h3 class="iCIMS_InfoMsg iCIMS_InfoField_Job">\nOverview:\n</h3>', "");

                        job.TEXT = HtmlEscape(description);

                        jobMaker.successful.add(job, botScheduleID);
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

var Promise = require('promise');
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

        //var driver = selenium.createDriverWithCapabilties();
        //var driverjobdetails = selenium.createDriverWithCapabilties();

        await driver.get('https://careers-patterson.icims.com/jobs/intro');

        await driver.switchTo().frame("icims_content_iframe");
        var searchElement = await driver.findElement(By.xpath('//input[@id="jsb_form_submit_i"]'));
        await searchElement.click();
        var pageElement = await driver.findElements(By.xpath('//*[@id="iCIMS_Paginator"]/option'));
        var count = pageElement.length;
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
                        var run = "default";

                        var titleElement = await driver.findElement(By.xpath('//table[@class="iCIMS_JobsTable iCIMS_Table"]/tbody/tr[' + counter + ']/td[2]/a'));
                        var title = await titleElement.getText();

                        job.JOB_TITLE = title;

                        var url = await titleElement.getAttribute("href");

                        var urlData = url.split("/job?").shift();
                        urlData = urlData + "/login";

                        job.JOB_APPLY_URL = urlData;

                        await driverjobdetails.get(url);
                        await driverjobdetails.sleep(2000);
                        await driverjobdetails.switchTo().frame("icims_content_iframe");

                        while (run != "completed") {
                            try {

                                var jobIdElement = await driverjobdetails.findElement(By.xpath("//div[@class='iCIMS_ShadowContainer iCIMS_JobHeader']/div[@class='iCIMS_JobHeaderTable iCIMS_Table']/div/dl/dd"));
                                var jobid = await jobIdElement.getText();
                                if (jobid) {
                                    job.JDTID_UNIQUE_NUMBER = jobid.trim();
                                }

                                var otherLocationElement = await driverjobdetails.findElement(By.xpath("//div[@class='iCIMS_ShadowContainer iCIMS_JobHeader']/div[@class='iCIMS_JobHeaderTable iCIMS_Table']/div[2]/dl/dd"));
                                var otherLocation = await otherLocationElement.getText();
                                otherLocation = otherLocation.replace(/\n/g, ';').replace(/\"/g, '');
                                if (otherLocation) {
                                    job.TRAVEL = otherLocation.trim();
                                }

                                var categoryElement = await driverjobdetails.findElement(By.xpath("//div[@class='iCIMS_JobHeaderTable iCIMS_Table']/div[2]/dl[2]/dd"));
                                var categoryValue = await categoryElement.getText();
                                if (categoryValue) {
                                    job.JOB_CATEGORY = categoryValue.trim();
                                }

                                var jobCompanyElement = await driverjobdetails.findElement(By.xpath("//div[@class='iCIMS_JobHeaderTable iCIMS_Table']/div[3]/dl[1]/dd"));
                                var contactCompany = await jobCompanyElement.getText();
                                if (contactCompany) {
                                    job.JOB_CONTACT_COMPANY = contactCompany.trim();
                                }


                                if (job.JOB_CATEGORY) {
                                    job.OTHER_CATEGORIES = (job.JOB_CATEGORY == "Sales" && job.JOB_CONTACT_COMPANY == "Patterson Dental Supply, Inc.") ? "Dental Sales" : ((job.JOB_CATEGORY == "Sales" && job.JOB_CONTACT_COMPANY == "Patterson Veterinary Supply, Inc.") ? "Veterinary Sales" : "");
                                }

                                job.JOB_LOCATION_STATE = (job.JOB_LOCATION_COUNTRY == job.JOB_LOCATION_STATE) ? "" : job.JOB_LOCATION_STATE


                                var jobDescElement1 = await driverjobdetails.findElement(By.xpath('//div/h2[@class="iCIMS_SubHeader iCIMS_SubHeader_Job"]'));
                                var jobDesc1 = await jobDescElement1.getAttribute("outerHTML");

                                var jobDescElement2 = await driverjobdetails.findElement(By.xpath('//*[@class="iCIMS_JobOptions"]'));
                                var jobDesc2 = await jobDescElement2.getAttribute("outerHTML");

                                var jobDescElement = await driverjobdetails.findElement(By.xpath('//*[@class="iCIMS_JobContent"]'));
                                var jobDesc = await jobDescElement.getAttribute("outerHTML");

                                var jobDescription = jobDesc.split(jobDesc1)[1];
                                jobDescription = jobDescription.split('<div class="iCIMS_JobOptions">')[0];


                                var descriptionRemovedTag1;
                                var optionTag = {
                                    'add-remove-tags': ['div', 'br']
                                };

                                cleanHtml.clean(jobDescription, optionTag, function (html) {
                                    jobDescription = html;
                                });
                                jobDescription = jobDescription.replace("Why join Patterson?", "Why join Patterson?<br>");
                                job.TEXT = HtmlEscape(jobDescription);

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
                var e = await driver.findElements(By.xpath('//a[@target="_self"]/img[@alt="Next page of results"]'));
                if (e.length == 1) {
                    var nextPage = await driver.findElement(By.xpath('//a[@target="_self"]/img[@alt="Next page of results"]'));
                    await nextPage.click();
                    loop = true;
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
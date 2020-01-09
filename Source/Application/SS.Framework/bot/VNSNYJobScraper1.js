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

        await driver.get('https://careers-vnsny.icims.com/jobs/intro');

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
        jobMaker.setatsJobCount(parseInt(jobsCount));

        var HomeElement = await driver.findElement(By.xpath('//*[@class="iCIMS_Navigation"]//a'));
        await HomeElement.click();

        var categoryElement = await driver.findElement(By.xpath('//select[@id="jsb_f_position_s"]'));
        var optionArray = await categoryElement.findElements(By.tagName('option'));

        for (var i = 2; i <= optionArray.length; i++) {
            var option = await driver.findElement(By.xpath('//*[@id="jsb_f_position_s"]/option[' + i + ']'));
            var category = await option.getAttribute('text');
            await option.click();
            var submitElement = await driver.findElement(By.xpath('//input[@id="jsb_form_submit_i"]'));
            await submitElement.click();


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

                            var titleElement = await driver.findElement(By.xpath('//table[@class="iCIMS_JobsTable iCIMS_Table"]/tbody/tr[' + counter + ']/td[2]/a'));
                            var title = await titleElement.getText();
                            var jobIdElement = await driver.findElement(By.xpath('//table[@class="iCIMS_JobsTable iCIMS_Table"]/tbody/tr[' + counter + ']/td[1]'));
                            var jobid = await jobIdElement.getText();
                            var locationElement = await driver.findElement(By.xpath('//table[@class="iCIMS_JobsTable iCIMS_Table"]/tbody/tr[' + counter + ']/td[3]'));
                            var location = await locationElement.getText();
                            var cityElement = await driver.findElement(By.xpath('//table[@class="iCIMS_JobsTable iCIMS_Table"]/tbody/tr[' + counter + ']/td[4]'));
                            var city = await cityElement.getText();

                            var url = await titleElement.getAttribute("href");
                            await driverjobdetails.get(url);
                            await driverjobdetails.switchTo().frame("icims_content_iframe");

                            await driverjobdetails.wait(until.elementLocated(By.xpath("//div[@class='iCIMS_JobHeaderTable iCIMS_Table']")), 10000);

                            var applyurlElement = await driverjobdetails.findElement(By.xpath("//div[@class='iCIMS_JobContent']/div[@class='iCIMS_JobOptions']/div[1]/a[@title='Apply for this job online']"));
                            var applyurl = await applyurlElement.getAttribute("href");

                            var descriptionElement = await driverjobdetails.findElement(By.xpath("//div[@class='iCIMS_JobContent']/div[2]"));
                            var description = await descriptionElement.getAttribute("outerHTML");
                            var qualificationElement = await driverjobdetails.findElements(By.xpath("//div[@class='iCIMS_JobContent']/div[3][@class='iCIMS_InfoMsg iCIMS_InfoMsg_Job']"));
                            if (qualificationElement.length == 1) {
                                var qualificationElement = await driverjobdetails.findElement(By.xpath("//div[@class='iCIMS_JobContent']/div[3]"));
                                var qualification = await qualificationElement.getAttribute("outerHTML");
                                var descriptionText = '<h3 class="iCIMS_InfoMsg iCIMS_InfoField_Job">Overview:</h3>' + description + '<h3 class="iCIMS_InfoMsg iCIMS_InfoField_Job">Responsibilities and Qualifications:</h3>' + qualification;
                            } else {
                                var descriptionText = '<h3 class="iCIMS_InfoMsg iCIMS_InfoField_Job">Overview:</h3>' + description;
                            }


                            job.JOB_TITLE = title.trim();
                            job.JDTID_UNIQUE_NUMBER = jobid.replace('Requisition ID:', '').trim();
                            job.JOB_CATEGORY = category;

                            job.TEXT = HtmlEscape(descriptionText);

                            job.JOB_APPLY_URL = applyurl;
                            job.JOB_LOCATION_CITY = city;
                            if (location != null) {
                                location = location.trim();
                                location = location.replace('Job Locations:', '');
                                var loc = location.split("-");
                                job.JOB_LOCATION_COUNTRY = loc[0].replace('NY', '');
                                job.JOB_LOCATION_STATE = loc[1].replace('US', '');
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

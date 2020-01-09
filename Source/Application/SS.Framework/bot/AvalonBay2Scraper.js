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
        //var driver = selenium.createDriver("chrome");
        //var driverjobdetails = selenium.createDriver("chrome");

        await driver.get('https://jobs-avalonbay.icims.com/jobs/intro?hashed=0');
        await driver.sleep(2000);

        await driver.switchTo().frame("icims_content_iframe");
        var searchElement = await driver.findElement(By.xpath('//*[@id="jsb_form_submit_i"]'));
        await searchElement.click();
        await driver.sleep(2000);

        var lastLink = await driver.findElement(By.xpath('//*[@class="iCIMS_Paginator_Bottom"]/div/a[position() = last()]'));
        await lastLink.click();
        await driver.sleep(2000);

        var lastPageIndex = await driver.findElement(By.xpath('//*[@class="iCIMS_PagingBatch "]/a[position() = last()]/span[position() = last()]'));
        var indexCount = await lastPageIndex.getText();
        indexCount = indexCount.replace("of", "").trim();
        indexCount = indexCount - 1;

        var recordCount = await driver.findElements(By.xpath('//*[@class="container-fluid iCIMS_JobsTable"]/div'));
        var records = recordCount.length;
        var jobsCount = (((indexCount) * 25) + records);

        jobMaker.setatsJobCount(parseInt(jobsCount));

        var HomeElement = await driver.findElement(By.xpath('//*[@class="iCIMS_Navigation"]//a'));
        await HomeElement.click();
        await driver.sleep(2000);

        var advancedSearchElement = await driver.findElement(By.xpath('//*[@id="advancedSearchText"]'));
        await advancedSearchElement.click();
        await driver.sleep(2000);

        var categoryElement = await driver.findElement(By.xpath('//select[@id="jsb_f_position_s"]'));
        var optionArray = await categoryElement.findElements(By.tagName('option'));

        for (var i = 2; i <= optionArray.length; i++) {

            var option = await driver.findElement(By.xpath('//*[@id="jsb_f_position_s"]/option[' + i + ']'));
            var category = await option.getAttribute('text');
            await option.click();
            var submitElement = await driver.findElement(By.xpath('//input[@id="jsb_form_submit_i"]'));
            await submitElement.click();
            await driver.sleep(2000);


            var loop;
            var pagenumber = 1;
            do {
                loop = false;
                var counter = 1;
                do {
                    var jobContainer = await driver.findElements(By.xpath('//div[@class="container-fluid iCIMS_JobsTable"]/div[' + counter + ']'));
                    var isPresent = await jobContainer.length;
                    if (isPresent) {
                        try {
                            var job = jobMaker.create();


                            var jobIdElement = await driver.findElement(By.xpath('//div[@class="container-fluid iCIMS_JobsTable"]/div[' + counter + ']/div[5]/dl[1]/dd'));
                            job.JDTID_UNIQUE_NUMBER = await jobIdElement.getText();

                            if (job.JDTID_UNIQUE_NUMBER) {

                                var titleElement = await driver.findElement(By.xpath('//div[@class="container-fluid iCIMS_JobsTable"]/div[' + counter + ']/div[3]/a/dl/dd'));
                                var title = await titleElement.getText();

                                var locationElement = await driver.findElement(By.xpath('//div[@class="container-fluid iCIMS_JobsTable"]/div[' + counter + ']/div[5]/dl[2]/dd'));
                                var location = await locationElement.getText();

                                var urlElement = await driver.findElement(By.xpath('//div[@class="container-fluid iCIMS_JobsTable"]/div[' + counter + ']/div[3]/a'));
                                var url = await urlElement.getAttribute("href");
                                await driverjobdetails.get(url);
                                await driver.sleep(8000);
                                await driverjobdetails.switchTo().frame("icims_content_iframe");

                                await driverjobdetails.wait(until.elementLocated(By.xpath('//div[@class="iCIMS_JobContent"]/div[2][@class="iCIMS_InfoMsg iCIMS_InfoMsg_Job"]')), 10000);

                                var applyurlElement = await driverjobdetails.findElement(By.xpath('//*[@id="jobOptionsMobile"]/a[1]'));
                                var applyurl = await applyurlElement.getAttribute("href");

                                var jobtypeElement = await driverjobdetails.findElement(By.xpath('/html/body/div[2]/div[2]/div[1]/div[1]/div/div[4]/dl[5]/dd'));
                                var jobtype = await jobtypeElement.getText();

                                var jobcontactcompanyElement = await driverjobdetails.findElement(By.xpath('/html/body/div[2]/div[2]/div[1]/div[1]/div/div[4]/dl[7]/dd'));
                                var contactcompany = await jobcontactcompanyElement.getText();


                                var descriptionElement = await driverjobdetails.findElements(By.xpath('//div[@class="iCIMS_JobContent"]/div[2][@class="iCIMS_InfoMsg iCIMS_InfoMsg_Job"]'));
                                if (descriptionElement.length == 1) {
                                    var descriptionElement = await driverjobdetails.findElement(By.xpath('//div[@class="iCIMS_JobContent"]/div[2][@class="iCIMS_InfoMsg iCIMS_InfoMsg_Job"]'));
                                    var description = await descriptionElement.getAttribute("outerHTML");
                                    var descriptionText = '<h2 class="iCIMS_InfoMsg iCIMS_InfoField_Job">Overview</h2>' + description;


                                    var responsibilitiesElement = await driverjobdetails.findElements(By.xpath('//div[@class="iCIMS_JobContent"]/div[3][@class="iCIMS_InfoMsg iCIMS_InfoMsg_Job"]'));
                                    if (responsibilitiesElement.length == 1) {
                                        var responsibilitiesElement = await driverjobdetails.findElement(By.xpath('//div[@class="iCIMS_JobContent"]/div[3][@class="iCIMS_InfoMsg iCIMS_InfoMsg_Job"]'));
                                        var responsibilities = await responsibilitiesElement.getAttribute("outerHTML");
                                        var descriptionText = descriptionText + '<h2 class="iCIMS_InfoMsg iCIMS_InfoField_Job">Responsibilities</h2>' + responsibilities;
                                    }


                                    var qualificationElement = await driverjobdetails.findElements(By.xpath('//div[@class="iCIMS_JobContent"]/div[4][@class="iCIMS_InfoMsg iCIMS_InfoMsg_Job"]'));
                                    if (qualificationElement.length == 1) {
                                        var qualificationElement = await driverjobdetails.findElement(By.xpath('//div[@class="iCIMS_JobContent"]/div[4][@class="iCIMS_InfoMsg iCIMS_InfoMsg_Job"]'));
                                        var qualification = await qualificationElement.getAttribute("outerHTML");
                                        var descriptionText = descriptionText + '<h2 class="iCIMS_InfoMsg iCIMS_InfoField_Job">Qualifications</h2>' + qualification;
                                    }
                                }


                                job.JOB_TITLE = title.trim();
                                //job.JDTID_UNIQUE_NUMBER = jobid;
                                job.JOB_CATEGORY = category;
                                job.JOB_CONTACT_COMPANY = contactcompany;

                                job.JOB_APPLY_URL = applyurl;
                                job.JOB_TYPE = jobtype;

                                if (location != null) {
                                    location = location.trim();
                                    var loc = location.split("-");
                                    job.JOB_LOCATION_COUNTRY = loc[0];
                                    job.JOB_LOCATION_STATE = loc[1];
                                    job.JOB_LOCATION_CITY = loc[2];
                                }

                                descriptionText = "<b>Job Type:</b> " + jobtype + "<br/>" + "<b>State:</b>:" + job.JOB_LOCATION_STATE + "  " + "<b>City:</b>" + job.JOB_LOCATION_CITY + "<br/>" + "<b>Brand:</b>" + contactcompany + "<br/><br/>" + descriptionText + '<div class="iCIMS_JobOptions"> <h2 class="iCIMS_SubHeader iCIMS_SubHeader_Job">';
                                descriptionText = descriptionText.replace('Additional responsibilities will include:', '<b>Additional responsibilities will include:</b>');
                                job.TEXT = HtmlEscape(descriptionText);
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
                    var e = await driver.findElements(By.xpath('/html/body/div[2]/div[7]/div/a[3]/span[2]'));
                    if (e.length == 1) {
                        var nextPage = await driver.findElement(By.xpath('/html/body/div[2]/div[7]/div/a[3]/span[2]'));
                        await nextPage.click();
                        await driver.sleep(2000);
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
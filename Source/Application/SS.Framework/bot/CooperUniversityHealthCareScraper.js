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

        await driver.get('https://careers-cooperhealth.icims.com/jobs/search');


        await driver.switchTo().frame("icims_content_iframe");
        var lastLink = await driver.findElement(By.xpath('//*[@class="iCIMS_Paginator_Bottom"]/div/a[position() = last()]'));
        await lastLink.click();

        var lastPageIndex = await driver.findElement(By.xpath('//*[@class="iCIMS_PagingBatch "]/a[position() = last()]/span[position() = last()]'));
        var indexCount = await lastPageIndex.getText();
        indexCount = indexCount.replace("of", "").trim();

        var recordCount = await driver.findElements(By.xpath('//*[@class="container-fluid iCIMS_JobsTable"]/div'));
        var records = recordCount.length;
        var jobsCount = (((indexCount - 1) * 10) + records);

        jobMaker.setatsJobCount(parseInt(jobsCount));

        var firstLink = await driver.findElement(By.xpath('//*[@class="iCIMS_Paginator_Bottom"]/div/a[position() = 1]'));
        await firstLink.click();

        var loop;
        var pagenumber = 1;
        do {
            loop = false;
            var counter = 1;
            do {
                var jobContainer = await driver.findElements(By.xpath('//div[@class="container-fluid iCIMS_JobsTable"]/div[@class="row"][' + counter + ']'));
                var isPresent = await jobContainer.length;
                if (isPresent) {
                    try {
                        var job = jobMaker.create();
                        var run = "default";

                        var titleElement = await driver.findElement(By.xpath('//div[@class="container-fluid iCIMS_JobsTable"]/div[@class="row"][' + counter + ']/div[3]/a'));
                        job.JOB_TITLE = await titleElement.getText();
                        if (job.JOB_TITLE) {
                            job.JOB_TITLE = job.JOB_TITLE.replace("Job Title", "");
                            job.JOB_TITLE = job.JOB_TITLE.trim();
                        }

                        var url = await titleElement.getAttribute("href");

                        var urlData = url.split("/job?").shift();
                        urlData = urlData + "/login";

                        job.JOB_APPLY_URL = urlData;

                        await driverjobdetails.get(url);
                        await driverjobdetails.sleep(2000);
                        await driverjobdetails.switchTo().frame("icims_content_iframe");

                        while (run != "completed") {
                            try {

                                var jobIdElement = await driverjobdetails.findElement(By.xpath("//div[@class='container-fluid iCIMS_JobsTable']/div[@class='row']/div[4]/dl[contains(.,'Job ID')]"));
                                var jobid = await jobIdElement.getText();
                                if (jobid) {
                                    job.JDTID_UNIQUE_NUMBER = jobid.replace('Job ID', '').trim();
                                }

                                var otherLocationElement = await driverjobdetails.findElement(By.xpath("//div[@class='container-fluid iCIMS_JobsTable']/div[@class='row']/div[2]/dl/dd"));
                                var otherLocation = await otherLocationElement.getText();
                                otherLocation = otherLocation.replace(/\n/g, ';').replace(/\"/g, '');
                                if (otherLocation) {
                                    job.TRAVEL = otherLocation.trim();
                                }

                                var categoryElement = await driverjobdetails.findElement(By.xpath("//div[@class='container-fluid iCIMS_JobsTable']/div[@class='row']/div[4]/dl[contains(.,'Category')]"));
                                var categoryValue = await categoryElement.getText();
                                if (categoryValue) {
                                    job.JOB_CATEGORY = categoryValue.replace('Category', '').trim();
                                }

                                var shiftElement = await driverjobdetails.findElement(By.xpath("//div[@class='container-fluid iCIMS_JobsTable']/div[@class='row']/div[4]/dl[contains(.,'Shift')]"));
                                var shift = await shiftElement.getText();
                                job.JOB_STATUS = shift.replace('Shift', '').trim();

                                var typeElement = await driverjobdetails.findElement(By.xpath("//div[@class='container-fluid iCIMS_JobsTable']/div[@class='row']/div[4]/dl[contains(.,'Type')]"));
                                var type = await typeElement.getText();
                                job.JOB_TYPE = type.replace('Type', '').trim();

                                var departmentElement = await driverjobdetails.findElement(By.xpath("//div[@class='container-fluid iCIMS_JobsTable']/div[@class='row']/div[4]/dl[contains(.,'Department Name')]"));
                                var department = await departmentElement.getText();
                                job.JOB_INDUSTRY = department.replace('Department Name', '').trim();

                                if (otherLocation != null) {
                                    otherLocation = otherLocation.trim();
                                    var loc = otherLocation.split("-");
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
                                }
                                var descriptionElement = await driverjobdetails.findElement(By.xpath("//div[@class='iCIMS_JobContent']/div[2]"));
                                var description = await descriptionElement.getAttribute("outerHTML");
                                var qualificationElement = await driverjobdetails.findElements(By.xpath("//div[@class='iCIMS_JobContent']/div[3][@class='iCIMS_InfoMsg iCIMS_InfoMsg_Job']"));
                                if (qualificationElement.length == 1) {
                                    var qualificationElement = await driverjobdetails.findElement(By.xpath("//div[@class='iCIMS_JobContent']/div[3]"));
                                    var qualification = await qualificationElement.getAttribute("outerHTML");
                                    var descriptionText = '<h2 class="iCIMS_SubHeader iCIMS_SubHeader_Job">More information about this job:</h2><h3 class="iCIMS_InfoMsg iCIMS_InfoField_Job"><br>Short Description:</h3>' + description + '<h3 class="iCIMS_InfoMsg iCIMS_InfoField_Job">Special Requirements:</h3>' + qualification;
                                } else {
                                    var descriptionText = '<h2 class="iCIMS_SubHeader iCIMS_SubHeader_Job">More information about this job:</h2><h3 class="iCIMS_InfoMsg iCIMS_InfoField_Job"><br>Special Requirements:</h3>' + description;
                                }
                                var optionsTag = {
                                    'add-remove-tags': ['tr', 'td', 'th', 'tbody', 'table']
                                };
                                var jobDescription = "";
                                cleanHtml.clean(descriptionText, optionsTag, function (html) {
                                    jobDescription = html;
                                });
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
                var e = await driver.findElements(By.xpath('//a[@target="_self"]/span[@title="Next page of results"]'));
                if (e.length == 1) {
                    var nextPage = await driver.findElement(By.xpath('//a[@target="_self"]/span[@title="Next page of results"]'));
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

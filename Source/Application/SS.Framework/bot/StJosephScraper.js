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
        //var driver = selenium.createDriver("chrome");
        //var driverjobdetails = selenium.createDriver("chrome");

        var driver = selenium.createDriverWithCapabilties();
        var driverjobdetails = selenium.createDriverWithCapabilties();
        await driver.manage().window().maximize();
        await driverjobdetails.manage().window().maximize();

        await driver.get('https://careers-sjhmc.icims.com/jobs/search');


        await driver.switchTo().frame("icims_content_iframe");
        var lastLink = await driver.findElement(By.xpath('//*[@class="iCIMS_Paginator_Bottom"]/div/a[position()=last()]'));
        await lastLink.click();

        var lastPageIndex = await driver.findElement(By.xpath('//*[@class="iCIMS_PagingBatch "]/a[position()=last()]/span[position()=last()]'));
        var indexCount = await lastPageIndex.getText();
        indexCount = indexCount.replace("of", "").trim();

        var recordCount = await driver.findElements(By.xpath('//*[@class="container-fluid iCIMS_JobsTable"]/div'));
        var records = recordCount.length;
        var jobsCount = (((indexCount - 1) * 20) + records);

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

                        var titleElement = await driver.findElement(By.xpath('//div[@class="container-fluid iCIMS_JobsTable"]/div[@class="row"][' + counter + ']/div[1]/a'));
                        job.JOB_TITLE = await titleElement.getText();
                        if (job.JOB_TITLE) {
                            job.JOB_TITLE = job.JOB_TITLE.replace("Requisition Title", "");
                            job.JOB_TITLE = job.JOB_TITLE.trim();
                        }

                        var url = await titleElement.getAttribute("href");

                        var urlData = url.split("/job?").shift();
                        urlData = urlData + "/login";

                        job.JOB_APPLY_URL = urlData;
                        var statusElement = await driver.findElement(By.xpath('//div[@class="container-fluid iCIMS_JobsTable"]/div[@class="row"][' + counter + ']/div[3]/dl[contains(.,"Hours")]'));
                        var status = await statusElement.getText();
                        job.JOB_STATUS = status.replace('Hours', '').trim();

                        var otherLocationElement = await driver.findElement(By.xpath('//div[@class="container-fluid iCIMS_JobsTable"]/div[@class="row"][' + counter + ']/div[3]/dl[contains(.,"Preferred Location")]'));
                        var otherLocation = await otherLocationElement.getText();
                        otherLocation = otherLocation.replace(/\n/g, ';').replace(/\"/g, '').replace('Preferred Location', '');
                        await driverjobdetails.get(url);
                        await driverjobdetails.sleep(2000);
                        await driverjobdetails.switchTo().frame("icims_content_iframe");

                        while (run != "completed") {
                            try {

                                var jobIdElement = await driverjobdetails.findElement(By.xpath("//div[@class='container-fluid iCIMS_JobsTable']/div[@class='row']/div[2]/dl[contains(.,'Requisition ID')]"));
                                var jobid = await jobIdElement.getText();
                                if (jobid) {
                                    job.JDTID_UNIQUE_NUMBER = jobid.replace('Requisition ID', '').trim();
                                }

                                if (otherLocation != null) {
                                    var location = otherLocation;
                                    var loc = location.split(",");
                                    if (loc.length == 3) {
                                        job.JOB_LOCATION_COUNTRY = loc[0];
                                        job.JOB_LOCATION_STATE = loc[1];
                                        job.JOB_LOCATION_CITY = loc[2];
                                    }
                                    else if (loc.length == 2) {
                                        job.JOB_LOCATION_CITY = loc[0];
                                        job.JOB_LOCATION_STATE = loc[1];
                                    }
                                    else if (loc.length == 1) {
                                        job.JOB_LOCATION_CITY = loc[0];
                                    }
                                    else {
                                        var test = 1;
                                    }
                                }
                                var categoryElementcount = await (driverjobdetails.findElements(By.xpath("//div[@class='container-fluid iCIMS_JobsTable']/div[@class='row']/div[2]/dl[contains(.,'Category')]")));
                                if (categoryElementcount.length > 0) {
                                    var categoryElement = await driverjobdetails.findElement(By.xpath("//div[@class='container-fluid iCIMS_JobsTable']/div[@class='row']/div[2]/dl[contains(.,'Category')]"));
                                    var categoryValue = await categoryElement.getText();
                                    if (categoryValue) {
                                        job.JOB_CATEGORY = categoryValue.replace('Category', '').trim();
                                    }
                                }
                                var shiftElementcount = await (driverjobdetails.findElements(By.xpath("//div[@class='container-fluid iCIMS_JobsTable']/div[@class='row']/div[2]/dl[contains(.,'Shift')]")));
                                if (shiftElementcount.length > 0) {
                                    var shiftElement = await driverjobdetails.findElement(By.xpath("//div[@class='container-fluid iCIMS_JobsTable']/div[@class='row']/div[2]/dl[contains(.,'Shift')]"));
                                    var shiftValue = await shiftElement.getText();
                                    if (shiftValue) {
                                        job.JOB_INDUSTRY = shiftValue.replace('Shift', '').trim();
                                    }
                                }
                                var shiftHourscount = await (driverjobdetails.findElements(By.xpath("//div[@class='container-fluid iCIMS_JobsTable']/div[@class='row']/div[2]/dl[contains(.,'Shift Hours AM/PM')]")));
                                if (shiftHourscount.length > 0) {
                                    var shiftHoursElement = await driverjobdetails.findElement(By.xpath("//div[@class='container-fluid iCIMS_JobsTable']/div[@class='row']/div[2]/dl[contains(.,'Shift Hours AM/PM')]"));
                                    var shiftHoursValue = await shiftHoursElement.getText();
                                    if (shiftHoursValue) {
                                        job.SALARYTIME = shiftHoursValue.replace('Shift Hours AM/PM', '').trim();
                                    }
                                }
                                var travelElementcount = await (driverjobdetails.findElements(By.xpath("//div[@class='container-fluid iCIMS_JobsTable']/div[@class='row']/div[2]/dl[contains(.,'Department')]")));

                                if (travelElementcount.length > 0) {
                                    var travelElement = await driverjobdetails.findElement(By.xpath("//div[@class='container-fluid iCIMS_JobsTable']/div[@class='row']/div[2]/dl[contains(.,'Department')]"));
                                    var travelValue = await travelElement.getText();
                                    if (travelValue) {
                                        job.TRAVEL = travelValue.replace('Department', '').trim();
                                    }
                                }
                                var descriptionElement = await driverjobdetails.findElement(By.xpath("//div[@class='iCIMS_JobContent']"));
                                var overview = await descriptionElement.getAttribute("outerHTML");
                                var descriptionElementcount = await (driverjobdetails.findElements(By.xpath("//div[@class='iCIMS_JobContent']/div[2]")));
                                if (descriptionElementcount.length > 0) {
                                    var descriptionElement = await driverjobdetails.findElement(By.xpath("//div[@class='iCIMS_JobContent']/div[2]"));
                                    var description = await descriptionElement.getAttribute("outerHTML");
                                }
                                var responsibiltyElementcount = await (driverjobdetails.findElements(By.xpath("//div[@class='iCIMS_JobContent']/div[3]")));
                                if (responsibiltyElementcount.length > 0) {
                                    var responsibiltyElement = await driverjobdetails.findElement(By.xpath("//div[@class='iCIMS_JobContent']/div[3]"));
                                    var responsibilty = await responsibiltyElement.getAttribute("outerHTML");
                                }
                                var qualificationElementcount = await (driverjobdetails.findElements(By.xpath("//div[@class='iCIMS_JobContent']/div[4]/div")));
                                if (qualificationElementcount.length > 0) {
                                    var qualificationElement = await driverjobdetails.findElement(By.xpath("//div[@class='iCIMS_JobContent']/div[4]/div"));
                                    var qualification = await qualificationElement.getAttribute("innerHTML");
                                }
                                var descriptionText = "";
                                if (description != "" && responsibilty != "" && qualification != "") {
                                    descriptionText = '<h3 class="iCIMS_InfoMsg iCIMS_InfoField_Job">Overview</h3>' + description + '<h3 class="iCIMS_InfoMsg iCIMS_InfoField_Job">Responsibilities</h3>' + responsibilty + '<h3 class="iCIMS_InfoMsg iCIMS_InfoField_Job">Qualifications</h3>' + qualification;
                                }
                                else if (description != "" && qualification != "") {
                                    descriptionText = '<h3 class="iCIMS_InfoMsg iCIMS_InfoField_Job">Overview</h3>' + description + '<h3 class="iCIMS_InfoMsg iCIMS_InfoField_Job">Qualifications</h3>' + qualification;
                                }
                                else if (description != "" && responsibilty != "") {
                                    descriptionText = '<h3 class="iCIMS_InfoMsg iCIMS_InfoField_Job">Overview</h3>' + description + '<h3 class="iCIMS_InfoMsg iCIMS_InfoField_Job">Responsibilities</h3>' + responsibilty;
                                }
                                else {
                                    descriptionText = '<h3 class="iCIMS_InfoMsg iCIMS_InfoField_Job">Overview</h3>' + description;
                                }
                                job.TEXT = HtmlEscape(descriptionText);
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

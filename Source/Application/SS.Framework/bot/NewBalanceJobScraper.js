var Promise = require('promise');
var package = global.createPackage();
var he = require('he');
var service = package.service;
var cleanHtml = require('clean-html');
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
        //var driver = selenium.createDriver(configuration.configuration.execBotConfig.browsertype.toLowerCase());
        //var driverjobdetails = selenium.createDriver(configuration.configuration.execBotConfig.browsertype.toLowerCase());
        var driver = selenium.createDriverWithCapabilties();
        var driverjobdetails = selenium.createDriverWithCapabilties();

        await driver.get('https://jobs-newbalance.icims.com/jobs/intro?hashed=124490996');
        await driver.sleep(3000);
        await driver.switchTo().frame("icims_content_iframe");
        var searchElement = await driver.findElement(By.xpath('//*[@id="jsb_form_submit_i"]'));
        await searchElement.click();

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

                        var dateElement = await driver.findElement(By.xpath('//div[@class="container-fluid iCIMS_JobsTable"]/div[@class="row"][' + counter + ']/div[2]/dl'));
                        job.ASSIGNMENT_START_DATE = await dateElement.getAttribute("title");

                        var titleElement = await driver.findElement(By.xpath('//div[@class="container-fluid iCIMS_JobsTable"]/div[@class="row"][' + counter + ']/div[3]/a'));
                        job.JOB_TITLE = await titleElement.getText();
                        if (job.JOB_TITLE) {
                            job.JOB_TITLE = job.JOB_TITLE.replace("Job Title", "");
                            job.JOB_TITLE = job.JOB_TITLE.trim();
                        }

                        job.JOB_APPLY_URL = await titleElement.getAttribute("href");

                        await driverjobdetails.get(job.JOB_APPLY_URL);
                        await driverjobdetails.sleep(2000);
                        await driverjobdetails.switchTo().frame("icims_content_iframe");

                        while (run != "completed") {
                            try {

                                var jobIdElement = await driverjobdetails.findElement(By.xpath("//div[@class='container-fluid iCIMS_JobsTable']/div[@class='row']/div[2]/dl[1]/dd"));
                                job.JDTID_UNIQUE_NUMBER = await jobIdElement.getText();
                                if (job.JDTID_UNIQUE_NUMBER) {
                                    job.JDTID_UNIQUE_NUMBER = job.JDTID_UNIQUE_NUMBER.trim();
                                }

                                var categoryElement = await driverjobdetails.findElement(By.xpath("//div[@class='container-fluid iCIMS_JobsTable']/div[@class='row']/div[2]/dl[2]/dd"));
                                job.JOB_CATEGORY = await categoryElement.getText();
                                if (job.JOB_CATEGORY) {
                                    job.JOB_CATEGORY = job.JOB_CATEGORY.trim();
                                }

                                var countryElement = await driverjobdetails.findElement(By.xpath("//div[@class='container-fluid iCIMS_JobsTable']/div[@class='row']/div[2]/dl[contains(.,'Country')]"));
                                var country = await countryElement.getText();
                                job.JOB_LOCATION_COUNTRY = country.replace("Country", "");
                                if (job.JOB_LOCATION_COUNTRY) {

                                    var rex = /(.*)-.*-.*/;
                                    var rexPresent = rex.test(job.JOB_LOCATION_COUNTRY);
                                    var rex1 = /(.*)-.*/;
                                    var rex1Present = rex1.test(job.JOB_LOCATION_COUNTRY);

                                    if (rexPresent) {
                                        var countryData1 = rex.exec(job.JOB_LOCATION_COUNTRY);
                                        job.JOB_LOCATION_COUNTRY = countryData1[1];
                                    } else if (rex1Present) {
                                        var countryData2 = rex1.exec(job.JOB_LOCATION_COUNTRY);
                                        job.JOB_LOCATION_COUNTRY = countryData2[1];

                                    } else {
                                        job.JOB_LOCATION_COUNTRY = job.JOB_LOCATION_COUNTRY;
                                    }

                                    job.JOB_LOCATION_COUNTRY = job.JOB_LOCATION_COUNTRY.trim();
                                    rex.lastIndex = 0;
                                    rex1.lastIndex = 0;
                                }

                                var cityElement = await driverjobdetails.findElements(By.xpath("//div[@class='container-fluid iCIMS_JobsTable']/div[@class='row']/div[2]/dl[contains(.,'City')]"));
                                var isCityPresent = await cityElement.length;
                                if (isCityPresent) {
                                    var cityElement = await driverjobdetails.findElement(By.xpath("//div[@class='container-fluid iCIMS_JobsTable']/div[@class='row']/div[2]/dl[contains(.,'City')]"));
                                    var city = await cityElement.getText();
                                    job.JOB_LOCATION_CITY = city.replace("City", "");
                                    if (job.JOB_LOCATION_CITY) {

                                        var cityRex = /(.*),.*/;
                                        var cityRexPresent = cityRex.test(job.JOB_LOCATION_CITY);

                                        if (cityRexPresent) {
                                            var cityData1 = cityRex.exec(job.JOB_LOCATION_CITY);
                                            job.JOB_LOCATION_CITY = cityData1[1];
                                        } else {
                                            job.JOB_LOCATION_CITY = job.JOB_LOCATION_CITY;
                                        }
                                        cityRex.lastIndex = 0;
                                    }
                                }
                                var stateElement = await driverjobdetails.findElements(By.xpath("//div[@class='container-fluid iCIMS_JobsTable']/div[@class='row']/div[2]/dl[contains(.,'State')]"));
                                var isStatePresent = await stateElement.length;
                                if (isStatePresent) {
                                    var stateElement = await driverjobdetails.findElement(By.xpath("//div[@class='container-fluid iCIMS_JobsTable']/div[@class='row']/div[2]/dl[contains(.,'State')]"));
                                    var state = await stateElement.getText();
                                    job.JOB_LOCATION_STATE = state.replace("State", "");
                                    if (job.JOB_LOCATION_STATE) {

                                        var stateRex = /.*-(.*)-.*/;
                                        var stateRexPresent = stateRex.test(job.JOB_LOCATION_STATE);
                                        var stateRex1 = /.*-(.*)/;
                                        var stateRex1Present = stateRex1.test(job.JOB_LOCATION_STATE);

                                        if (stateRexPresent) {
                                            var stateData1 = stateRex.exec(job.JOB_LOCATION_STATE);
                                            job.JOB_LOCATION_STATE = stateData1[1];
                                        } else if (stateRex1Present) {
                                            var stateData2 = stateRex1.exec(job.JOB_LOCATION_STATE);
                                            job.JOB_LOCATION_STATE = stateData2[1];
                                        } else {
                                            job.JOB_LOCATION_STATE = job.JOB_LOCATION_STATE;
                                        }
                                        stateRex1.lastIndex = 0;
                                        stateRex.lastIndex = 0;
                                    }
                                }
                                var jobDescElement1 = await driverjobdetails.findElement(By.xpath('//div[@class="container-fluid iCIMS_JobsTable"]'));
                                var jobDesc1 = await jobDescElement1.getAttribute("outerHTML");

                                var jobDescElement = await driverjobdetails.findElement(By.xpath('//*[@class="iCIMS_JobContent"]'));
                                var jobDesc = await jobDescElement.getAttribute("outerHTML");

                                var jobDescription = jobDesc.split(jobDesc1)[1];
                                jobDescription = jobDescription.split('<div class="iCIMS_JobOptions">')[0];

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

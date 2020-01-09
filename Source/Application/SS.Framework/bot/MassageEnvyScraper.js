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
        var driver = selenium.createDriver(configuration.configuration.execBotConfig.browsertype.toLowerCase());
        var driverjobdetails = selenium.createDriver(configuration.configuration.execBotConfig.browsertype.toLowerCase());
        await driver.get('https://franchisecareers-massageenvy.icims.com');

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
        var jobsCount = (((indexCount) * 20) + records);

        jobMaker.setatsJobCount(parseInt(jobsCount));

        var firstLink = await driver.findElement(By.xpath('//*[@class="iCIMS_Paginator_Bottom"]/div/a[position() = 1]'));
        var test = await firstLink.getText();
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

                        var titleElement = await driver.findElement(By.xpath('//div[@class="container-fluid iCIMS_JobsTable"]/div[@class="row"][' + counter + ']/div[3]/a/dl/dd'));
                        job.JOB_TITLE = await titleElement.getText();
                        job.JOB_TITLE = job.JOB_TITLE.replace("Job Title:", "").trim();
                        var jobIDElements = await driver.findElements(By.xpath("//div[@class='container-fluid iCIMS_JobsTable']/div[@class='row'][" + counter + "]/div[5]/dl[1]/dd"));
                        var isJobID = await jobIDElements.length;
                        if (isJobID) {
                            var jobIdElement = await driver.findElement(By.xpath("//div[@class='container-fluid iCIMS_JobsTable']/div[@class='row'][" + counter + "]/div[5]/dl[1]/dd"));
                            job.JDTID_UNIQUE_NUMBER = await jobIdElement.getText();
                            job.JDTID_UNIQUE_NUMBER = job.JDTID_UNIQUE_NUMBER.replace("Job ID:", "").trim();
                        }
                        else {
                            var jobIdElement = await driver.findElement(By.xpath("//div[@class='container-fluid iCIMS_JobsTable']/div[@class='row'][" + counter + "]/div[4]/dl[1]/dd"));
                            job.JDTID_UNIQUE_NUMBER = await jobIdElement.getText();
                            job.JDTID_UNIQUE_NUMBER = job.JDTID_UNIQUE_NUMBER.replace("Job ID:", "").trim();
                        }
                        var locationElement = await driver.findElement(By.xpath("//div[@class='container-fluid iCIMS_JobsTable']/div[@class='row'][" + counter + "]/div[1]/dl/dd"));
                        var location = await locationElement.getText();
                        location = location.replace("Job Locations:", "").trim();
                        var statusElements = await driver.findElements(By.xpath("//div[@class='container-fluid iCIMS_JobsTable']/div[@class='row'][" + counter + "]/div[5]/dl[2]/dd"));
                        var isStatus = await statusElements.length;
                        if (isStatus) {
                            var statusElement = await driver.findElement(By.xpath("//div[@class='container-fluid iCIMS_JobsTable']/div[@class='row'][" + counter + "]/div[5]/dl[2]/dd"));
                            job.JOB_CONTACT_NAME = await statusElement.getText();
                            job.JOB_CONTACT_NAME = job.JOB_CONTACT_NAME.replace("Clinic Name:", "").trim();
                        }
                        var typeElements = await driver.findElements(By.xpath("//div[@class='container-fluid iCIMS_JobsTable']/div[@class='row'][" + counter + "]/div[5]/dl[3]/dd"));
                        var isType = await typeElements.length;
                        if (isType) {
                            var typeElement = await driver.findElement(By.xpath("//div[@class='container-fluid iCIMS_JobsTable']/div[@class='row'][" + counter + "]/div[5]/dl[3]/dd"));
                            job.JOB_TYPE = await typeElement.getText();
                            job.JOB_TYPE = job.JOB_TYPE.replace("Position Type:", "").trim();
                        }
                        var multipleLocationElement = await driver.findElement(By.xpath("//div[@class='container-fluid iCIMS_JobsTable']/div[@class='row'][" + counter + "]/div[1]/dl/dd"));
                        var multipleLocation = await multipleLocationElement.getAttribute("innerHTML");

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
                            else if (loc.length == 4) {
                                job.JOB_LOCATION_COUNTRY = loc[0];
                                job.JOB_LOCATION_STATE = loc[1];
                                job.JOB_LOCATION_CITY = loc[2] + ' - ' + loc[3];
                            }
                            else {
                                var mult = multipleLocation.split("|");
                                var loct = mult[0].split("-");
                                if (loct.length == 2) {
                                    job.JOB_LOCATION_STATE = loct[1];
                                    job.JOB_LOCATION_COUNTRY = loct[0];
                                }
                                else if (loct.length == 3) {
                                    job.JOB_LOCATION_COUNTRY = loct[0];
                                    job.JOB_LOCATION_STATE = loct[1];
                                    job.JOB_LOCATION_CITY = loct[2];
                                }
                                else if (loct.length == 4) {
                                    job.JOB_LOCATION_COUNTRY = loct[0];
                                    job.JOB_LOCATION_STATE = loct[1];
                                    job.JOB_LOCATION_CITY = loct[2] + ' - ' + loct[3];
                                }
                                else if (loct.length == 1) {
                                    job.JOB_LOCATION_COUNTRY = location;
                                    job.JOB_LOCATION_STATE = location;
                                    job.JOB_LOCATION_CITY = location;
                                }
                            }
                        }
                        var titleLink = await driver.findElement(By.xpath('//div[@class="container-fluid iCIMS_JobsTable"]/div[@class="row"][' + counter + ']/div[3]/a'));
                        var url = await titleLink.getAttribute("href");
                        await driverjobdetails.get(url);
                        var apply = url.split("/job?in_iframe=1");
                        job.JOB_APPLY_URL = apply[0] + "/login";
                        try {
                            await driverjobdetails.switchTo().frame("icims_content_iframe");
                        } catch (err) {
                            driver.sleep(2000);
                            await driverjobdetails.switchTo().frame("icims_content_iframe");
                        }
                        //await driverjobdetails.wait(until.elementLocated(By.xpath("//div[@class='iCIMS_JobHeaderTable iCIMS_Table']")), 10000);
                        var categoryElements = await driverjobdetails.findElements(By.xpath("//div[@class='container-fluid iCIMS_JobsTable']/div[@class='row']/div[4]/dl[2]/dd"));
                        var isCategory = await categoryElements.length;
                        if (isCategory) {
                            var categoryElement = await driverjobdetails.findElement(By.xpath("//div[@class='container-fluid iCIMS_JobsTable']/div[@class='row']/div[4]/dl[2]/dd"));
                            job.JOB_CATEGORY = await categoryElement.getText();
                        }

                        var jobdetailspage = await driverjobdetails.findElements(By.xpath("//h2[@class='iCIMS_InfoMsg iCIMS_InfoField_Job'][contains(text(),'Overview')]"));
                        var isDetailPage = await jobdetailspage.length;
                        if (isDetailPage) {
                            var descriptionElement = await driverjobdetails.findElement(By.xpath("//div[@class='iCIMS_JobContent']"));
                            var overview = await descriptionElement.getAttribute("outerHTML");

                            var desc = overview.split('Overview');
                            var text = desc[1].split('<div class="iCIMS_JobOptions">');
                            var description = '<h2 class="iCIMS_InfoMsg iCIMS_InfoField_Job">Overview</h2 >' + text[0].replace('THIS JOB\n</h2>', '').replace('_________________________________________________________________________________</span></p><p style="margin: 0px;">&nbsp;</p><p style="margin: 0px;">&nbsp;</p><p style="margin: 0px;"><span style="font-family: helvetica;"><em>*</em>', '').replace('<em><span style="font-size: 10pt;">Massage Envy Franchising, LLC (“MEF”) is a national franchisor of independently owned and operated franchised locations. Each individual franchised location, not MEF or any of its affiliates, is the sole employer for all positions posted by a franchised location, and each individual franchised location is not acting as an agent for MEF or any of its affiliates. Hiring criteria, benefits and compensation are set by each individually owned and operated franchised location and may vary from location to location.</span></em></p>\n<div id="iCIMS_Expandable_Button"></div>', '');

                            var descriptionText = "";
                            var optionsTag = {
                                'add-remove-tags': ['img']
                            };
                            cleanHtml.clean(description, optionsTag, function (html) {
                                descriptionText = html;
                            });

                            job.TEXT = HtmlEscape(descriptionText);
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
                var e = await driver.findElements(By.xpath('//a[@target="_self"]/span[@title="Next page of results"]'));
                if (e.length == 1) {
                    var nextPage = await driver.findElement(By.xpath('//*[@target="_self"]/span[@title="Next page of results"]'));
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

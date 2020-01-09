var Promise = require('promise');
var package = global.createPackage();
var he = require('he');
var cleanHtml = require('clean-html');
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
        await driver.manage().window().maximize();
        await driverjobdetails.manage().window().maximize();

        await driver.get('https://chk.tbe.taleo.net/chk01/ats/careers/v2/searchResults?org=BIA&cws=38');
        await driver.sleep(3000);
        await driverjobdetails.sleep(3000);
        var atsJobCount = await driver.wait(until.elementLocated(By.xpath("//*[@class='oracletaleocwsv2-panel-number']")), 4000);
        var atscount = await atsJobCount.getText();
        jobMaker.setatsJobCount(parseInt(atscount.trim()));

        var counter;
        var pagenumber = 1;

        if (atscount) {
            var modpages = atscount % 10;
            var pages = atscount / 10;
            if (modpages > 0)
                pages = pages + 1;

            for (var i = 0; i < pages; i++) {
                await driver.executeScript("scrollTo(0, 8000)");
                await driver.sleep(10000);
            }

            /* for (var l = 1; l < pages; l++) {
                 var nextLink = await driver.findElement(By.xpath("//*[@class='jscroll-next']"));
                 String js = "arguments[0].style.height='auto'; arguments[0].style.visibility='visible';";
                 driver.executeScript(js, nextLink);
                 await driver.sleep(10000);
             }*/
        }
        var counter = 1;
        var scrollCount = 0;
        var isScroll;
        do {
            var isPresent;
            isScroll = false;
            if (scrollCount == 0) {
                var jobContainer = await driver.findElements(By.xpath("//div[@class='oracletaleocwsv2-accordion oracletaleocwsv2-accordion-expandable clearfix'][" + counter + "]"));
                isPresent = await jobContainer.length;
                isScroll = false;
            } else {
                var jobContainerElement = await driver.findElements(By.xpath("//div[@class='jscroll-added'][" + scrollCount + "]/div[@class='oracletaleocwsv2-accordion oracletaleocwsv2-accordion-expandable clearfix'][" + counter + "]"));
                isPresent = await jobContainerElement.length;
                isScroll = true;
            }

            if (isPresent) {
                try {
                    var job = jobMaker.create();
                    var run = "default";
                    var url;
                    while (run != "completed") {

                        if (isScroll) {
                            var titleElement = await driver.findElement(By.xpath("//div[@class='jscroll-added'][" + scrollCount + "]/div[@class='oracletaleocwsv2-accordion oracletaleocwsv2-accordion-expandable clearfix'][" + counter + "]/div/div[1]/div/h4/a"));
                            job.JOB_TITLE = await titleElement.getText();

                            url = await titleElement.getAttribute("href");

                            if (url) {
                                job.JOB_APPLY_URL = url;

                                if (url.includes("&rid=")) {
                                    job.JDTID_UNIQUE_NUMBER = url.split("&rid=").pop();
                                }
                            }

                            var locationElem = await driver.findElements(By.xpath("//div[@class='jscroll-added'][" + scrollCount + "]/div[@class='oracletaleocwsv2-accordion oracletaleocwsv2-accordion-expandable clearfix'][" + counter + "]/div/div[1]/div/div"));
                            var isLocation = await locationElem.length;
                            if (isLocation) {
                                var locationElement = await driver.findElement(By.xpath("//div[@class='jscroll-added'][" + scrollCount + "]/div[@class='oracletaleocwsv2-accordion oracletaleocwsv2-accordion-expandable clearfix'][" + counter + "]/div/div[1]/div/div"));
                                var location = await locationElement.getText();

                                if (location) {

                                    if (location.indexOf(',') < 0) {
                                        job.JOB_LOCATION_CITY = location;
                                    }
                                    else {
                                        var loc = location.split(',');
                                        job.JOB_LOCATION_CITY = loc[0];
                                        job.JOB_LOCATION_STATE = loc[1];
                                    }
                                }

                            }
                        }
                        else {
                            var titleElement = await driver.findElement(By.xpath("//div[@class='oracletaleocwsv2-accordion oracletaleocwsv2-accordion-expandable clearfix'][" + counter + "]/div/div[1]/div/h4/a"));
                            job.JOB_TITLE = await titleElement.getText();

                            url = await titleElement.getAttribute("href");

                            if (url) {
                                job.JOB_APPLY_URL = url;

                                if (url.includes("&rid=")) {
                                    job.JDTID_UNIQUE_NUMBER = url.split("&rid=").pop();
                                }
                            }

                            var locationElem = await driver.findElements(By.xpath("//div[@class='oracletaleocwsv2-accordion oracletaleocwsv2-accordion-expandable clearfix'][" + counter + "]/div/div[1]/div/div"));
                            var isLocation = await locationElem.length;
                            if (isLocation) {
                                var locationElement = await driver.findElement(By.xpath("//div[@class='oracletaleocwsv2-accordion oracletaleocwsv2-accordion-expandable clearfix'][" + counter + "]/div/div[1]/div/div"));
                                var location = await locationElement.getText();

                                if (location) {

                                    if (location.indexOf(',') < 0) {
                                        job.JOB_LOCATION_CITY = location;
                                    }
                                    else {
                                        var loc = location.split(',');
                                        job.JOB_LOCATION_CITY = loc[0];
                                        job.JOB_LOCATION_STATE = loc[1];
                                    }
                                }

                            }
                        }

                        await driverjobdetails.get(url);

                        try {
                            var jobdetailspage = await driverjobdetails.findElements(By.xpath("//div[@class='col-xs-12 col-sm-12 col-md-8']"));
                            var isDetailPage = await jobdetailspage.length;
                            if (isDetailPage) {

                                /*var categoryElement = await driverjobdetails.findElement(By.xpath("//div//table//tr[14]//b"));
                                job.JOB_CATEGORY = await categoryElement.getText();*/

                                var descElement = await driverjobdetails.findElement(By.xpath("//div[@class='col-xs-12 col-sm-12 col-md-8']"));
                                var desc0 = await descElement.getAttribute("outerHTML");

                                var desc1Element = await driverjobdetails.findElement(By.xpath("//div[@class='oracletaleocwsv2-button-navigation oracletaleocwsv2-job-description clearfix']"));
                                var desc1 = await desc1Element.getAttribute("outerHTML");

                                var desc = desc0.split(desc1)[0];

                                if (desc) {
                                    job.TEXT = HtmlEscape(desc);
                                }
                                jobMaker.successful.add(job, botScheduleID);
                            }
                            counter++;
                            run = "completed";
                            if (counter == 11) {
                                counter = 1;
                                scrollCount++;
                            }

                        } catch (ex) {
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

        await driver.quit();
        await driverjobdetails.quit();
        await snippet(configuration, jobMaker.atsJobCount, jobMaker.failedJobs.length, jobMaker, onsuccess, onfailure);
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
    description = description.replace(/\s\s+/g, ' ');
    description = description.replace(/\r?\n|\r/g, '');
    description = description.replace(/&mldr+/g, '&hellip');
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
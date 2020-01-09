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

        await driver.get('https://chk.tbe.taleo.net/chk06/ats/careers/jobSearch.jsp?org=BMRN&cws=1');
        await driver.sleep(3000);
        await driver.findElement(By.xpath("//input[@value='Search']")).click();
        await driverjobdetails.sleep(3000);
        var atsJobCount = await driver.wait(until.elementLocated(By.xpath("//*[contains(text(),'Your search found')]/b")), 4000);
        var atscount = await atsJobCount.getText();
        jobMaker.setatsJobCount(parseInt(atscount.trim()));

        var counter;
        var loop;
        var pagenumber = 1;
        do {
            loop = false;
            var counter = 2;

            do {
                var jobContainer = await driver.findElements(By.xpath("//table[@id='cws-search-results']//tr[" + counter + "]"));
                var isPresent = await jobContainer.length;
                if (isPresent) {
                    try {
                        var job = jobMaker.create();
                        var run = "default";

                        while (run != "completed") {


                            var titleElement = await driver.findElement(By.xpath("//table[@id='cws-search-results']//tr[" + counter + "]/td[1]//a"));
                            job.JOB_TITLE = await titleElement.getText();

                            var url = await titleElement.getAttribute("href");

                            if (url) {
                                job.JOB_APPLY_URL = url;

                                if (url.includes("&rid=")) {
                                    job.JDTID_UNIQUE_NUMBER = url.split("&rid=").pop();
                                }
                            }

                            var locationElem = await driver.findElements(By.xpath("//table[@id='cws-search-results']//tr[" + counter + "]/td[2]"));
                            var isLocation = await locationElem.length;
                            if (isLocation) {
                                var locationElement = await driver.findElement(By.xpath("//table[@id='cws-search-results']//tr[" + counter + "]/td[2]"));
                                var location = await locationElement.getText();

                                if (location) {

                                    var countryRex = /(.*)-/;
                                    var countryRexPresent = countryRex.test(location);

                                    if (countryRexPresent) {
                                        var countryData1 = countryRex.exec(location);
                                        job.JOB_LOCATION_COUNTRY = countryData1[1];
                                    } else {
                                        job.JOB_LOCATION_COUNTRY = location;
                                    }
                                    countryRex.lastIndex = 0;

                                    var state = location;
                                    var stateRex = /.*-.*,\s?(.*)/;
                                    var stateRexPresent = stateRex.test(state);

                                    if (stateRexPresent) {
                                        var stateData1 = stateRex.exec(state);
                                        state = stateData1[1];
                                    }
                                    stateRex.lastIndex = 0;

                                    var stateRex1 = /.*-\s?(.*)/;
                                    var stateRex1Present = stateRex1.test(state);

                                    if (stateRex1Present) {
                                        var stateData2 = stateRex1.exec(state);
                                        state = stateData2[1];
                                    }
                                    stateRex.lastIndex = 0;

                                    job.JOB_LOCATION_STATE = state;

                                    var cityRex = /.*-(.*),(.*)/;
                                    var cityRexPresent = cityRex.test(location);

                                    if (cityRexPresent) {
                                        var cityData1 = cityRex.exec(location);
                                        job.JOB_LOCATION_CITY = cityData1[1];
                                    }
                                    cityRex.lastIndex = 0;

                                }

                            }

                            var typeElement = await driver.findElement(By.xpath("//table[@id='cws-search-results']//tr[" + counter + "]/td[4]"));
                            job.JOB_TYPE = await typeElement.getText();

                            await driverjobdetails.get(url);

                            try {

                                var jobdetailspage = await driverjobdetails.findElements(By.xpath("//table/tbody"));
                                var isDetailPage = await jobdetailspage.length;
                                if (isDetailPage) {

                                    var salryFromElement = await driverjobdetails.findElement(By.xpath("//div//table//td[5][@class='formFieldNormal top']"));
                                    job.JOB_SALARY_FROM = await salryFromElement.getText();

                                    var categoryElement = await driverjobdetails.findElement(By.xpath("//div//table//tr[14]//b"));
                                    job.JOB_CATEGORY = await categoryElement.getText();

                                    var idElement = await driverjobdetails.findElement(By.xpath("//div//table//tr[*[contains(text(), 'Req #')]]/td/b"));
                                    var idData = await idElement.getText();

                                    var relocationElem = await driverjobdetails.findElements(By.xpath("//div//table//td[4]/p"));
                                    var isRelocation = await relocationElem.length;
                                    if (isRelocation) {
                                        var relocationElemData = await driverjobdetails.findElement(By.xpath("//div//table//td[4]/p"));
                                        var relocationData = await relocationElemData.getText();

                                        if (relocationData) {

                                            relocationData = relocationData.trim();
                                            relocationData = HtmlEscape(relocationData);
                                            var reLocRex = /Specific Location:\s(.*)/;
                                            var reLocRexPresent = reLocRex.test(relocationData);

                                            if (reLocRexPresent) {
                                                var reLocData1 = reLocRex.exec(relocationData);
                                                job.RELOCATION = reLocData1[1];
                                            } else if (relocationData.toLowerCase() == "specific location:") {

                                            } else {
                                                job.RELOCATION = relocationData;
                                            }
                                            reLocRex.lastIndex = 0;
                                        }

                                    }

                                    //var urlElement = await driverjobdetails.findElement(By.xpath("//div//table//tr//td//form[@name='apply']"));
                                    //var URLData = await urlElement.getAttribute("action");

                                    //if (URLData) {
                                    //    if (URLData.includes("apply.jsp")) {
                                    //        job.JOB_APPLY_URL = URLData.replace("apply.jsp", "requisition.jsp");
                                    //    }
                                    //}

                                    var descElement = await driverjobdetails.findElement(By.xpath("//table/tbody"));
                                    var desc0 = await descElement.getAttribute("outerHTML");

                                    var desc1Element = await driverjobdetails.findElement(By.xpath("//table/tbody/tr[td/h1/*[text()='Description']]"));
                                    var desc1 = await desc1Element.getAttribute("outerHTML");

                                    var desc2Element = await driverjobdetails.findElement(By.xpath("//table/tbody/tr[td/h1/*[text()='Job Details']]"));
                                    var desc2 = await desc2Element.getAttribute("outerHTML");

                                    var desc = desc0.split(desc1)[1];
                                    desc = desc.split(desc2)[0];
                                    desc = desc1 + desc;

                                    if (desc) {
                                        job.TEXT = HtmlEscape(desc);
                                    }
                                    jobMaker.successful.add(job, botScheduleID);
                                }
                                counter++;
                                run = "completed";

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

            try {

                var firstValElem = await driver.findElement(By.xpath("//div/table//table//table//td[contains(text(), 'of') and b[1][contains(text(), '-')]]/b[1]"));
                var firstVal = await firstValElem.getText();

                firstVal = firstVal.split("-").pop();                

                var secondValElem = await driver.findElement(By.xpath("//div/table//table//table//td[contains(text(), 'of') and b[1][contains(text(), '-')]]/b[2]"));
                var secondVal = await secondValElem.getText();

                if (firstVal) {
                    firstVal = firstVal.trim();
                    if (secondVal) {
                        if (firstVal != secondVal) {
                            var nextContainer = await driver.findElements(By.xpath("//div/table//table//table//td[4]/a[contains(@href, 'next')]"));
                            var next = nextContainer.length;
                            if (next >= 1) {
                                var nextLink = await driver.findElement(By.xpath("//div/table//table//table//td[4]/a[contains(@href, 'next')]"));
                                await nextLink.click();
                                await driver.sleep(5000);
                                loop = true;
                                pagenumber++;
                            }
                        }
                    }
                }                
            } catch (e) {
                var a = e.message;
            }
        } while (loop);

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
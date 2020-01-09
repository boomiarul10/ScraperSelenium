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

        await driver.get('https://southernwine.taleo.net/careersection/3/jobsearch.ftl?lang=en');
        driver.sleep(5000);
        var dataa = await driver.getPageSource();
        var isJobTypePresent;
        var typeCounter = 1;
        var atsJobCount = await driver.wait(until.elementLocated(By.xpath("//span[@id='requisitionListInterface.ID2868']")), 4000);
        var atscount = await atsJobCount.getText();
        var record = atscount.split("Results (").pop().split("jobs").shift();
        jobMaker.setatsJobCount(parseInt(record.trim()));

        await driver.findElement(By.xpath('//*[@id="requisitionListInterface.dropListSize"]/option[5]')).click();
        await driverjobdetails.sleep(3000);
        var loop;
        var pagenumber = 1;
        do {
            loop = false;
            var counter = 1;

            do {


                var jobContainer = await driver.findElements(By.xpath("//div[@id='requisitionListInterface.listRequisitionContainer']/table/tbody/tr[@class='ftlcopy ftlrow'][" + counter + ']'));
                var isPresent = await jobContainer.length;
                if (isPresent) {
                    try {
                        var job = jobMaker.create();
                        var run = "default";

                        while (run != "completed") {

                            var idElement = await driver.findElement(By.xpath("//div[@id='requisitionListInterface.listRequisitionContainer']/table/tbody/tr[@class='ftlcopy ftlrow'][" + counter + "]//div[@class='editablesection']//span[starts-with(@id,'requisitionListInterface.reqContestNumberValue.row')]"));
                            job.JDTID_UNIQUE_NUMBER = await idElement.getText();

                            var applyIdElement = await driver.findElement(By.xpath("//div[@id='requisitionListInterface.listRequisitionContainer']/table/tbody/tr[@class='ftlcopy ftlrow'][" + counter + "]/td[2]/div"));
                            var applyId = await applyIdElement.getAttribute("id");

                            //if (applyIdContent) {
                            //    var applyRex = /<div id="(\w+)".*/;
                            //    var applyRexPresent = applyRex.test(applyIdContent);
                            //    if (applyRexPresent) {
                            //        var applyData = applyRex.exec(applyIdContent);
                            //        var applyId = applyData[1];
                            //    }
                            //}


                            var titleElement = await driver.findElement(By.xpath("//div[@id='requisitionListInterface.listRequisitionContainer']/table/tbody/tr[@class='ftlcopy ftlrow'][" + counter + "]//a[starts-with(@id,'requisitionListInterface.reqTitleLinkAction.row')]"));
                            job.JOB_TITLE = await titleElement.getText();

                            var url = "https://southernwine.taleo.net/careersection/3/jobdetail.ftl?job=" + applyId + "&lang=en";

                            await driverjobdetails.get(url);

                            try {

                                var jobdetailspage = await driverjobdetails.findElements(By.xpath("//div[@class='editablesection']"));
                                var isDetailPage = await jobdetailspage.length;
                                if (isDetailPage) {

                                    job.JOB_LOCATION_COUNTRY = "United States";

                                    var applyURL = "https://southernwine.taleo.net/careersection/3/jobapply.ftl?job=" + applyId + "&lang=en";
                                    job.JOB_APPLY_URL = applyURL;

                                    var categoryElement = await driverjobdetails.findElement(By.xpath("//span[@id='requisitionDescriptionInterface.ID1664.row1']"));
                                    job.JOB_CATEGORY = await categoryElement.getText();

                                    var descElement = await driverjobdetails.findElement(By.xpath("//div[@class='editablesection' and div[position()>1 and position()<last()]]"));
                                    var desc1 = await descElement.getAttribute("outerHTML");

                                    var descElement = await driverjobdetails.findElement(By.xpath("//div[@class='editablesection']/div[.//span[@class='titlepage']]"));
                                    var desc0 = await descElement.getAttribute("outerHTML");

                                    var desc = desc1.split(desc0)[1];

                                    desc = desc.replace('>Description<', '><b>Description</b><br/><');
                                    desc = desc.replace('>Qualifications<', '><b>Qualifications</b><br/><');
                                    desc = desc.replace(/<h2/g, "<font");

                                    //var optionsTag = {
                                    //    'add-remove-tags': ['h2']
                                    //};

                                    //cleanHtml.clean(desc, optionsTag, function (html) {
                                    //    desc = html;
                                    //});

                                    var locElement = await driverjobdetails.findElement(By.xpath("//span[@id='requisitionDescriptionInterface.ID1714.row1']"));
                                    var loc = await locElement.getText();
                                    var state = loc;
                                    var city = loc;                                    

                                    if (state) {
                                        var stateRex = /(.*)-.*/;
                                        var stateRexPresent = stateRex.test(state);
                                        var stateRex1 = /(.*)/;
                                        var stateRex1Present = stateRex1.test(state);

                                        if (stateRexPresent) {
                                            var stateData1 = stateRex.exec(state);
                                            job.JOB_LOCATION_STATE = stateData1[1];
                                        } else if (stateRex1Present) {
                                            var stateData2 = stateRex1.exec(state);
                                            job.JOB_LOCATION_STATE = stateData2[1];
                                        }
                                        stateRex1.lastIndex = 0;
                                        stateRex.lastIndex = 0;

                                    }

                                    if (city) {
                                        var cityRex = /.*-(.*)/;
                                        var cityRexPresent = cityRex.test(city);

                                        if (cityRexPresent) {
                                            var cityData1 = cityRex.exec(city);
                                            job.JOB_LOCATION_CITY = cityData1[1];
                                        }
                                        cityRex.lastIndex = 0;

                                    }

                                    var otherLocPageElem = await driverjobdetails.findElements(By.xpath("//span[@id='requisitionDescriptionInterface.ID1764.row1']"));
                                    var isOtherLoc = await otherLocPageElem.length;
                                    if (isOtherLoc) {
                                        var otherLocElement = await driverjobdetails.findElement(By.xpath("//span[@id='requisitionDescriptionInterface.ID1764.row1']"));
                                        var otherLoc = await otherLocElement.getText();

                                        job.OTHER_LOCATIONS = otherLoc;
                                    }

                                    if (otherLoc) {
                                        job.JOB_SALARY = loc + "," + otherLoc;
                                        otherLoc = undefined;
                                    } else {
                                        job.JOB_SALARY = loc + ",";
                                    }

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
                var nextContainer = await driver.findElements(By.xpath("//span[@class='pagerlinkoff']/a[contains(@id,'Next')]"));
                var next = nextContainer.length;
                if (!(next == 1)) {
                    var nextLink = await driver.findElement(By.xpath("//span[@class='pagerlink']/a[contains(@id,'Next')]"));
                    await nextLink.click();
                    await driver.sleep(5000);
                    loop = true;
                    pagenumber++;
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
    description = description.replace(/&nbsp;/g, '');
    description = description.replace(/\s\s+/g, ' ');
    description = description.replace(/\r?\n|\r/g, '');
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
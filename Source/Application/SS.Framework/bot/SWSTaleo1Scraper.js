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
        //var driver = selenium.createDriver("chrome");
        //var driverjobdetails = selenium.createDriver("chrome");

        await driver.get('https://southernwine.taleo.net/careersection/2/jobsearch.ftl?lang=en');

        var atsJobCount = await driver.wait(until.elementLocated(By.xpath("//span[@id='requisitionListInterface.ID2868']")), 4000);
        var atscount = await atsJobCount.getText();
        var record = atscount.split("Results (").pop().split("jobs").shift();
        jobMaker.setatsJobCount(parseInt(record.trim()));

        await driver.findElement(By.xpath('//*[@id="requisitionListInterface.dropListSize"]/option[5]')).click();
        // await driverjobdetails.sleep(3000);
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

                        var idElement = await driver.findElement(By.xpath("//div[@id='requisitionListInterface.listRequisitionContainer']/table/tbody/tr[@class='ftlcopy ftlrow'][" + counter + "]//div[@class='editablesection']//span[starts-with(@id,'requisitionListInterface.reqContestNumberValue.row')]"));
                        job.JDTID_UNIQUE_NUMBER = await idElement.getText();

                        var applyIdElement = await driver.findElement(By.xpath("//div[@id='requisitionListInterface.listRequisitionContainer']/table/tbody/tr[@class='ftlcopy ftlrow'][" + counter + "]/td[2]/div"));
                        var applyId = await applyIdElement.getAttribute("id");

                        var titleElement = await driver.findElement(By.xpath("//div[@id='requisitionListInterface.listRequisitionContainer']/table/tbody/tr[@class='ftlcopy ftlrow'][" + counter + "]//a[starts-with(@id,'requisitionListInterface.reqTitleLinkAction.row')]"));
                        job.JOB_TITLE = await titleElement.getText();

                        var url = "https://southernwine.taleo.net/careersection/2/jobdetail.ftl?job=" + applyId + "&lang=en";
                        await driverjobdetails.get(url);


                        var jobdetailspage = await driverjobdetails.findElements(By.xpath("//div[@class='editablesection']"));
                        var isDetailPage = await jobdetailspage.length;
                        if (isDetailPage) {                            
                            var applyURL = "https://southernwine.taleo.net/careersection/2/jobapply.ftl?job=" + applyId + "&lang=en";
                            job.JOB_APPLY_URL = applyURL;

                            var categoryElement = await driverjobdetails.findElement(By.xpath("//span[@id='requisitionDescriptionInterface.ID1664.row1']"));
                            job.JOB_CATEGORY = await categoryElement.getText();

                            var descElement = await driverjobdetails.findElement(By.xpath("//div[@class='editablesection' and div[position()>1 and position()<last()]]"));
                            var desc = await descElement.getAttribute("outerHTML");
                            var descSplit = await driverjobdetails.findElement(By.xpath("//div[@id='requisitionDescriptionInterface.ID1513.row1']"));
                            var desc = await descElement.getAttribute("outerHTML");
                            desc = desc.split('<span class="subtitle">Description</span>');
                            desc = '<div id="requisitionDescriptionInterface.ID1513.row1" class="inlinepanel" title="" style="DISPLAY: inline"><span class="subtitle">Description</span>' + desc[1];
                            desc = desc.replace('>Description<', '><b>Description</b><br/><');
                            desc = desc.replace('>Qualifications<', '><b>Qualifications</b><br/><');
                            desc = desc.replace('PADDING-LEFT: 1em; MARGIN-LEFT: 30%', '');
                            desc = desc.replace('face="Arial Narrow"', '');
                            desc = desc.replace('size="14"', '');
                            desc = desc.replace('size="3"', '');
                            desc = desc.replace('face="Arial"', '');
                            desc = desc.replace('style="FONT-FAMILY: \'Arial\', \'sans- serif\'; FONT-SIZE: 11pt; mso-bidi-font-size: 10.0pt"', '');
                            desc = desc.replace('face="&quot;arialnarrow&quot;,&quot;sans-serif&quot;"', '');

                            var optionsTag = {
                                'add-remove-tags': ['h2']
                            };

                            cleanHtml.clean(desc, optionsTag, function (html) {
                                desc = html;
                            });
                            job.TEXT = HtmlEscape(desc);

                            var locElement = await driverjobdetails.findElement(By.xpath("//span[@id='requisitionDescriptionInterface.ID1714.row1']"));
                            var location = await locElement.getText();
                            if (location) {
                                if (location.indexOf("-") >= 1) {
                                    var loc = location.split("-");
                                    if (loc.length == 3) {
                                        job.JOB_LOCATION_CITY = loc[2];
                                        job.JOB_LOCATION_STATE = loc[1];
                                        job.JOB_LOCATION_COUNTRY = loc[0];
                                    }
                                    else if (loc.length == 2) {
                                        job.JOB_LOCATION_STATE = location;
                                        job.JOB_LOCATION_COUNTRY = location;
                                    }
                                }
                                else {
                                    job.JOB_LOCATION_STATE = location;
                                    job.JOB_LOCATION_COUNTRY = location;
                                }
                            }

                            var otherLocElement = await driverjobdetails.findElements(By.xpath("//span[@id='requisitionDescriptionInterface.ID1764.row1']"));
                            if (otherLocElement.length == 1) {
                                var otherLocElement = await driverjobdetails.findElement(By.xpath("//span[@id='requisitionDescriptionInterface.ID1764.row1']"));
                                var otherLoc = await otherLocElement.getText();
                                job.OTHER_LOCATIONS = otherLoc;
                            } else {
                                job.OTHER_LOCATIONS = "";
                            }
                            job.JOB_SALARY = location + "," + job.OTHER_LOCATIONS;

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
                var HomeElement = await driver.findElements(By.xpath('//*[@id="requisitionListInterface.pagerDivID3600.panel.Next"]/span[@class="pagerlink"]'));
                var home = await HomeElement.length;
                if (home) {
                    var nextLink = await driver.findElement(By.xpath('//*[@id="requisitionListInterface.pagerDivID3600.Next"]'));
                    await nextLink.click();
                    loop = true;
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
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

        await driver.get('https://grouphealth.taleo.net/careersection/2/jobsearch.ftl?lang=en');

        var atsJobCount = await driver.wait(until.elementLocated(By.xpath("//span[@id='requisitionListInterface.ID2727']")), 4000);
        var atscount = await atsJobCount.getText();
        var record = atscount.split("Results (").pop().split("jobs").shift();
        jobMaker.setatsJobCount(parseInt(record.trim()));

        await driver.findElement(By.xpath('//*[@id="requisitionListInterface.dropListSize"]/option[5]')).click();
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

                        var dateElement = await driver.findElement(By.xpath("//div[@id='requisitionListInterface.listRequisitionContainer']/table/tbody/tr[@class='ftlcopy ftlrow'][" + counter + "]//*[@id='requisitionListInterface.reqPostingDate.row" + counter + "']"));
                        job.ASSIGNMENT_START_DATE = await dateElement.getText();

                        var url = "https://grouphealth.taleo.net/careersection/2/jobdetail.ftl?job=" + job.JDTID_UNIQUE_NUMBER;
                        job.JOB_APPLY_URL = url;
                        await driverjobdetails.get(url);
                        await driverjobdetails.sleep(2000);

                        var jobdetailspage = await driverjobdetails.findElements(By.xpath("//div[@class='editablesection']"));
                        var isDetailPage = await jobdetailspage.length;
                        if (isDetailPage) {

                            var categoryElement = await driverjobdetails.findElements(By.xpath("//span[@id='requisitionDescriptionInterface.ID1661.row1']"));
                            var category = await categoryElement.length;
                            if (category) {
                                var categoryElement = await driverjobdetails.findElement(By.xpath("//span[@id='requisitionDescriptionInterface.ID1661.row1']"));
                                job.JOB_CATEGORY = await categoryElement.getText();
                            }

                            var locElement = await driverjobdetails.findElement(By.xpath("//span[@id='requisitionDescriptionInterface.ID1717.row1']"));
                            var location = await locElement.getText();
                            if (location) {
                                if (location.indexOf("-") >= 1) {
                                    var loc = location.split("-");
                                    if (loc.length == 5) {
                                        job.JOB_LOCATION_CITY = loc[2];
                                        job.JOB_LOCATION_STATE = loc[0];
                                    }
                                    else {
                                        job.JOB_LOCATION_CITY = loc[1];
                                        job.JOB_LOCATION_STATE = loc[0];
                                    }
                                }
                            }
                            job.JOB_CONTACT_ADDRESS = location;

                            var jobtype = await driverjobdetails.findElement(By.xpath("//span[@id='requisitionDescriptionInterface.ID2145.row1']"));
                            job.JOB_TYPE = await jobtype.getText();

                            var jobstatus = await driverjobdetails.findElement(By.xpath("//span[@id='requisitionDescriptionInterface.ID2199.row1']"));
                            job.JOB_STATUS = await jobstatus.getText();

                            var jobschedule = await driverjobdetails.findElements(By.xpath("//span[@id='requisitionDescriptionInterface.ID1763.row1']"));
                            var schedule = await jobschedule.length;
                            if (schedule) {
                                var jobschedule = await driverjobdetails.findElement(By.xpath("//span[@id='requisitionDescriptionInterface.ID1763.row1']"));
                                job.EDUCATION = await jobschedule.getText();
                            }

                            var jobshift = await driverjobdetails.findElements(By.xpath("//span[@id='requisitionDescriptionInterface.ID1885.row1']"));
                            var shift = await jobshift.length;
                            if (shift) {
                                var jobshift = await driverjobdetails.findElement(By.xpath("//span[@id='requisitionDescriptionInterface.ID1885.row1']"));
                                job.JOB_CONTACT_NAME = await jobshift.getText();
                            }

                            var jobDaysofShift = await driverjobdetails.findElement(By.xpath("//span[@id='requisitionDescriptionInterface.ID1799.row1']"));
                            job.JOB_CONTACT_GIVENNAME = await jobDaysofShift.getText();

                            var jobHoursofShift = await driverjobdetails.findElement(By.xpath("//span[@id='requisitionDescriptionInterface.ID1837.row1']"));
                            job.JOB_CONTACT_FAMILYNAME = await jobHoursofShift.getText();

                            var joblevel = await driverjobdetails.findElement(By.xpath("//span[@id='requisitionDescriptionInterface.ID2091.row1']"));
                            job.JOB_INDUSTRY = await joblevel.getText();

                            var companyName = await driverjobdetails.findElements(By.xpath("//span[@id='requisitionDescriptionInterface.ID1800.row1']"));
                            var company = await companyName.length;
                            if (company) {
                                var companyName = await driverjobdetails.findElement(By.xpath("//span[@id='requisitionDescriptionInterface.ID1800.row1']"));
                                job.JOB_CONTACT_COMPANY = await companyName.getText();
                            }

                            var qualificationsElement = await driverjobdetails.findElement(By.xpath('//*[@id="requisitionDescriptionInterface.ID1566.row1"]'));
                            var qual = await qualificationsElement.getAttribute("outerHTML");

                            var qualificationValue = qual.split('<span class="subtitle">Qualifications</span>');
                            var qualification = qualificationValue[1];
                            var qualificationSplitElement = await driverjobdetails.findElements(By.xpath("//*[@id='requisitionDescriptionInterface.ID1609.row1']//div[position()=last()]"));
                            var qualificationLength = await qualificationSplitElement.length;
                            if (qualificationLength) {
                                var qualificationSplitElement = await driverjobdetails.findElement(By.xpath("//*[@id='requisitionDescriptionInterface.ID1609.row1']//div[position()=last()]"));
                                var qualificationSplit = await qualificationSplitElement.getAttribute("outerHTML");
                                qualification = qualification.split(qualificationSplit);
                                qualification = '<div><span class="subtitle">Qualifications</span></div>' + qualification[0];
                                job.QUALIFICATIONS = qualification;
                            }

                            var educationElement = await driverjobdetails.findElements(By.xpath("//*[@id='requisitionDescriptionInterface.ID1609.row1']/div[1]/div[contains(., 'Education')]"));
                            var education1 = await educationElement.length;
                            var educationElement = await driverjobdetails.findElements(By.xpath("//*[@id='requisitionDescriptionInterface.ID1609.row1']//div[contains(., 'Education')]"));
                            var education2 = await educationElement.length;
                            var educationElement = await driverjobdetails.findElements(By.xpath("//*[@id='requisitionDescriptionInterface.ID1609.row1']/p[contains(., 'Education')]"));
                            var education3 = await educationElement.length;
                            if (education1) {
                                var educationElement = await driverjobdetails.findElement(By.xpath("//*[@id='requisitionDescriptionInterface.ID1609.row1']/div[1]/div[contains(., 'Education')]"));
                                var education = await educationElement.getText();
                                job.EDUCATION = education;
                            }
                            else if (education2) {
                                var educationElement = await driverjobdetails.findElement(By.xpath("//*[@id='requisitionDescriptionInterface.ID1609.row1']//div[contains(., 'Education')]"));
                                var education = await educationElement.getText();
                                job.EDUCATION = education;
                            }
                            else if (education3) {
                                var educationElement = await driverjobdetails.findElement(By.xpath("//*[@id='requisitionDescriptionInterface.ID1609.row1']/p[contains(., 'Education')]"));
                                var education = await educationElement.getText();
                                job.EDUCATION = education;
                            }

                            var travel = await driverjobdetails.findElement(By.xpath("//span[@id='requisitionDescriptionInterface.ID2037.row1']"));
                            job.TRAVEL = await travel.getText();

                            var descElement = await driverjobdetails.findElement(By.xpath("//div[@class='editablesection' and div[position()>1 and position()<last()]]"));
                            var desc = await descElement.getAttribute("outerHTML");
                            var descSplitElement = await driverjobdetails.findElement(By.xpath("//*[@id='requisitionDescriptionInterface.ID1618.row1']"));
                            var descSplit = await descSplitElement.getAttribute("outerHTML");
                            desc = desc.split('<span class="subtitle">Description</span>');
                            desc = '<span class="subtitle">Description</span>' + desc[1];
                            desc = desc.split(descSplit);
                            desc = desc[0];
                            job.TEXT = HtmlEscape(desc);

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
                var HomeElement = await driver.findElements(By.xpath('//*[@id="requisitionListInterface.pagerDivID3492.panel.Next"]/span[@class="pagerlink"]'));
                var home = await HomeElement.length;
                if (home) {
                    var nextLink = await driver.findElement(By.xpath('//*[@id="requisitionListInterface.pagerDivID3492.Next"]'));
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
    description = description.replace(/&nbsp;/g, ' ');
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
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

        await driver.get('https://nwl.taleo.net/careersection/10080/jobsearch.ftl');

        var atsJobCount = await driver.wait(until.elementLocated(By.xpath("//div[@id='requisitionListInterface.searchResultHeaderId']")), 4000);
        var atscount = await atsJobCount.getText();
        var record = atscount.split("Results (").pop().split("jobs").shift();
        jobMaker.setatsJobCount(parseInt(record.trim()));

        await driver.findElement(By.xpath('//*[@id="requisitionListInterface.dropListSize"]/option[5]')).click();

        var categoryElement = await driver.findElement(By.xpath('//*[@id="basicSearchInterface.jobfield1L1"]'));
        var optionArray = await categoryElement.findElements(By.tagName('option'));

        for (var i = 1; i <= optionArray.length; i++) {
            var option = await driver.findElement(By.xpath('//*[@id="basicSearchInterface.jobfield1L1"]/option[' + i + ']'));
            var category = await option.getAttribute('text');
            await option.click();
            if (i == 1) {
                var submitElement = await driver.findElement(By.xpath('//*[@id="basicSearchFooterInterface.searchAction"]'));
                await submitElement.click();

                var loop;
                var pagenumber = 1;
                do {
                    loop = false;
                    var counter = 1;
                    do {
                        var jobContainer = await driver.findElements(By.xpath("//*[@id='requisitionListInterface.listRequisition']/tbody/tr[@class='ftlcopy ftlrow'][" + counter + ']'));
                        var isPresent = await jobContainer.length;
                        if (isPresent) {
                            try {
                                var job = jobMaker.create();

                                var idElement = await driver.findElement(By.xpath("//*[@id='requisitionListInterface.listRequisition']/tbody/tr[@class='ftlcopy ftlrow'][" + counter + "]//div[@class='editablesection']//span[starts-with(@id,'requisitionListInterface.reqContestNumberValue.row')]"));
                                job.JDTID_UNIQUE_NUMBER = await idElement.getText();

                                var titleElement = await driver.findElement(By.xpath("//*[@id='requisitionListInterface.listRequisition']/tbody/tr[@class='ftlcopy ftlrow'][" + counter + "]//a[starts-with(@id,'requisitionListInterface.reqTitleLinkAction.row')]"));
                                job.JOB_TITLE = await titleElement.getText();

                                var organisationElement = await driver.findElement(By.xpath("//*[@id='requisitionListInterface.listRequisition']/tbody/tr[@class='ftlcopy ftlrow'][" + counter + "]//span[contains(@id,'reqOrganization')]"));
                                job.JOB_INDUSTRY = await organisationElement.getText();

                                var relocElement = await driver.findElement(By.xpath("//*[@id='requisitionListInterface.listRequisition']/tbody/tr[@class='ftlcopy ftlrow'][" + counter + "]//div[contains(@class,'morelocation')]"));
                                job.RELOCATION = await relocElement.getText();

                                var url = "https://nwl.taleo.net/careersection/10080/jobdetail.ftl?job=" + job.JDTID_UNIQUE_NUMBER;
                                var applyURL = "https://nwl.taleo.net/careersection/10080/jobapply.ftl?lang=en&job=" + job.JDTID_UNIQUE_NUMBER + "";

                                job.JOB_APPLY_URL = applyURL;

                                await driverjobdetails.get(url);

                                var locElement = await driverjobdetails.findElements(By.xpath("//*[@id='requisitionDescriptionInterface.ID1574.row1']"));
                                var isLoc = await locElement.length;
                                if (isLoc) {
                                    var locElement = await driverjobdetails.findElement(By.xpath("//*[@id='requisitionDescriptionInterface.ID1574.row1']"));
                                    var location = await locElement.getText();
                                    if (location) {
                                        if (location.indexOf(',') > 0) {
                                            location = location.split(',');
                                            location = location[0].trim();
                                        }
                                        var loc = location.split("-");
                                        if (loc.length == 3) {
                                            job.JOB_LOCATION_CITY = loc[2];
                                            job.JOB_LOCATION_STATE = loc[1];
                                            job.JOB_LOCATION_COUNTRY = loc[0];
                                        }
                                        else if (loc.length == 4) {
                                            job.JOB_LOCATION_CITY = loc[2] + " " + loc[3];
                                            job.JOB_LOCATION_STATE = loc[1];
                                            job.JOB_LOCATION_COUNTRY = loc[0];
                                        }
                                        else if (loc.length == 2) {
                                            job.JOB_LOCATION_CITY = loc[1];
                                            job.JOB_LOCATION_STATE = loc[1];
                                            job.JOB_LOCATION_COUNTRY = loc[0];
                                        }
                                        else {
                                            job.JOB_LOCATION_COUNTRY = location;
                                        }
                                    }
                                    if (job.JOB_LOCATION_CITY == "Niklaas") {
                                        job.JOB_LOCATION_CITY = "Sint Niklaas";
                                    }
                                }

                                var typeElement = await driverjobdetails.findElements(By.xpath("//*[@id='requisitionDescriptionInterface.ID1706.row1']"));
                                var typeLength = await typeElement.length;
                                if (typeLength) {
                                    var typeElement = await driverjobdetails.findElement(By.xpath("//*[@id='requisitionDescriptionInterface.ID1706.row1']"));
                                    job.JOB_TYPE = await typeElement.getText();
                                }

                                var descElement = await driverjobdetails.findElement(By.xpath("//div[@class='editablesection']"));
                                var desc = await descElement.getAttribute("innerHTML");
                                desc = desc.split('<span class="subtitle">Description</span>');
                                desc = desc[1];
                                desc = desc.replace('> &nbsp; </div>', '> &nbsp; </div><br>');
                                desc = desc.replace('> Job Description <', '><b> Job Description</b> <');
                                desc = desc.replace('> Job Responsibilities: <', '><b> Job Responsibilities: </b><');

                                var jobDescription = "";
                                var optionTag = {
                                    'add-remove-tags': ['table', 'thead', 'tbody', 'tr', 'td', 'h1', 'h2'],
                                    'remove-attributes': [],
                                    'remove-tags': []
                                };

                                cleanHtml.clean(desc, optionTag, function (html) {
                                    jobDescription = html;
                                });
                                jobDescription = jobDescription.replace('<span class="subtitle">Qualifications</span>', '<span class="subtitle"><h2>Qualifications</h2></span>');

                                job.TEXT = HtmlEscape(jobDescription);

                                job.JOB_CATEGORY = category;

                                job.COMPANY_URL = "https://nwl.taleo.net/careersection/10080/jobsearch.ftl";
                                job.JOB_CONTACT_COMPANY = "Newell Rubbermaid";

                                jobMaker.successful.add(job, botScheduleID);
                                counter++;
                            } catch (e) {
                                jobMaker.failed.add(job.JDTID_UNIQUE_NUMBER, e.message);
                                counter++;
                            }
                        }
                    } while (isPresent);
                    try {
                        var HomeElement = await driver.findElements(By.xpath('//*[@class="pagerpanel"]//span[contains(@id,"Next")]/span[@class="pagerlink"]'));
                        var home = await HomeElement.length;
                        if (home) {
                            var nextLink = await driver.findElement(By.xpath('//a[contains(@id,"Next")]'));
                            await nextLink.click();
                            loop = true;
                        }
                    } catch (e) {
                    }
                } while (loop);
            }
            else {
                var subcategoryElement = await driver.findElement(By.xpath('//*[@id="basicSearchInterface.jobfield1L2"]'));
                var optionsArray = await subcategoryElement.findElements(By.tagName('option'));

                for (var j = 1; j <= optionsArray.length; j++) {
                    var options = await driver.findElement(By.xpath('//*[@id="basicSearchInterface.jobfield1L2"]/option[' + j + ']'));
                    var subcategory = await options.getAttribute('text');
                    await options.click();

                    var submitElement = await driver.findElement(By.xpath('//*[@id="basicSearchFooterInterface.searchAction"]'));
                    await submitElement.click();

                    var loop;
                    var pagenumber = 1;
                    do {
                        loop = false;
                        var counter = 1;
                        do {
                            var jobContainer = await driver.findElements(By.xpath("//*[@id='requisitionListInterface.listRequisition']/tbody/tr[@class='ftlcopy ftlrow'][" + counter + ']'));
                            var isPresent = await jobContainer.length;
                            if (isPresent) {
                                try {
                                    var job = jobMaker.create();

                                    var idElement = await driver.findElement(By.xpath("//*[@id='requisitionListInterface.listRequisition']/tbody/tr[@class='ftlcopy ftlrow'][" + counter + "]//div[@class='editablesection']//span[starts-with(@id,'requisitionListInterface.reqContestNumberValue.row')]"));
                                    job.JDTID_UNIQUE_NUMBER = await idElement.getText();

                                    var titleElement = await driver.findElement(By.xpath("//*[@id='requisitionListInterface.listRequisition']/tbody/tr[@class='ftlcopy ftlrow'][" + counter + "]//a[starts-with(@id,'requisitionListInterface.reqTitleLinkAction.row')]"));
                                    job.JOB_TITLE = await titleElement.getText();

                                    var organisationElement = await driver.findElement(By.xpath("//*[@id='requisitionListInterface.listRequisition']/tbody/tr[@class='ftlcopy ftlrow'][" + counter + "]//span[contains(@id,'reqOrganization')]"));
                                    job.JOB_INDUSTRY = await organisationElement.getText();

                                    var relocElement = await driver.findElement(By.xpath("//*[@id='requisitionListInterface.listRequisition']/tbody/tr[@class='ftlcopy ftlrow'][" + counter + "]//div[contains(@class,'morelocation')]"));
                                    job.RELOCATION = await relocElement.getText();

                                    var url = "https://nwl.taleo.net/careersection/10080/jobdetail.ftl?job=" + job.JDTID_UNIQUE_NUMBER;
                                    var applyURL = "https://nwl.taleo.net/careersection/10080/jobapply.ftl?lang=en&job=" + job.JDTID_UNIQUE_NUMBER + "";
                                    job.JOB_APPLY_URL = applyURL;

                                    await driverjobdetails.get(url);

                                    var locElement = await driverjobdetails.findElements(By.xpath("//*[@id='requisitionDescriptionInterface.ID1574.row1']"));
                                    var isLoc = await locElement.length;
                                    if (isLoc) {
                                        var locElement = await driverjobdetails.findElement(By.xpath("//*[@id='requisitionDescriptionInterface.ID1574.row1']"));
                                        var location = await locElement.getText();
                                        if (location) {
                                            if (location.indexOf(',') > 0) {
                                                location = location.split(',');
                                                location = location[0].trim();
                                            }
                                            var loc = location.split("-");
                                            if (loc.length == 3) {
                                                job.JOB_LOCATION_CITY = loc[2];
                                                job.JOB_LOCATION_STATE = loc[1];
                                                job.JOB_LOCATION_COUNTRY = loc[0];
                                            }
                                            else if (loc.length == 4) {
                                                job.JOB_LOCATION_CITY = loc[2] + " " + loc[3];
                                                job.JOB_LOCATION_STATE = loc[1];
                                                job.JOB_LOCATION_COUNTRY = loc[0];
                                            }
                                            else if (loc.length == 2) {
                                                job.JOB_LOCATION_CITY = loc[1];
                                                job.JOB_LOCATION_STATE = loc[1];
                                                job.JOB_LOCATION_COUNTRY = loc[0];
                                            }
                                            else {
                                                job.JOB_LOCATION_COUNTRY = location;
                                            }
                                        }
                                        if (job.JOB_LOCATION_CITY == "Niklaas") {
                                            job.JOB_LOCATION_CITY = "Sint Niklaas";
                                        }
                                    }

                                    var typeElement = await driverjobdetails.findElements(By.xpath("//*[@id='requisitionDescriptionInterface.ID1706.row1']"));
                                    var typeLength = await typeElement.length;
                                    if (typeLength) {
                                        var typeElement = await driverjobdetails.findElement(By.xpath("//*[@id='requisitionDescriptionInterface.ID1706.row1']"));
                                        job.JOB_TYPE = await typeElement.getText();
                                    }

                                    var descElement = await driverjobdetails.findElement(By.xpath("//div[@class='editablesection']"));
                                    var desc = await descElement.getAttribute("innerHTML");
                                    desc = desc.split('<span class="subtitle">Description</span>');
                                    desc = desc[1];
                                    desc = desc.replace('> &nbsp; </div>', '> &nbsp; </div><br>');
                                    desc = desc.replace('> Job Description <', '><b> Job Description</b> <');
                                    desc = desc.replace('> Job Responsibilities: <', '><b> Job Responsibilities: </b><');

                                    var jobDescription = "";
                                    var optionTag = {
                                        'add-remove-tags': ['table', 'thead', 'tbody', 'tr', 'td', 'h1', 'h2'],
                                        'remove-attributes': [],
                                        'remove-tags': []
                                    };

                                    cleanHtml.clean(desc, optionTag, function (html) {
                                        jobDescription = html;
                                    });
                                    jobDescription = jobDescription.replace('<span class="subtitle">Qualifications</span>', '<span class="subtitle"><h2>Qualifications</h2></span>');

                                    job.TEXT = HtmlEscape(jobDescription);

                                    job.JOB_SALARY = subcategory;
                                    if (subcategory == "All") {
                                        job.OTHER_CATEGORIES = subcategory;
                                    } else {
                                        job.OTHER_CATEGORIES = category + "," + subcategory;
                                    }
                                    job.JOB_CATEGORY = category;


                                    job.COMPANY_URL = "https://nwl.taleo.net/careersection/10080/jobsearch.ftl";
                                    job.JOB_CONTACT_COMPANY = "Newell Rubbermaid";

                                    jobMaker.successful.add(job, botScheduleID);
                                    counter++;
                                } catch (e) {
                                    jobMaker.failed.add(job.JDTID_UNIQUE_NUMBER, e.message);
                                    counter++;
                                }
                            }
                        } while (isPresent);
                        try {
                            var HomeElement = await driver.findElements(By.xpath('//*[@class="pagerpanel"]//span[contains(@id,"Next")]/span[@class="pagerlink"]'));
                            var home = await HomeElement.length;
                            if (home) {
                                var nextLink = await driver.findElement(By.xpath('//a[contains(@id,"Next")]'));
                                await nextLink.click();
                                loop = true;
                            }
                        } catch (e) {
                        }
                    } while (loop);
                    var showElementData = await driver.findElements(By.xpath("//input[@id='basicSearchFooterInterface.showCriteriaAction']"));
                    var isElementPresent = await showElementData.length;
                    if (isElementPresent) {
                        var showElement = await driver.findElement(By.xpath("//input[@id='basicSearchFooterInterface.showCriteriaAction']"));
                        await showElement.click();
                        await driver.sleep(1000);
                    }
                }
            }
            var clearElementData = await driver.findElements(By.xpath("//input[@id='basicSearchFooterInterface.clearAction']"));
            var isclearElementPresent = await clearElementData.length;
            if (isclearElementPresent) {
                var clearElement = await driver.findElement(By.xpath("//input[@id='basicSearchFooterInterface.clearAction']"));
                await clearElement.click();
                await driver.sleep(1000);
            }
        }
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
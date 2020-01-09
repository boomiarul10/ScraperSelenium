var Promise = require('promise');
var package = global.createPackage();
var he = require('he');
var cleanHtml = require('clean-html');
var service = package.service;
var resource = package.resource;
var log = resource.constants.log;
var selenium = package.scrape.selenium();
var jobMaker = package.resource.download.variable("job");
jobMaker.setAlertCount(2);
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
        await driver.get('https://nwl.taleo.net/careersection/10020/jobsearch.ftl?lang=en');
        await driver.sleep(3000);
        var jobCountElement = await driver.findElement(By.xpath('//*[@id="requisitionListInterface.ID3744"]'));
        var atsCount = await jobCountElement.getText();
        var jobCount = atsCount.split("(");
        var atsJobCount = jobCount[1].split('jobs');
        var totalCount = atsJobCount[0].trim();
        jobMaker.setatsJobCount(parseInt(totalCount));

        var categoryElement = await driver.findElement(By.xpath('//*[@id="basicSearchInterface.jobfield1L1"]'));
        var categoryOptionArray = await categoryElement.findElements(By.tagName('option'));

        for (var i = 1; i <= categoryOptionArray.length; i++) {

            var optionCate = await driver.findElement(By.xpath('//*[@id="basicSearchInterface.jobfield1L1"]/option[' + i + ']'));
            var category = await optionCate.getText();
            await optionCate.click();
            await driver.sleep(1000);
            var otherCategoriesElement = await driver.findElements(By.xpath('//*[@id="basicSearchInterface.jobfield1L2"][@style="display: inline;"] '));
            var isOtherCategory = await otherCategoriesElement.length;
            if (isOtherCategory) {
                var otherCategoryElement = await driver.findElement(By.xpath('//*[@id="basicSearchInterface.jobfield1L2"][@style="display: inline;"]'));
                var otherCategoryOptionArray = await otherCategoryElement.findElements(By.tagName('option'));

                for (var j = 1; j <= otherCategoryOptionArray.length; j++) {

                    var optionOtherCate = await driver.findElement(By.xpath('//*[@id="basicSearchInterface.jobfield1L2"][@style="display: inline;"]/option[' + j + ']'));
                    var otherCategory = await optionOtherCate.getText();
                    await optionOtherCate.click();
                    await driver.sleep(1000);

                    var searchElement = await driver.findElement(By.xpath('//*[@id="basicSearchFooterInterface.searchAction"]'));
                    await searchElement.click();
                    await driver.sleep(2000);
                    var counter = 1;

                    var jobSearchResultElement = await driver.findElement(By.xpath('//*[@id="requisitionListInterface.ID3744"]')).getText();
                    var jobSearchResult = jobSearchResultElement;
                    if (jobSearchResult.includes('jobs found')) {
                        var searchResultCount = jobSearchResult.split("(");
                        var searchResultValue = searchResultCount[1].split('jobs');
                        var searchCount = searchResultValue[0].trim();
                        if (searchCount > 10) {
                            var jobSizePerPage100Element = await driver.findElement(By.xpath('//*[@id="requisitionListInterface.dropListSize"]/option[2]'));
                            await jobSizePerPage100Element.click();
                            await driver.sleep(2000);

                            var jobSizePerPage100Element = await driver.findElement(By.xpath('//*[@id="requisitionListInterface.dropListSize"]/option[5]'));
                            await jobSizePerPage100Element.click();
                            await driver.sleep(2000);
                        }
                    }

                    do {
                        var jobContainer = await driver.findElements(By.xpath('//*[@id="requisitionListInterface.listRequisition"]/tbody/tr[' + counter + ']'));
                        var isPresent = await jobContainer.length;
                        if (isPresent) {
                            try {
                                var job = jobMaker.create();
                                job.JOB_SALARY = otherCategory;
                                job.JOB_CATEGORY = category;
                                job.OTHER_CATEGORIES = otherCategory;
                                job.JOB_LOCATION_COUNTRY = "Canada";
                                job.COMPANY_URL = 'https://nwl.taleo.net/careersection/10020/jobsearch.ftl?lang=en';
                                job.JOB_CONTACT_COMPANY = 'Newell Rubbermaid';

                                var titleElement = await driver.findElement(By.xpath('//*[@id="requisitionListInterface.listRequisition"]/tbody/tr[' + counter + ']//span[@class="titlelink"]/a'));
                                job.JOB_TITLE = await titleElement.getText();
                                var jobIdElement = await driver.findElement(By.xpath('//*[@id="requisitionListInterface.listRequisition"]/tbody/tr[' + counter + ']//span[contains(@id,"requisitionListInterface.reqContestNumberValue")]'));
                                job.JDTID_UNIQUE_NUMBER = await jobIdElement.getText();
                                var orgElement = await driver.findElement(By.xpath('//*[@id="requisitionListInterface.listRequisition"]/tbody/tr[' + counter + ']//span[contains(@id,"requisitionListInterface.reqOrganization.row")]'));
                                job.JOB_INDUSTRY = await orgElement.getText();
                                var relocationsElement = await driver.findElements(By.xpath('//*[@id="requisitionListInterface.listRequisition"]/tbody/tr[' + counter + ']//span[contains(@title,"Position available in other locations")]'));
                                var isrelocation = await relocationsElement.length;
                                var otherLoc = "";
                                if (isrelocation) {
                                    await driver.findElement(By.xpath('//*[@id="requisitionListInterface.listRequisition"]/tbody/tr[' + counter + ']//span[contains(@title,"Position available in other locations")]/a')).click();
                                    var relocationOtherElement = await driver.findElement(By.xpath('//*[@id="requisitionListInterface.listRequisition"]/tbody/tr[' + counter + ']//span[contains(@title,"Position available in other locations")]'));
                                    otherLoc = await relocationOtherElement.getText();
                                }
                                if (otherLoc) {
                                    var relocationElement = await driver.findElement(By.xpath('//*[@id="requisitionListInterface.listRequisition"]/tbody/tr[' + counter + ']//span[contains(@id,"requisitionListInterface.reqBasicLocation")]'));
                                    job.RELOCATION = await relocationElement.getText();
                                    job.RELOCATION = job.RELOCATION + otherLoc;
                                } else {
                                    var relocationElement = await driver.findElement(By.xpath('//*[@id="requisitionListInterface.listRequisition"]/tbody/tr[' + counter + ']//span[contains(@id,"requisitionListInterface.reqBasicLocation")]'));
                                    job.RELOCATION = await relocationElement.getText();
                                }

                                var url = "https://nwl.taleo.net/careersection/10020/jobdetail.ftl?lang=en&job=" + job.JDTID_UNIQUE_NUMBER;
                                await driverjobdetails.get(url);
                                await driverjobdetails.sleep(1000);
                                var jobdetailspage = await driverjobdetails.findElements(By.xpath('//div[@class="editablesection"]'));
                                var isDetailPage = await jobdetailspage.length;
                                if (isDetailPage) {

                                    var locationElement = await driverjobdetails.findElement(By.xpath('//*[@id="requisitionDescriptionInterface.ID1564.row1"]'));
                                    var location = await locationElement.getText();

                                    job.JOB_APPLY_URL = "https://nwl.taleo.net/careersection/10020/jobapply.ftl?lang=en&job=" + job.JDTID_UNIQUE_NUMBER;
                                    var jobtypeElement = await driverjobdetails.findElements(By.xpath('//*[@id="requisitionDescriptionInterface.ID1692.row1"]'));
                                    var isJobType = await jobtypeElement.length;
                                    if (isJobType) {
                                        var type = await driverjobdetails.findElement(By.xpath('//*[@id="requisitionDescriptionInterface.ID1692.row1"]')).getText();
                                        job.JOB_TYPE = type;
                                    }
                                    var descriptionElement = await driverjobdetails.findElement(By.xpath('//div[@class="editablesection"]'));
                                    var desc1 = await descriptionElement.getAttribute("outerHTML");

                                    var descr = desc1.split('<span class="subtitle">Description</span></div></h2>');
                                    var description = descr[1].
                                        replace(/> &nbsp; <\/div >/g, '> &nbsp; </div><br>').
                                        replace(/> Job Description </g, '><b> Job Description</b> <').
                                        replace(/> Job Responsibilities: </g, '><b> Job Responsibilities: </b><').
                                        replace(/<span class="subtitle">Qualifications<\/span >/g, '<span class="subtitle"><h2>Qualifications</h2></span>');
                                    description = description + '<div><div class="helppanel"><div class="blockhelppanel"><div id="requisitionDescriptionInterface.ID1835" style="DISPLAY: none"></div><div id="requisitionDescriptionInterface.ID1904" style="DISPLAY: none"></div><div id="requisitionDescriptionInterface.ID1973.row1" title="" style="DISPLAY: block"> <span id="requisitionDescriptionInterface.ID2002.row1" class="helplabel" title=""> </span></div></div></div></div> <span class=""> </span>';
                                    var desc = "";
                                    var optionsTag = {
                                        'add-remove-tags': ['h2']
                                    };

                                    cleanHtml.clean(description, optionsTag, function (html) {
                                        desc = html;
                                    });
                                    if (location != null) {
                                        var loc = location.split("-");
                                        if (loc.length == 2) {
                                            job.JOB_LOCATION_CITY = loc[1];
                                            job.JOB_LOCATION_STATE = loc[0];
                                        }
                                        else if (loc.length == 3) {
                                            job.JOB_LOCATION_COUNTRY = loc[0];
                                            job.JOB_LOCATION_STATE = loc[1];
                                            job.JOB_LOCATION_CITY = loc[2];
                                        }
                                        else {
                                            job.JOB_LOCATION_CITY = location;
                                        }
                                    }

                                    job.TEXT = HtmlEscape(desc);
                                    jobMaker.successful.add(job, botScheduleID);
                                }
                                counter = counter + 2;
                            } catch (e) {
                                jobMaker.failed.add(job.JDTID_UNIQUE_NUMBER, e.message);
                                counter = counter + 2;
                            }
                        }
                    } while (isPresent);
                    var showCriteriaElement = await driver.findElement(By.xpath('//*[@id="basicSearchFooterInterface.showCriteriaAction"]'));
                    await showCriteriaElement.click();
                    await driver.sleep(3000);
                }
            }
            else {

                var searchElement = await driver.findElement(By.xpath('//*[@id="basicSearchFooterInterface.searchAction"]'));
                await searchElement.click();
                await driver.sleep(2000);

                var jobSearchResultElement = await driver.findElement(By.xpath('//*[@id="requisitionListInterface.ID3744"]')).getText();
                var jobSearchResult = jobSearchResultElement;
                if (jobSearchResult.includes('jobs found')) {
                    var jobSizePerPage100Element = await driver.findElement(By.xpath('//*[@id="requisitionListInterface.dropListSize"]/option[5]'));
                    await jobSizePerPage100Element.click();
                    await driver.sleep(2000);
                }
                var counter = 1;
                do {
                    var jobContainer = await driver.findElements(By.xpath('//*[@id="requisitionListInterface.listRequisition"]/tbody/tr[' + counter + ']'));
                    var isPresent = await jobContainer.length;
                    if (isPresent) {
                        try {
                            var job = jobMaker.create();
                            job.JOB_CATEGORY = category;
                            job.JOB_LOCATION_COUNTRY = "Canada";
                            job.COMPANY_URL = 'https://nwl.taleo.net/careersection/10020/jobsearch.ftl?lang=en';
                            job.JOB_CONTACT_COMPANY = 'Newell Rubbermaid';

                            var titleElement = await driver.findElement(By.xpath('//*[@id="requisitionListInterface.listRequisition"]/tbody/tr[' + counter + ']//span[@class="titlelink"]/a'));
                            job.JOB_TITLE = await titleElement.getText();
                            var jobIdElement = await driver.findElement(By.xpath('//*[@id="requisitionListInterface.listRequisition"]/tbody/tr[' + counter + ']//span[contains(@id,"requisitionListInterface.reqContestNumberValue")]'));
                            job.JDTID_UNIQUE_NUMBER = await jobIdElement.getText();
                            var orgElement = await driver.findElement(By.xpath('//*[@id="requisitionListInterface.listRequisition"]/tbody/tr[' + counter + ']//span[contains(@id,"requisitionListInterface.reqOrganization.row")]'));
                            job.JOB_INDUSTRY = await orgElement.getText();                            
                            var relocationsElement = await driver.findElements(By.xpath('//*[@id="requisitionListInterface.listRequisition"]/tbody/tr[' + counter + ']//span[contains(@title,"Position available in other locations")]'));
                            var isrelocation = await relocationsElement.length;
                            var otherLoc = "";
                            if (isrelocation) {
                                await driver.findElement(By.xpath('//*[@id="requisitionListInterface.listRequisition"]/tbody/tr[' + counter + ']//span[contains(@title,"Position available in other locations")]/a')).click();
                                var relocationOtherElement = await driver.findElement(By.xpath('//*[@id="requisitionListInterface.listRequisition"]/tbody/tr[' + counter + ']//span[contains(@title,"Position available in other locations")]'));
                                otherLoc = await relocationOtherElement.getText();
                            }
                            if (otherLoc) {
                                var relocationElement = await driver.findElement(By.xpath('//*[@id="requisitionListInterface.listRequisition"]/tbody/tr[' + counter + ']//span[contains(@id,"requisitionListInterface.reqBasicLocation")]'));
                                job.RELOCATION = await relocationElement.getText();
                                job.RELOCATION = job.RELOCATION + otherLoc;
                            } else {
                                var relocationElement = await driver.findElement(By.xpath('//*[@id="requisitionListInterface.listRequisition"]/tbody/tr[' + counter + ']//span[contains(@id,"requisitionListInterface.reqBasicLocation")]'));
                                job.RELOCATION = await relocationElement.getText();
                            }
                            var url = "https://nwl.taleo.net/careersection/10020/jobdetail.ftl?lang=en&job=" + job.JDTID_UNIQUE_NUMBER;
                            await driverjobdetails.get(url);
                            await driverjobdetails.sleep(2000);
                            var jobdetailspage = await driverjobdetails.findElements(By.xpath('//div[@class="editablesection"]'));
                            var isDetailPage = await jobdetailspage.length;
                            if (isDetailPage) {

                                var locationElement = await driverjobdetails.findElement(By.xpath('//*[@id="requisitionDescriptionInterface.ID1564.row1"]'));
                                var location = await locationElement.getText();

                                job.JOB_APPLY_URL = "https://nwl.taleo.net/careersection/10020/jobapply.ftl?lang=en&job=" + job.JDTID_UNIQUE_NUMBER;
                                var jobtypeElement = await driverjobdetails.findElements(By.xpath('//*[@id="requisitionDescriptionInterface.ID1692.row1"]'));
                                var isJobType = await jobtypeElement.length;
                                if (isJobType) {
                                    var type = await driverjobdetails.findElement(By.xpath('//*[@id="requisitionDescriptionInterface.ID1692.row1"]')).getText();
                                    job.JOB_TYPE = type;
                                }

                                var descriptionElement = await driverjobdetails.findElement(By.xpath('//div[@class="editablesection"]'));
                                var desc1 = await descriptionElement.getAttribute("outerHTML");

                                var descr = desc1.split('<span class="subtitle">Description</span></div></h2>');
                                var description = descr[1].
                                    replace(/> &nbsp; <\/div >/g, '> &nbsp; </div><br>').
                                    replace(/> Job Description </g, '><b> Job Description</b> <').
                                    replace(/> Job Responsibilities: </g, '><b> Job Responsibilities: </b><').
                                    replace(/<span class="subtitle">Qualifications<\/span >/g, '<span class="subtitle"><h2>Qualifications</h2></span>');
                                description = description + '<div><div class="helppanel"><div class="blockhelppanel"><div id="requisitionDescriptionInterface.ID1835" style="DISPLAY: none"></div><div id="requisitionDescriptionInterface.ID1904" style="DISPLAY: none"></div><div id="requisitionDescriptionInterface.ID1973.row1" title="" style="DISPLAY: block"> <span id="requisitionDescriptionInterface.ID2002.row1" class="helplabel" title=""> </span></div></div></div></div> <span class=""> </span>';
                                var desc = "";
                                var optionsTag = {
                                    'add-remove-tags': ['h2']
                                };

                                cleanHtml.clean(description, optionsTag, function (html) {
                                    desc = html;
                                });
                                if (location != null) {
                                    var loc = location.split("-");
                                    if (loc.length == 2) {
                                        job.JOB_LOCATION_CITY = loc[1];
                                        job.JOB_LOCATION_STATE = loc[0];
                                    }
                                    else if (loc.length == 3) {
                                        job.JOB_LOCATION_COUNTRY = loc[0];
                                        job.JOB_LOCATION_STATE = loc[1];
                                        job.JOB_LOCATION_CITY = loc[2];
                                    }
                                    else {
                                        job.JOB_LOCATION_CITY = location;
                                    }
                                }

                                job.TEXT = HtmlEscape(desc);
                                jobMaker.successful.add(job, botScheduleID);
                            }
                            counter = counter + 2;
                        } catch (e) {
                            jobMaker.failed.add(job.JDTID_UNIQUE_NUMBER, e.message);
                            counter = counter + 2;
                        }
                    }
                } while (isPresent);

                var showCriteriaElement = await driver.findElement(By.xpath('//*[@id="basicSearchFooterInterface.showCriteriaAction"]'));
                await showCriteriaElement.click();
                await driver.sleep(3000);
            }
        }
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
    description = description.replace(/\s\s+/g, ' ');
    description = description.replace(/\r?\n|\r/g, '');
    description = description.replace(/&#x9;/g, '');
    description = description.replace(/&ensp;+/g, "");
    description = description.replace(/&mldr;+/g, "&hellip;");
    description = description.replace(/&#xfffd;+/g, "")
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

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

        await driver.get('https://citi.taleo.net/careersection/2/jobdetail.ftl?lang=fr');
        var searchLink = await driver.findElement(By.xpath('//*[@id="topNavInterface.advancedSearchTabAction"]'));
        await searchLink.click();

        var jobCountElement = await driver.findElement(By.xpath('//*[@id="requisitionListInterface.searchResultHeaderId"]//span'));
        var atsCount = await jobCountElement.getText();
        var jobCount = atsCount.split(" ");
        var atsJobCount = jobCount[2].trim();
        jobMaker.setatsJobCount(parseInt(atsJobCount));

        var categoryElement = await driver.findElement(By.xpath('//*[@id="advancedSearchInterface.jobfield1L1"]'));
        var optionArray = await categoryElement.findElements(By.tagName('option'));

        for (var i = 2; i <= optionArray.length; i++) {
            var option = await driver.findElement(By.xpath('//*[@id="advancedSearchInterface.jobfield1L1"]/option[' + i + ']'));
            var category = await option.getAttribute('text');
            await option.click();
            var submitElement = await driver.findElement(By.xpath('//*[@id="advancedSearchFooterInterface.searchAction"]'));
            await submitElement.click();

            var loop;
            do {
                loop = false;
                var counter = 1;
                do {
                    var jobContainer = await driver.findElements(By.xpath('//*[@id="requisitionListInterface.listRequisition"]/tbody/tr[@class="ftlcopy ftlrow"][' + counter + ']'));
                    var isPresent = await jobContainer.length;
                    if (isPresent) {
                        try {
                            var job = jobMaker.create();

                            var titleElement = await driver.findElement(By.xpath('//*[@id="requisitionListInterface.listRequisition"]/tbody/tr[@class="ftlcopy ftlrow"][' + counter + ']//span[@class="titlelink"]/a'));
                            var title = await titleElement.getText();
                            var jobIdElement = await driver.findElement(By.xpath('//*[@id="requisitionListInterface.listRequisition"]/tbody/tr[@class="ftlcopy ftlrow"][' + counter + ']//span[contains(@id,"requisitionListInterface.reqContestNumberValue")]'));
                            job.JDTID_UNIQUE_NUMBER = await jobIdElement.getText();

                            var url = "https://citi.taleo.net/careersection/2/jobdetail.ftl?lang=fr&job=" + job.JDTID_UNIQUE_NUMBER;
                            job.JOB_APPLY_URL = url;

                            await driverjobdetails.get(url);
                            var locationElement = await driverjobdetails.findElement(By.xpath('//*[@id="requisitionListInterface.listRequisition"]/tbody/tr[@class="ftlcopy ftlrow"][' + counter + ']//span[contains(@id,"requisitionListInterface.reqBasicLocation")]'));
                            var location = await locationElement.getText();
                            var typeElement = await driverjobdetails.findElement(By.xpath('//*[@id="requisitionDescriptionInterface.ID1948.row1"]'));
                            job.JOB_TYPE = await typeElement.getText();
                            job.JOB_STATUS = job.JOB_TYPE;

                            var qualificationElement = await driverjobdetails.findElements(By.xpath('//*[@id="requisitionDescriptionInterface.ID1898.row1"]'));
                            var qualificationLength = await qualificationElement.length;
                            if (qualificationLength) {
                                var qualificationElement = await driverjobdetails.findElement(By.xpath('//*[@id="requisitionDescriptionInterface.ID1898.row1"]'));
                                job.QUALIFICATIONS = await qualificationElement.getText();
                            }

                            var descriptionElement = await driverjobdetails.findElement(By.xpath('//div[@class="editablesection"]'));
                            var desc = await descriptionElement.getAttribute("innerHTML");                            
                            desc = desc.split('<div id="requisitionDescriptionInterface.ID1755');
                            var description = desc[0];
                            description = description.replace('Description', 'Description<br>')
                                .replace('<div class="staticcontentlinepanel"><p></p></div>', '');

                            job.JOB_TITLE = title;
                            job.JOB_CATEGORY = category;
                            var jobDescription = "";
                            var optionTag = {
                                'add-remove-tags': ['span']
                            };

                            cleanHtml.clean(description, optionTag, function (html) {
                                jobDescription = html;
                            });
                            job.TEXT = HtmlEscape(jobDescription);

                            if (location) {
                                var loc = location.split("-");
                                if (loc.length == 3) {
                                    job.JOB_LOCATION_CITY = loc[2];
                                    job.JOB_LOCATION_STATE = loc[1];
                                    job.JOB_LOCATION_COUNTRY = loc[0];
                                    job.JOB_LOCATION_COUNTRY = job.JOB_LOCATION_COUNTRY.replace('CAN', 'CA');
                                }
                                else if (loc.length == 4) {
                                    job.JOB_LOCATION_CITY = loc[3];
                                    job.JOB_LOCATION_STATE = loc[2];
                                    var country = loc[0] + '-' + loc[1];
                                    country = country.replace('CAN', 'CA');
                                    job.JOB_LOCATION_COUNTRY = country;
                                }
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
                    var pagerLink = await driver.findElements(By.xpath('//*[@class="pagerpanel"][contains(@style,"display: block")]'));
                    var pager = await pagerLink.length;
                    if (pager) {
                        var HomeElement = await driver.findElements(By.xpath('//*[@id="requisitionListInterface.pagerDivID4591.panel.Next"]/span[@class="pagerlink"]'));
                        var home = await HomeElement.length;
                        if (home) {
                            var nextLink = await driver.findElement(By.xpath('//*[@id="requisitionListInterface.pagerDivID4591.Next"]'));
                            await nextLink.click();
                            loop = true;
                        }
                    }
                } catch (e) {
                    var ex = e.message;
                }
            } while (loop);
            var clearElementData = await driver.findElements(By.xpath("//input[@id='advancedSearchFooterInterface.clearAction']"));
            var isclearElementPresent = await clearElementData.length;
            if (isclearElementPresent) {
                var clearElement = await driver.findElement(By.xpath("//input[@id='advancedSearchFooterInterface.clearAction']"));
                await clearElement.click();
                await driver.sleep(1000);
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

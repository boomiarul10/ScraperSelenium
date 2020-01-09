var Promise = require('promise');
var package = global.createPackage();
var cleanHtml = require('clean-html');
var moment = require('moment');
var he = require('he');
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

        await driver.get('https://sanofi.wd3.myworkdayjobs.com/SanofiCareers');
        await driver.sleep(8000);

        var locationSearchElement = await driver.findElement(By.xpath('//*[@id="wd-Facet-Location_Country-wd-FieldSet"]//div[@data-automation-id="wd-MoreLink"]'));
        await locationSearchElement.click();
        await driver.sleep(5000);

        var locationCountryOption = await driver.findElements(By.xpath('//*[@id="wd-Facet-Location_Country"]/div/div[2]/div/div'));
        var count = 0;
        var locationOptionIndex = [];
        for (var m = 0; m < locationCountryOption.length - 1; m++) {
            var locationOptionID = await locationCountryOption[m].getAttribute("id");
            var locationCountryElement = await driver.findElement(By.xpath('//*[@id="' + locationOptionID + '"]/div/div/label'));
            var country = await locationCountryElement.getText();
            if (country == "United States of America" || country == "Canada") {
                var jobcountElement = await driver.findElement(By.xpath('//*[@id="' + locationOptionID + '"]//span'));
                var jobcountText = await jobcountElement.getText();
                count = count + parseInt(jobcountText.replace("(", "").replace(")", ""));
                locationOptionIndex.push(locationOptionID);
            }
        }
        jobMaker.setatsJobCount(parseInt(count));
        for (var i = 0; i < locationOptionIndex.length; i++) {

            var locationCountryElement = await driver.findElement(By.xpath('//*[@id="' + locationOptionIndex[i] + '"]/div/div/label'));
            var country = await locationCountryElement.getText();

            var optionCountry = await driver.findElement(By.xpath('//*[@id="' + locationOptionIndex[i] + '"]/div/div/div'));
            await optionCountry.click();
            await driver.sleep(2000);

            var searchCategoryElement = await driver.findElement(By.xpath('//*[@id="wd-Facet-JobFamilyGroup-wd-FieldSet"]//div[@data-automation-id="wd-MoreLink"]'));
            await searchCategoryElement.click();

            var categoryOptionIndex = [];
            var categoryOption = await driver.findElements(By.xpath('//*[@id="wd-Facet-JobFamilyGroup-wd-FieldSet"]/div[2]/div/div'));
            for (var n = 0; n < categoryOption.length - 1; n++) {
                var categoryOptionID = await categoryOption[n].getAttribute("id");
                categoryOptionIndex.push(categoryOptionID);
            }

            for (var j = 0; j < categoryOptionIndex.length; j++) {
                var categoryElement = await driver.findElement(By.xpath('//*[@id="' + categoryOptionIndex[j] + '"]/div/div'));
                var category = await categoryElement.getText();

                var option = await driver.findElement(By.xpath('//*[@id="' + categoryOptionIndex[j] + '"]/div/div/div'));
                await option.click();
                await driver.sleep(2000);

                var jobCountElement = await driver.wait(until.elementLocated(By.xpath('//*[@id="wd-FacetedSearchResultList-PaginationText-facetSearchResultList.newFacetSearch.Report_Entry"]')), 5000);
                var atsCount = await jobCountElement.getText();
                var atsJobCount = atsCount.split("Results");

                var jobcount = parseInt(atsJobCount[0]);
                var modpages = jobcount % 50;
                var pages = jobcount / 50;
                if (modpages > 0)
                    pages = pages + 1;

                for (var l = 1; l <= pages; l++) {
                    var element = await driver.findElement(By.xpath("//*[@id='workdayApplicationFrame']/div[1]/div[3]/footer"));
                    await driver.actions().mouseMove(element).perform();
                    await driver.sleep(10000);
                }

                var parent = await driver.getWindowHandle();
                var counter = 1;
                loop = false;
                for (var k = 0; k < jobcount; k++) {
                    var jobContainer = await driver.findElements(By.xpath('//*[@id="wd-FacetedSearchResultList-facetSearchResultList.newFacetSearch.Report_Entry"]/div[2]/ul/li[' + counter + ']'));
                    var isPresent = await jobContainer.length;
                    if (isPresent) {
                        try {
                            var job = jobMaker.create();

                            if (category.includes("-")) {
                                var categoryArray = category.split('-');
                                job.JOB_CATEGORY = categoryArray[0].trim();
                            }
                            else {
                                job.JOB_CATEGORY = category;
                            }
                            job.JOB_LOCATION_COUNTRY = country;
                            var titleElement = await driver.findElement(By.xpath('//*[@id="wd-FacetedSearchResultList-facetSearchResultList.newFacetSearch.Report_Entry"]/div[2]/ul/li[' + counter + ']/div/div/div/ul/li/div/div/div/div'));
                            job.JOB_TITLE = await titleElement.getText();

                            await driver.actions().keyDown(webdriver.Key.CONTROL).click(titleElement, webdriver.Button.RIGHT).keyUp(webdriver.Key.CONTROL).perform();
                            var windows = await driver.getAllWindowHandles();
                            await driver.switchTo().window(windows[1]);
                            await driver.sleep(4000);

                            var locationsElement = await driver.findElements(By.xpath('//div[contains(@aria-labelledby,"LOCATION")]'));
                            var locations = await locationsElement.length;
                            job.TRAVEl = "";
                            if (locations) {
                                for (var locationIndex = 0; locationIndex < locations; locationIndex++) {
                                    var locationvalue = await locationsElement[locationIndex].getText();
                                    if (locationIndex + 1 == locations) {
                                        var loc = locationvalue.split(",");
                                        if (loc.length > 1) {
                                            job.JOB_LOCATION_CITY = loc[0];
                                            job.JOB_LOCATION_STATE = loc[1];
                                        }
                                        else
                                            job.JOB_LOCATION_CITY = loc[0];
                                    }
                                    if (job.TRAVEl == "") {
                                        job.TRAVEl = locationvalue;
                                    }
                                    else {
                                        job.TRAVEl = job.TRAVEl + ";" + locationvalue;
                                    }
                                }
                            }

                            var dateElement = await driver.findElement(By.xpath('//div[contains(@aria-labelledby,"labeledImage.POSTED_DATE")]'));
                            var date = await dateElement.getText();


                            var jobType = await driver.findElement(By.xpath('//div[contains(@aria-labelledby,"labeledImage.JOB_TYPE")]'));
                            job.JOB_TYPE = await jobType.getText();



                            var idElement = await driver.findElement(By.xpath('//div[contains(@aria-labelledby,"labeledImage.JOB_REQ")]'));
                            job.JDTID_UNIQUE_NUMBER = await idElement.getText();

                            if (date) {
                                if (date.includes("Posted")) {
                                    var dateString = date.replace("Posted", "").replace("Days Ago", "").replace("+", "").trim();

                                    if (dateString == "Yesterday") {
                                        job.ASSIGNMENT_START_DATE = moment().format('M/D/YYYY');
                                    }
                                    else if (dateString == "Today") {
                                        job.ASSIGNMENT_START_DATE = moment().locale('en').add(-1, 'd').format('M/D/YYYY');
                                    }
                                    else {
                                        var days = parseInt(dateString);
                                        job.ASSIGNMENT_START_DATE = moment().locale('en').add(-days, 'd').format('M/D/YYYY');
                                    }
                                }
                            }

                            var jobDescription = await driver.findElement(By.xpath('//div[contains(@aria-labelledby,"richTextArea.jobPosting.jobDescription")]'));
                            var description = await jobDescription.getAttribute("outerHTML");

                            job.TEXT = HtmlEscape(description);

                            job.JOB_APPLY_URL = await driver.getCurrentUrl();

                            jobMaker.successful.add(job, botScheduleID);
                            await driver.close();
                            await driver.switchTo().window(parent);
                            var jobcountclickElement = driver.findElement(By.xpath('//*[@id="wd-FacetedSearchResultList-PaginationText-facetSearchResultList.newFacetSearch.Report_Entry"]'));
                            await jobcountclickElement.click();
                            counter++;
                        } catch (e) {
                            jobMaker.failed.add(job.JDTID_UNIQUE_NUMBER, e.message);
                            counter++;
                            await driver.close();
                            await driver.switchTo().window(parent);
                        }
                    }
                }

                var option = await driver.findElement(By.xpath('//*[@id="' + categoryOptionIndex[j] + '"]/div/div/div'));
                await option.click();
                await driver.sleep(2000);
            }
            var optionCountry = await driver.findElement(By.xpath('//*[@id="' + locationOptionIndex[i] + '"]/div/div/div'));
            await optionCountry.click();
            await driver.sleep(2000);
        }
        await driver.quit();
        snippet(configuration, jobMaker.atsJobCount, jobMaker.failedJobs.length, jobMaker, onsuccess, onfailure);
    } catch (e) {
        await driver.quit();
        var output = package.service.bot.createBotErrorOutput(configuration.scheduleid, jobMaker.jobs.length, jobMaker.atsJobCount, jobMaker.failedJobs.length, e);
        onfailure(output);
    }
}

function HtmlEscape(description) {
    description = he.encode(description, { 'useNamedReferences': true, 'decimal': true, 'allowUnsafeSymbols': true });
    description = description.replace(/&#9;/g, ' ');
    description = description.replace(/\s\s+/g, ' ');
    description = description.replace(/\r?\n|\r/g, '');
    return description;
}

var snippet = async (configuration, atsJobCount, failedJobCount, jobs, onsuccess, onfailure) => {
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

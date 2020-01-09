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
        var cateCounter = 1;
        var cateJobCountVal = undefined;

        await driver.get('https://sanofi.wd3.myworkdayjobs.com/StudentPrograms?clientRequestID=3d842556e12245fcac9afcd8d5d432c7');
        await driver.sleep(8000);

        var atsJobCount = await driver.wait(until.elementLocated(By.xpath("//*[@id='wd-FacetedSearchResultList-PaginationText-facetSearchResultList.newFacetSearch.Report_Entry']")), 4000);
        var atscount = await atsJobCount.getText();
        var record = atscount.split("Results");
        jobMaker.setatsJobCount(parseInt(record[0].trim()));

        var cateMoreData = await driver.findElements(By.xpath('//*[@id="wd-Facet-JobFamilyGroup-wd-FieldSet"]//div[@data-automation-id="wd-MoreLink"]'));
        var isMoreCateLinkPresent = await cateMoreData.length;
        if (isMoreCateLinkPresent) {
            var catMoreElement = await driver.findElement(By.xpath('//*[@id="wd-Facet-JobFamilyGroup-wd-FieldSet"]//div[@data-automation-id="wd-MoreLink"]'));
            await catMoreElement.click();
            await driver.sleep(2000);
        }

        var locMoreData = await driver.findElements(By.xpath('//*[@id="wd-Facet-Location_Country-wd-FieldSet"]//div[@data-automation-id="wd-MoreLink"]'));
        var isMoreLocLinkPresent = await locMoreData.length;
        if (isMoreLocLinkPresent) {
            var locMoreElement = await driver.findElement(By.xpath('//*[@id="wd-Facet-Location_Country-wd-FieldSet"]//div[@data-automation-id="wd-MoreLink"]'));
            await locMoreElement.click();
            await driver.sleep(2000);
        }

        var jobLocContainer1 = await driver.findElements(By.xpath("//div[@id='wd-Facet-Location_Country']/div/div/div/div//label[contains(@id, 'wd-FacetValue-CheckBox')]"));
        var isJobLocPresent1 = await jobLocContainer1.length;

        if (isJobLocPresent1) {
            var locElemId = new Array();
            for (var k = 0; k < jobLocContainer1.length; k++) {
                var locIdData = await jobLocContainer1[k].getAttribute('id');
                locElemId.push(locIdData);
            }

            for (var l = 0; l < locElemId.length; l++) {
                var locationData = await driver.findElement(By.id(locElemId[l])).getText();                

                if (locationData.toLowerCase() == "united states of america" || locationData.toLowerCase() == "canada") {

                    await driver.findElement(By.id(locElemId[l])).click();
                    await driver.sleep(4000);

                    var jobCateContainer1 = await driver.findElements(By.xpath("//div[@id='wd-Facet-JobFamilyGroup']/div/div/div/div//label[contains(@id, 'wd-FacetValue-CheckBox')]"));
                    var isJobCatePresent1 = await jobCateContainer1.length;

                    if (isJobCatePresent1) {
                        var cateElemId = new Array();
                        for (var i = 0; i < jobCateContainer1.length; i++) {
                            var idData = await jobCateContainer1[i].getAttribute('id');
                            cateElemId.push(idData);
                        }

                        for (var j = 0; j < cateElemId.length; j++) {
                            await driver.findElement(By.id(cateElemId[j])).click();
                            await driver.sleep(4000);
                            var jobCate = await driver.findElement(By.id(cateElemId[j])).getText();

                            var cateJobCountElem = await driver.wait(until.elementLocated(By.xpath("//*[@id='wd-FacetedSearchResultList-PaginationText-facetSearchResultList.newFacetSearch.Report_Entry']")), 4000);
                            var cateJobCountData = await cateJobCountElem.getText();
                            cateJobCountVal = cateJobCountData.split("Results");
                            if (cateJobCountVal) {
                                var cateJobCount = parseInt(cateJobCountVal[0].trim());
                                var modpages = cateJobCount % 50;
                                var pages = cateJobCount / 50;
                                if (modpages > 0)
                                    pages = pages + 1;

                                for (var y = 1; y <= pages; y++) {
                                    var element = await driver.findElement(By.xpath("//*[@id='workdayApplicationFrame']/div[1]/div[3]/footer"));
                                    await driver.actions().mouseMove(element).perform();
                                    await driver.sleep(10000);
                                }
                            }

                            var parent = await driver.getWindowHandle();
                            var counter = 1;
                            loop = false;
                            for (var k = 0; k < cateJobCount; k++) {
                                var jobContainer = await driver.findElements(By.xpath('//*[@id="wd-FacetedSearchResultList-facetSearchResultList.newFacetSearch.Report_Entry"]/div[2]/ul/li[' + counter + ']'));
                                var isPresent = await jobContainer.length;
                                if (isPresent) {
                                    try {
                                        var job = jobMaker.create();

                                        var titleElement = await driver.findElement(By.xpath('//*[@id="wd-FacetedSearchResultList-facetSearchResultList.newFacetSearch.Report_Entry"]/div[2]/ul/li[' + counter + ']/div/div/div/ul/li/div/div/div/div'));
                                        job.JOB_TITLE = await titleElement.getText();

                                        await driver.actions().keyDown(webdriver.Key.CONTROL).click(titleElement, webdriver.Button.RIGHT).keyUp(webdriver.Key.CONTROL).perform();
                                        var windows = await driver.getAllWindowHandles();
                                        await driver.switchTo().window(windows[1]);
                                        await driver.sleep(4000);

                                        var jobType = await driver.findElement(By.xpath('//div[contains(@aria-labelledby,"labeledImage.JOB_TYPE")]'));
                                        job.JOB_TYPE = await jobType.getText();

                                        job.JOB_APPLY_URL = await driver.getCurrentUrl();

                                        job.JOB_APPLY_URL = job.JOB_APPLY_URL.replace("?clientRequestID=3d842556e12245fcac9afcd8d5d432c7", "");

                                        var locCounter = 1;
                                        var newLocation = "";

                                        do {
                                            var locationsElement = await driver.findElements(By.xpath("//div/div/div//div/div/div/div/div/div/div/div/div/div/div[@id='wd-PageContent-vbox']/div/ul[.//div[@data-automation-id='LOCATION_charm']]/li[" + locCounter +"]"));
                                            var locations = await locationsElement.length;
                                            if (locations) {
                                                var locationElem = await driver.findElement(By.xpath("//div/div/div//div/div/div/div/div/div/div/div/div/div/div[@id='wd-PageContent-vbox']/div/ul[.//div[@data-automation-id='LOCATION_charm']]/li[" + locCounter +"]"));
                                                var location = await locationElem.getText();

                                                if (location != "") {
                                                    if (newLocation == "") {
                                                        newLocation = location;
                                                    } else {
                                                        newLocation = newLocation + ";" + location;
                                                    }
                                                } 
                                            }
                                            locCounter++;

                                        } while (locations)

                                        if (newLocation.includes(";")) {

                                            job.TRAVEL = newLocation;
                                            var multiLoc = newLocation.split(";");
                                            var loc = multiLoc[0].split(",");
                                            if (loc.length > 1) {
                                                job.JOB_LOCATION_CITY = loc[0];
                                                job.JOB_LOCATION_STATE = loc[1];
                                            }
                                            else {
                                                job.JOB_LOCATION_CITY = loc[0];
                                            }
                                        } else {

                                            var loc = newLocation.split(",");
                                            if (loc.length > 1) {
                                                job.JOB_LOCATION_CITY = loc[0];
                                                job.JOB_LOCATION_STATE = loc[1];
                                            }
                                            else {
                                                job.JOB_LOCATION_CITY = loc[0];
                                            }
                                        }

                                        var idElement = await driver.findElement(By.xpath('//div[contains(@aria-labelledby,"labeledImage.JOB_REQ")]'));
                                        job.JDTID_UNIQUE_NUMBER = await idElement.getText();

                                        var idElement = await driver.findElement(By.xpath('//div[contains(@aria-labelledby,"labeledImage.POSTED_DATE")]'));
                                        var postedDate = await idElement.getText();

                                        if (postedDate) {
                                            if (postedDate.includes("Posted")) {
                                                var dateString = postedDate.replace("Posted", "").replace("Days Ago", "").replace("+", "").trim();

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
                                        
                                        job.JOB_LOCATION_COUNTRY = locationData;

                                        var jobDescription = await driver.findElement(By.xpath('//div[contains(@aria-labelledby,"richTextArea.jobPosting.jobDescription")]'));
                                        var description = await jobDescription.getAttribute("outerHTML");
                                        if (jobCate) {
                                            if (jobCate.includes("-")) {
                                                job.JOB_CATEGORY = jobCate.split("-")[0].trim();
                                            } else {
                                                job.JOB_CATEGORY = jobCate;
                                            }
                                        }

                                        job.TEXT = HtmlEscape(description);

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

                            await driver.findElement(By.id(cateElemId[j])).click();
                            await driver.sleep(4000);
                        }
                    }

                    await driver.findElement(By.id(locElemId[l])).click();
                    await driver.sleep(4000);
                }

            }
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

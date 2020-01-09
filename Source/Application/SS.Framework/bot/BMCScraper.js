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

        await driver.get('https://bmc.wd1.myworkdayjobs.com/BMC');
        await driver.sleep(8000);

        var atsJobCount = await driver.wait(until.elementLocated(By.xpath("//*[@id='wd-FacetedSearchResultList-PaginationText-facetSearchResultList.jobProfile.data']")), 10000);
        var atscount = await atsJobCount.getText();
        var record = atscount.split("Results");
        jobMaker.setatsJobCount(parseInt(record[0].trim()));

        var moreData = await driver.findElements(By.xpath('//*[@id="wd-Facet-jobFamilyGroup-wd-FieldSet"]//div[@data-automation-id="wd-MoreLink"]'));
        var isMoreCateLinkPresent = await moreData.length;
        if (isMoreCateLinkPresent) {
            var catMoreElement = await driver.findElement(By.xpath('//*[@id="wd-Facet-jobFamilyGroup-wd-FieldSet"]//div[@data-automation-id="wd-MoreLink"]'));
            await catMoreElement.click();
            await driver.sleep(2000);
        }

        do {
            var jobCateContainer = await driver.findElements(By.xpath("//div[@id='wd-Facet-jobFamilyGroup']/div/div[2]/div/div[" + cateCounter + "]/div/div"));
            var isJobCatePresent = await jobCateContainer.length;
            if (isJobCatePresent) {
                try {
                    await driver.findElement(By.xpath("//div[@id='wd-Facet-jobFamilyGroup']/div/div[2]/div/div[" + cateCounter + "]/div/div")).click();
                    await driver.sleep(3000);
                    var jobCate = await driver.findElement(By.xpath("//div[@id='wd-Facet-jobFamilyGroup']/div/div[2]/div/div[" + cateCounter + "]/div/div/label")).getText();

                    var cateJobCountElem = await driver.wait(until.elementLocated(By.xpath("//*[@id='wd-FacetedSearchResultList-PaginationText-facetSearchResultList.jobProfile.data']")), 10000);
                    var cateJobCountData = await cateJobCountElem.getText();
                    cateJobCountVal = cateJobCountData.split("Results");
                    if (cateJobCountVal) {
                        var cateJobCount = parseInt(cateJobCountVal[0].trim());
                        var modpages = cateJobCount % 50;
                        var pages = cateJobCount / 50;
                        if (modpages > 0)
                            pages = pages + 1;

                        for (var l = 1; l <= pages; l++) {
                            var element = await driver.findElement(By.xpath("//*[@id='workdayApplicationFrame']/div[1]/div[3]/footer"));
                            await driver.actions().mouseMove(element).perform();
                            await driver.sleep(10000);
                        }
                    }

                    var parent = await driver.getWindowHandle();
                    var counter = 1;
                    loop = false;
                    for (var k = 0; k < cateJobCount; k++) {
                        var jobContainer = await driver.findElements(By.xpath('//*[@id="wd-FacetedSearchResultList-facetSearchResultList.jobProfile.data"]/div[2]/ul/li[' + counter + ']'));
                        var isPresent = await jobContainer.length;
                        if (isPresent) {
                            try {
                                var job = jobMaker.create();

                                var titleElement = await driver.findElement(By.xpath('//*[@id="wd-FacetedSearchResultList-facetSearchResultList.jobProfile.data"]/div[2]/ul/li[' + counter + ']/div/div/div/ul/li/div/div/div/div'));
                                job.JOB_TITLE = await titleElement.getText();

                                await driver.actions().keyDown(webdriver.Key.CONTROL).click(titleElement, webdriver.Button.RIGHT).keyUp(webdriver.Key.CONTROL).perform();
                                var windows = await driver.getAllWindowHandles();
                                await driver.switchTo().window(windows[1]);
                                await driver.sleep(4000);

                                var jobType = await driver.findElement(By.xpath('//div[contains(@aria-labelledby,"labeledImage.JOB_TYPE")]'));
                                job.JOB_TYPE = await jobType.getText();

                                job.JOB_APPLY_URL = await driver.getCurrentUrl();

                                var locationsElement = await driver.findElements(By.xpath("//div[contains(@aria-labelledby,'labeledImage.LOCATION')]"));
                                var locations = await locationsElement.length;
                                if (locations) {
                                    var locationElem = await driver.findElement(By.xpath("//div[contains(@aria-labelledby,'labeledImage.LOCATION')]"));
                                    var location = await locationElem.getText();
                                }

                                var idElement = await driver.findElement(By.xpath('//div[contains(@aria-labelledby,"labeledImage.JOB_REQ")]'));
                                job.JDTID_UNIQUE_NUMBER = await idElement.getText();

                                job.JOB_LOCATION_COUNTRY = "US";
                                job.JOB_LOCATION_STATE = "MA";
                                if (location=="41 Teed Drive") {
                                    job.JOB_LOCATION_CITY = "Randolph";
                                } else {
                                    job.JOB_LOCATION_CITY = "Boston";
                                }

                                var jobDescription = await driver.findElement(By.xpath('//div[contains(@aria-labelledby,"richTextArea.jobPosting.jobDescription")]/div[2]'));
                                var description = await jobDescription.getAttribute("innerHTML");
                                job.JOB_CATEGORY = jobCate;

                                job.TEXT = HtmlEscape(description);

                                jobMaker.successful.add(job, botScheduleID);
                                await driver.close();
                                await driver.switchTo().window(parent);
                                var jobcountclickElement = driver.findElement(By.xpath('//*[@id="wd-FacetedSearchResultList-PaginationText-facetSearchResultList.jobProfile.data"]'));
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

                    await driver.findElement(By.xpath("//div[@id='wd-Facet-jobFamilyGroup']/div/div[2]/div/div[" + cateCounter + "]/div/div")).click();
                    await driver.sleep(3000);
                    cateCounter++;
                } catch (e) {
                    await driver.findElement(By.xpath("//div[@id='wd-Facet-jobFamilyGroup']/div/div[2]/div/div[" + cateCounter + "]/div/div")).click();
                    await driver.sleep(3000);
                    cateCounter++;
                }
            }

        } while (isJobCatePresent)
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

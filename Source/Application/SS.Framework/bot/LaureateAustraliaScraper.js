var Promise = require('promise');
var package = global.createPackage();
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

        await driver.get('http://www.think.edu.au/about-us/careers#jobs');
        var jobArray = await driver.findElements(By.xpath('.//div[@class="ja-job-list"]//div[starts-with(@class, "job")]'));
        var perPageRecord = jobArray.length;
        driver.sleep(2000);
        var lastPageElemData = await driver.findElement(By.xpath('//div[@class="ja-pager"]/a[@class="page"][last()]'));
        var lastPageData = await lastPageElemData.getText();
        lastPageData = lastPageData.trim();
        var lastPageNumber = parseInt(lastPageData);
        lastPageNumber = lastPageNumber;
        //console.log(lastPageNumber);
        //console.log(perPageRecord);
        //console.log(lastPageRecord);
        await lastPageElemData.click();
        driver.sleep(2000);
        var lastPageJobArray = await driver.findElements(By.xpath('.//div[@class="ja-job-list"]//div[starts-with(@class, "job")]'));
        var lastPageRecord = lastPageJobArray.length;
        var atsJobCount = (perPageRecord * (lastPageNumber -1 )) + lastPageRecord;
        jobMaker.setatsJobCount(atsJobCount);
        console.log(atsJobCount);

        await driver.get('http://www.think.edu.au/about-us/careers#jobs');
        var categoryElement = await driver.findElement(By.xpath('.//div[@class="ja-form"]/div/div//select'));
        var optionArray = await categoryElement.findElements(By.tagName('option'));

        for (var i = 2; i <= optionArray.length; i++) {
            var option = await driver.findElement(By.xpath('.//div[@class="ja-form"]/div/div//select/Option[' + i + ']'));
            var optionValue = await option.getAttribute('text');
            await option.click();
            driver.sleep(2000);

            var searchelement = await driver.findElement(By.xpath('//div[@class="ja-submit"]/input'));
            await searchelement.click();
            driver.sleep(2000);

            var pagenumber = 1;
            do {
                loop = false;
                var counter = 1;
                do {
                    //await driver.wait(until.elementLocated(By.xpath(".//div[@class='ja-job-list']//div[starts-with(@class, 'job')][" + counter + "]/h2/a")), 4000);
                    var jobContainer = await driver.findElements(By.xpath(".//div[@class='ja-job-list']//div[starts-with(@class, 'job')][" + counter + "]/h2/a"));
                    var isPresent = await jobContainer.length;
                    if (isPresent) {
                        try {
                            var job = jobMaker.create();

                            var titleElement = await driver.findElement(By.xpath(".//div[@class='ja-job-list']//div[starts-with(@class, 'job')][" + counter + "]/h2/a"));
                            if (titleElement != null) {
                                job.JOB_TITLE = await titleElement.getText();
                            }

                            var dateElement = await driver.findElement(By.xpath("//div[@class='ja-job-list']//div[starts-with(@class, 'job')][" + counter + "]/div/p[@class='date-posted']"));
                            if (dateElement != null) {
                                job.ASSIGNMENT_START_DATE = await dateElement.getText();
                            }

                            await titleElement.click();

                            await driver.wait(until.elementLocated(By.xpath("//div[@class='ja-job-details']/div/ul[@class='classifications']/li[@data-id='18134']")), 2000);

                            var industryElement = await driver.findElement(By.xpath("//div[@class='ja-job-details']/div/ul[@class='classifications']/li[@data-id='18134']"));
                            if (industryElement != null) {
                                job.JOB_INDUSTRY = await industryElement.getText();
                            }

                            var cityElement = await driver.findElement(By.xpath("//div[@class='ja-job-details']/div/ul[@class='classifications']/li[@data-id='10359']"));
                            if (cityElement != null) {
                                job.JOB_LOCATION_CITY = await cityElement.getText();
                            }

                            var jobtypeElement = await driver.findElement(By.xpath("//div[@class='ja-job-details']/div/ul[@class='classifications']/li[@data-id='10360']"));
                            if (jobtypeElement != null) {
                                job.JOB_TYPE = await jobtypeElement.getText();
                            }

                            var stateElement = await driver.findElement(By.xpath("//div[@class='ja-job-details']/div/ul[@class='classifications']/li[@data-id='10358']"));
                            if (stateElement != null) {
                                job.JOB_LOCATION_STATE = await stateElement.getText();
                            }

                            var countryElement = await driver.findElement(By.xpath("//div[@class='ja-job-details']/div/ul[@class='classifications']/li[@data-id='18136']"));
                            if (countryElement != null) {
                                job.JOB_LOCATION_COUNTRY = await countryElement.getText();
                            }

                            var descriptionElement = await driver.findElement(By.xpath("//div[@class='ja-job-details']/div[@class='description']"));
                            if (descriptionElement != null) {
                                desc = await descriptionElement.getAttribute("outerHTML");
                            }

                            var urlElement = await driver.findElement(By.xpath("//div[@class='ja-job-details']/div[@class='apply']/input"));
                            if (urlElement != null) {
                                var url = await urlElement.getAttribute("data-apply-url");
                                job.JOB_APPLY_URL = url;
                                var applyUrl = url.split('/');
                                jobid = applyUrl[4];
                                job.JDTID_UNIQUE_NUMBER = jobid;
                            }


                            if (desc != null) {
                                job.TEXT = HtmlEscape(desc);
                                //job.TEXT = desc;
                            }

                            job.JOB_CATEGORY = optionValue;

                            var backtoResultElement = await driver.findElement(By.xpath("//div[@class='ja-job-details']/div[@class='apply']/a[@class='back-link']"));
                            await backtoResultElement.click();
                            driver.sleep(2000);
                            await driver.wait(until.elementLocated(By.xpath(".//div[@class='ja-job-list']//div[starts-with(@class, 'job')][" + counter + "]/h2/a")), 2000);


                            await jobMaker.successful.add(job, botScheduleID);
                            counter++;
                        } catch (e) {
                            await jobMaker.failed.add(job.JDTID_UNIQUE_NUMBER, e.message);
                            counter++;
                        }
                    }
                } while (isPresent);

                try {
                    var nextContainer = await driver.findElements(By.xpath('.//div[@class="ja-pager"]//a[@class="next"]'));
                    var next = nextContainer.length;
                    if (next == 1) {
                        var nextLink = await driver.findElement(By.xpath('//div[@class="ja-pager"]//a[@class="next"]'));
                        await nextLink.click();
                        driver.sleep(1000);
                        loop = true;
                        pagenumber++;
                    }
                } catch (e) {
                }
            } while (loop);
        }
        driver.quit();
        await snippet(configuration, jobMaker.atsJobCount, jobMaker.failedJobs.length, jobMaker, onsuccess, onfailure);
    } catch (e) {
        driver.quit();
        var output = package.service.bot.createBotErrorOutput(configuration.scheduleid, jobMaker.jobs.length, jobMaker.atsJobCount, jobMaker.failedJobs.length, e);
        onfailure(output);
    }

}


function HtmlEscape(descriptionData) {
    var description = he.encode(descriptionData, { 'useNamedReferences': true, 'decimal': true, 'allowUnsafeSymbols': true });
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
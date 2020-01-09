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
        var driverjobdetails = selenium.createDriver(configuration.configuration.execBotConfig.browsertype.toLowerCase());
        //var driver = selenium.createDriver("chrome");
        //var driverjobdetails = selenium.createDriver("chrome");

        await driver.manage().window().maximize();

        await driver.get('http://www.scjohnson.com/en/Careers/search-positions.aspx');

        var cookieInfo = await driver.findElements(By.xpath('//*[@id="_evh-ric"]'));
        if (cookieInfo.length == 1) {
            cookieInfo = await driver.findElement(By.xpath('//*[@id="_evh-ric-c"]'));
            await cookieInfo.click();
        }

        var resultsPage = await driver.findElement(By.xpath('//*[@id="divPage"]/div[2]/div/iframe'));
        var searchResults = await resultsPage.getAttribute('src');

        await driver.switchTo().frame(driver.findElement(By.xpath('//*[@id="divPage"]/div[2]/div/iframe')));
        var searchElement = await driver.findElement(By.xpath('//*[@name="submit1"]'));
        await searchElement.click();
        await driver.wait(until.elementLocated(By.xpath('//*[@id="yui-pg0-0-page-report"]')), 10000);
        var recordCount = await driver.findElement(By.xpath('//*[@id="yui-pg0-0-page-report"]'));
        var records = await recordCount.getText();
        var record = records.split('of');

        jobMaker.setatsJobCount(parseInt(record[1]));

        var loop;
        await driver.get(searchResults);
        var searchElement = await driver.findElement(By.xpath('//*[@name="submit1"]'));
        await searchElement.click();
        do {
            loop = false;
            var pagenumber = 1;
            var counter = 1;
            do {
                if (counter % 10 == 0 && counter != 50) {
                    await driver.executeScript("scroll(0,300)");
                }
                var jobContainer = await driver.findElements(By.xpath('//*[@id="idSearchresults_dataBody"]/tr[' + counter + ']'));
                var isPresent = await jobContainer.length;
                if (isPresent) {
                    try {
                        var job = jobMaker.create();
                        var titleElement = await driver.findElement(By.xpath('//*[@id="idSearchresults_dataBody"]/tr[' + counter + ']/td[2]/div/a'));
                        var title = await titleElement.getText();
                        var url = await titleElement.getAttribute("href");
                        var idElement = url.split('&jobId=');
                        idElement = idElement[1];
                        var id = idElement.split('&type=');
                        id = id[0];


                        var descURL = "https://sjobs.brassring.com/TGWebHost/jobdetails.aspx?partnerid=420&siteid=42&jobId=" + id;
                        await driverjobdetails.get(descURL);
                        var categoryElement = await driverjobdetails.findElements(By.xpath('//*[@id="Job Category"]'));
                        if (categoryElement.length == 1) {
                            categoryElement = await driverjobdetails.findElement(By.xpath('//*[@id="Job Category"]'));
                            var category = await categoryElement.getText();
                        }
                        var locationElement = await driverjobdetails.findElements(By.xpath('//*[@id="Location"]'));
                        if (locationElement.length == 1) {
                            var locationElement = await driverjobdetails.findElement(By.xpath('//*[@id="Location"]'));
                            var location = await locationElement.getText();
                        }
                        var jobtypeElement = await driverjobdetails.findElement(By.xpath('//*[@id="Division"]'));
                        var type = await jobtypeElement.getText();
                        var descriptionElement = await driverjobdetails.findElement(By.xpath('//*[@id="Job Description"]'));
                        var description = await descriptionElement.getAttribute("outerHTML");
                        var jobIdElement = await driverjobdetails.findElement(By.xpath('//*[@id="Requisition Number"]'));
                        var jobid = await jobIdElement.getText();

                        job.JOB_TITLE = title;
                        job.JDTID_UNIQUE_NUMBER = jobid;
                        job.JOB_TYPE = type;
                        job.TEXT = HtmlEscape(description);
                        if (category != null) {
                            job.JOB_CATEGORY = category;
                        }
                        job.JOB_APPLY_URL = url;
                        if (location != null) {
                            if (location.indexOf(',') > 0) {
                                var loc = location.split(",");
                                job.JOB_LOCATION_CITY = loc[0];
                                job.JOB_LOCATION_STATE = loc[1];
                            }
                            else {
                                job.JOB_LOCATION_STATE = location;
                                job.JOB_LOCATION_CITY = location;
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
                var e = await driver.findElements(By.xpath('//a[@id="yui-pg0-0-next-link"]'));
                if (e.length == 1) {
                    var nextPage = await driver.findElement(By.xpath('//a[@id="yui-pg0-0-next-link"]'));
                    await nextPage.click();
                    loop = true;
                    pagenumber++;
                }
            } catch (e) {

            }
        } while (loop);
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
    description = description.replace(/&nbsp;/g, '');
    description = description.replace(/\s\s+/g, ' ');
    description = description.replace(/\r?\n|\r/g, '');
    description = description.replace(/&#x9;/g, '');
    description = description.replace(/dash/g, '#8208');
    description = description.replace(/mldr/g, 'hellip');
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

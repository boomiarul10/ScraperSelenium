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

        await driver.manage().window().maximize();
        await driverjobdetails.manage().window().maximize();

        await driver.get('http://careers.nyp.org/job-search.html#.WaRbfD6GOUl');

        var jobcount = await driver.findElements(By.xpath('//div[@id="jbresults_info"]'));
        var count = await jobcount[0].getText();
        var atsjobscount = await count.split("of");
        var atsjobscount = atsjobscount[1];
        var atsjobscount = await atsjobscount.split("entries");
        var atscount = atsjobscount[0];
        jobMaker.setatsJobCount(parseInt(atscount));


        var categoryElement = await driver.findElement(By.xpath('//form[@class="visible-desktop hidden-phone hidden-tablet"]//fieldset//select[@class="mobile-area-of-interest"]'));
        var optionArray = await categoryElement.findElements(By.tagName('option'));

        for (var i = 2; i <= optionArray.length; i++) {
            var option = await driver.findElement(By.xpath('//select[@class="mobile-area-of-interest"]/option[' + i + ']'));
            var category = await option.getAttribute('text');
            if (category.indexOf('All') < 0) {
                await option.click();
                var searchElement = await driver.findElement(By.xpath('//input[@class="beginsearchbutton"]'));
                await searchElement.click();
                await driver.sleep(30000);


                var counter = 1;
                do {
                    var jobContainer = await driver.findElements(By.xpath('//tbody/tr[@role="row"][' + counter + ']'));
                    var isPresent = await jobContainer.length;

                    if (isPresent) {
                        try {
                            var alljobsElement = await driver.findElement(By.xpath('//select[@name="jbresults_length"]/option[5]'));
                            await alljobsElement.click();
                            var job = jobMaker.create();

                            var titleElement = await driver.findElement(By.xpath('//tbody/tr[' + counter + '][@role="row"]/td[1]/a'));
                            job.JOB_TITLE = await titleElement.getText();
                            category = category.replace('-', '');
                            job.JOB_CATEGORY = category;

                            var locationElement = await driver.findElement(By.xpath('//tbody/tr[' + counter + '][@role="row"]/td[2]'));
                            var location = await locationElement.getText();

                            var typeElement = await driver.findElement(By.xpath('//tbody/tr[' + counter + '][@role="row"]/td[3]'));
                            job.JOB_TYPE = await typeElement.getText();
                            var dateElement = await driver.findElement(By.xpath('//tbody/tr[' + counter + '][@role="row"]/td[4]'));
                            job.ASSIGNMENT_START_DATE = await dateElement.getText();

                            var loc = await location.split("/");
                            job.JOB_LOCATION_CITY = loc[1];

                            var joburl = await titleElement.getAttribute("href");
                            job.JOB_APPLY_URL = joburl;
                            await driverjobdetails.get(joburl);
                            await driverjobdetails.sleep(3000);
                            var idElement = await driverjobdetails.findElement(By.xpath('//div[@class="search_area hidden-phone hidden-tablet visible-desktop"]/ul/li[2]'));

                            var jobid = await idElement.getText();
                            if (jobid) {
                                if (jobid.includes(":")) {
                                    var id = jobid.split(":");
                                    job.JDTID_UNIQUE_NUMBER = id[1];
                                }
                            }
                            await driverjobdetails.wait(until.elementLocated(By.xpath('//div[@class="search_results"]/div[2]')), 3000);
                            var jobDescription = await driverjobdetails.findElement(By.xpath('//div[@class="search_results"]/div[2]'));
                            var desc = await jobDescription.getAttribute("outerHTML");

                            if (desc) {
                                job.TEXT = HtmlEscape(desc);
                            }
                            jobMaker.successful.add(job, botScheduleID);
                            counter++;
                        }
                        catch (e) {
                            jobMaker.failed.add(job.JDTID_UNIQUE_NUMBER, e.message);
                            counter++;
                        }
                    }
                } while (isPresent);
                await driver.navigate().back();
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
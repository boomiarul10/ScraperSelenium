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

        await driver.get('https://www.healthcaresource.com/wh/index.cfm?fuseaction=search.categoryList&template=dsp_job_categories.cfm');

        var searchLink = await driver.findElement(By.xpath('//*[@name="submitButton"]'));
        await searchLink.click();

        var jobCountElement = await driver.findElement(By.xpath('//*[@id="content"]/form/table[1]//tr[1]/td'));
        var atsCount = await jobCountElement.getText();
        var jobCount = atsCount.split("Results:");
        var atsJobCount = jobCount[1].split("Job");
        jobMaker.setatsJobCount(parseInt(atsJobCount[0].trim()));
        await driver.navigate().back();

        var categoryElement = await driver.findElement(By.xpath('//*[@id="iJobCatId"]'));
        var optionArray = await categoryElement.findElements(By.tagName('option'));

        for (var i = 2; i <= optionArray.length; i++) {
            var optionAll = await driver.findElement(By.xpath('//*[@id="iJobCatId"]/option[1]'))
            await optionAll.click();
            var option = await driver.findElement(By.xpath('//*[@id="iJobCatId"]/option[' + i + ']'));
            var category = await option.getAttribute('text');
            await option.click();
            var submitElement = await driver.findElement(By.xpath('//*[@name="submitButton"]'));
            await submitElement.click();

            var loop;
            do {
                loop = false;
                var counter = 4;
                var jobsContainer = await driver.findElements(By.xpath('//div[@id="content"]/form/table'));
                var jobsPresent = await jobsContainer.length;
                jobsPresent = jobsPresent - 3;
                do {
                    var jobContainer = await driver.findElements(By.xpath('//div[@id="content"]/form/table[' + counter + ']'));
                    var isPresent = await jobContainer.length;
                    if (isPresent) {
                        try {
                            var job = jobMaker.create();

                            job.JOB_CATEGORY = category;
                            var titleElement = await driver.findElement(By.xpath('//div[@id="content"]/form/table[' + counter + ']//a'));
                            job.JOB_TITLE = await titleElement.getText();
                            var locationElement = await driver.findElement(By.xpath('//div[@id="content"]/form/table[' + counter + ']//td[5]'));
                            job.JOB_LOCATION_CITY = await locationElement.getText();

                            var url = await titleElement.getAttribute("href");
                            job.JOB_APPLY_URL = url;

                            await driverjobdetails.get(url);

                            var jobIdElement = await driverjobdetails.findElement(By.xpath('//*[@id="content"]/font/table[2]/tbody/tr[4]/td[2]'));
                            job.JDTID_UNIQUE_NUMBER = await jobIdElement.getText();

                            var dateElement = await driverjobdetails.findElement(By.xpath('//*[@id="content"]/font/table[2]/tbody/tr[5]/td[2]'));
                            job.ASSIGNMENT_START_DATE = await dateElement.getText();

                            var statusElement = await driverjobdetails.findElement(By.xpath('//*[@id="content"]/font/table[2]/tbody/tr[6]/td[2]'));
                            job.JOB_STATUS = await statusElement.getText();

                            var typeElement = await driverjobdetails.findElement(By.xpath('//*[@id="content"]/font/table[2]/tbody/tr[7]/td[2]'));
                            job.JOB_TYPE = await typeElement.getText();

                            var companyElement = await driverjobdetails.findElement(By.xpath('//*[@id="content"]/font/table[2]/tbody/tr[9]/td[2]/font'));
                            var company = await companyElement.getText();
                            job.JOB_CONTACT_COMPANY = company.trim();

                            var descriptionElement = await driverjobdetails.findElement(By.xpath('//*[@id="content"]/font/table[2]/tbody'));
                            var desc = await descriptionElement.getAttribute("innerHTML");
                            var descSplitElement = await driverjobdetails.findElement(By.xpath('//*[@id="content"]/font/table[2]/tbody/tr[11]'))
                            var descSplit = await descSplitElement.getAttribute("outerHTML");
                            desc = desc.split(descSplit);
                            desc = desc[0];

                            job.TEXT = HtmlEscape(desc);

                            jobMaker.successful.add(job, botScheduleID);
                            counter++;
                        } catch (e) {
                            jobMaker.failed.add(job.JDTID_UNIQUE_NUMBER, e.message);
                            counter++;
                        }
                    }
                } while (isPresent && counter <= jobsPresent);
                try {
                    var nextElement = await driver.findElements(By.xpath('//input[contains(@value,"Next")]'));
                    var next = await nextElement.length;
                    if (next) {
                        var nextLink = await driver.findElement(By.xpath('//input[contains(@value,"Next")]'));
                        await nextLink.click();
                        loop = true;
                    }
                } catch (e) {
                    var ex = e.message;
                }
            } while (loop);
            await driver.findElement(By.xpath('//*[@name="submit"]')).click();
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

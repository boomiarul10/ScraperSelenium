
var sanitizeHtml = require('sanitize-html');
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
        var driver = selenium.createDriver("chrome");
        var driverjobdetails = selenium.createDriver("chrome");

        await driver.get('http://www.nccicareers.com/joblist.asp?user_id');

        var totalJobElement = await driver.findElement(By.xpath('//*[@id="dynamicRails"]/tbody/tr[2]/td/div/div[1]'));
        var totalJobCount = await totalJobElement.getText();
        var record = totalJobCount.split("of");
        var atsCount = record[1].split("jobs");
        jobMaker.setatsJobCount(parseInt(atsCount[0]));

        var categoryElement = await driver.findElement(By.xpath('//*[@id="dynamicRails"]/tbody/tr[1]/td[2]/form/div/div[2]/div[1]/select'));
        var optionArray = await categoryElement.findElements(By.tagName('option'));

        for (var i = 2; i <= optionArray.length; i++) {
            var option = await driver.findElement(By.xpath('//Select[@name="category"]/Option[' + i + ']'));
            var optionValue = await option.getAttribute('text');
            await option.click();
            var searchelement = await driver.findElement(By.xpath('//*[@id="dynamicRails"]/tbody/tr[1]/td[2]/form/div/div[2]/div[4]/input'));
            await searchelement.click();

            var counter = 3;
            do {
                var jobContainer = await driver.findElements(By.xpath("//*[@id='dynamicRails']/tbody/tr[2]/td/div/div[2]/table/tbody/tr[1]/td/table/tbody/tr[" + counter + "]/td[2]"));
                var isPresent = await jobContainer.length;
                if (isPresent) {
                    try {
                        var job = jobMaker.create();
                        job.JOB_CATEGORY = optionValue;

                        var titleElement = await driver.findElement(By.xpath("//*[@id='dynamicRails']/tbody/tr[2]/td/div/div[2]/table/tbody/tr[1]/td/table/tbody/tr[" + counter + "]/td[2]/a/span"));
                        job.JOB_TITLE = await titleElement.getText();
                        var jobid = await driver.findElement(By.xpath('//*[@id="dynamicRails"]/tbody/tr[2]/td/div/div[2]/table/tbody/tr[1]/td/table/tbody/tr[' + counter + ']/td[3]')).getText();
                        job.JDTID_UNIQUE_NUMBER = jobid;
                        var dateElement = await driver.findElement(By.xpath("//*[@id='dynamicRails']/tbody/tr[2]/td/div/div[2]/table/tbody/tr[1]/td/table/tbody/tr[" + counter + "]/td[1]"));
                        job.ASSIGNMENT_START_DATE = await dateElement.getText();

                        var cityElement = await driver.findElement(By.xpath("//*[@id='dynamicRails']/tbody/tr[2]/td/div/div[2]/table/tbody/tr[1]/td/table/tbody/tr[" + counter + "]/td[4]"));
                        var city = await cityElement.getText();
                        if (city) {
                            var loc = city.split(",");
                            job.JOB_LOCATION_CITY = loc[0].trim();
                        }

                        var urlElement = await driver.findElement(By.xpath("//*[@id='dynamicRails']/tbody/tr[2]/td/div/div[2]/table/tbody/tr[1]/td/table/tbody/tr[" + counter + "]/td[2]/a"));

                        var url = await urlElement.getAttribute("href");
                        if (url) {
                            job.JOB_APPLY_URL = url;
                        }
                        await driverjobdetails.get(url);

                        var jobdetailspage = await driverjobdetails.findElements(By.xpath('//*[@id="dynamicRails"]/tbody/tr[2]/td/div/div'));
                        var isDetailPage = await jobdetailspage.length;
                        if (isDetailPage) {
                            var stateElement = await driverjobdetails.findElement(By.xpath('//*[@id="dynamicRails"]/tbody/tr[2]/td/div/div/table/tbody/tr[3]/td/table/tbody/tr[3]/td[3]'));
                            var state = await stateElement.getText();
                            if (state) {
                                var loc = state.split(",");
                                job.JOB_LOCATION_STATE = loc[1].trim();
                            }
                            //var descElement = await driverjobdetails.findElement(By.xpath('//*[@id="dynamicRails"]/tbody/tr[2]/td/div/div/table/tbody/tr[3]'));
                            //var desc = await descElement.getAttribute("outerHTML");

                            var descriptionElement = await driverjobdetails.findElement(By.xpath('//*[@id="dynamicRails"]/tbody/tr[2]/td/div/div'));
                            var description = await descriptionElement.getAttribute("outerHTML");

                            //var jobDesc = description;




                            //var desc1 = sanitizeHtml(description, {
                            //    exclusiveFilter: function (frame) {
                            //        return frame.tag === 'a';
                            //    }
                            //}
                            //);

                            job.TEXT = HtmlEscape(description);
                        }
                        jobMaker.successful.add(job, botScheduleID);
                        counter++;
                    } catch (e) {

                    }
                }
            } while (isPresent);
        }
        driver.quit();
        driverjobdetails.quit();
        snippet(configuration, jobMaker.atsJobCount, jobMaker.failedJobs.length, jobMaker, onsuccess, onfailure);
    } catch (e) {
        driver.quit();
        driverjobdetails.quit();
        var output = package.service.bot.createBotErrorOutput(configuration.scheduleid, jobMaker.jobs.length, jobMaker.atsJobCount, jobMaker.failedJobs.length, err);
        onfailure(output);
    }
}

function HtmlEscape(description) {
    description = he.encode(description, { 'useNamedReferences': true, 'decimal': true, 'allowUnsafeSymbols': true });
    description = description.replace(/&#9;/g, ' ');
    description = description.replace(/&nbsp;/g, '');
    description = description.replace(/\s\s+/g, ' ');
    description = description.replace(/\r?\n|\r/g, '');
    description = description.replace(/&#9;/g, ' ');
    description = description.replace(/ZeroWidthSpace;/g, '#8203;');
    return description;
}

var snippet = (configuration, atsJobCount, failedJobCount, jobs, onsuccess, onfailure) => {
    service.bot.setProgress(botScheduleID, log.logType.activity, log.activity.snippet.download + "writeObjectToFile").then(values => {
        var snippet = package.resource.download.snippet("writeObjectToFile");
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
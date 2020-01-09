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

        await driver.get('https://boards.greenhouse.io/endurance#.WOvoN28rJpj');

        var atsJobCount = 0;
        await driver.sleep(1000);      
        var jobATSElement = await driver.findElements(By.xpath('//div[@style="display: block;"]'));
        var jobCount = await jobATSElement.length;

        if (jobCount) {
            var option = await driver.findElement(By.xpath('//Select[@id="offices-select"]/Option[2]'));
            var optionValue = await option.getAttribute('text');
            await option.click();

            var jobElement = await driver.findElements(By.xpath('//*[@id="filter-count"]'));
            var atsCount = await jobElement.length;
            var count = atsCount.split(" jobs");
            atsJobCount = jobCount + parseInt(count[0]);
            jobMaker.setatsJobCount(parseInt(atsJobCount));

            var option = await driver.findElement(By.xpath('//Select[@id="offices-select"]/Option[1]'));
            var optionValue = await option.getAttribute('text');
            await option.click()
        }


        var categoryElement = await driver.findElement(By.xpath('//select[@id="departments-select"]'));
        var optionArray = await categoryElement.findElements(By.tagName('option'));
        var counter = 1;
        for (var i = 2; i <= optionArray.length; i++) {
            var option = await driver.findElement(By.xpath('//Select[@id="departments-select"]/Option[' + i + ']'));
            var optionCategory = await option.getAttribute('text');
            await option.click();

            var industryElement = await driver.findElement(By.xpath('//select[@id="offices-select"]'));
            var optionArr = await industryElement.findElements(By.tagName('option'));
            var j = 2;
            var isIndustry;
            do {
                isIndustry = true;
                if (j >= optionArr.length) {
                    isIndustry = false;
                }
                var option = await driver.findElement(By.xpath('//Select[@id="offices-select"]/Option[' + j + ']'));
                var optionValue = await option.getAttribute('text');
                await option.click();                

                var jobContainer = await driver.findElements(By.xpath('//*[@id="main"]/section[' + counter + ']/div[@style="display: block;"]'));
                var isJobPresent = await jobContainer.length;
                for (var k = 0; k < jobContainer.length; k++) {
                    var jobtitle = await jobContainer[k].findElement(By.tagName('a'));
                    var text = await jobtitle.getText();
                    try {
                        var job = jobMaker.create();
                        var category = optionCategory;
                        job.JOB_CATEGORY = category.replace(/\d+\s/, "");
                        job.JOB_INDUSTRY = optionValue;

                        var titleElement = await jobContainer[k].findElement(By.tagName('a'));
                        job.JOB_TITLE = await titleElement.getText();

                        var locationElement = await jobContainer[k].findElement(By.tagName('span'));
                        var location = await locationElement.getText();

                        if (location) {
                            var loc = location.split(",");
                            job.JOB_LOCATION_CITY = loc[0];
                            job.JOB_LOCATION_STATE = loc[1];
                        }
                        var urlElement = await jobContainer[k].findElement(By.tagName('a'));
                        var url = await urlElement.getAttribute("href");
                        job.JOB_APPLY_URL = url;
                        if (url) {
                            var id = url.split("jobs/");
                            job.JDTID_UNIQUE_NUMBER = id[1];
                        }

                        await driverjobdetails.get(url);

                        var jobdetailspage = await driverjobdetails.findElements(By.xpath("//*[@id='content']"));
                        var isDetailPage = await jobdetailspage.length;
                        if (isDetailPage) {
                            var jobDescriptionElement = await driverjobdetails.findElement(By.xpath("//*[@id='content']"));
                            var JobDescription = await jobDescriptionElement.getAttribute("outerHTML");

                            if (JobDescription) {
                                job.TEXT = HtmlEscape(JobDescription);
                            }
                        }
                        jobMaker.successful.add(job, botScheduleID);

                    } catch (e) {
                        var error = e;
                    }
                }
                j++;
            } while (isIndustry);

            counter++;
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
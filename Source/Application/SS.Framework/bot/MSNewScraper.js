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
        
        await driver.get('https://atsv7.wcn.co.uk/company/marksandspencer/stores_2014/jobs.cgi');

        var option2Element = await driver.findElement(By.xpath('//*[@id="myform"]/form/ul/li[2]/select/option[2]'));
        await option2Element.click();

        var option1Element = await driver.findElement(By.xpath('//*[@id="myform"]/form/ul/li[2]/select/option[1]'));
        await option1Element.click();

        var totalJobElement = await driver.findElement(By.xpath('//*[@id="results_link"]/a'));
        var totalJobCount = await totalJobElement.getText();
        var record = totalJobCount.split("Show");
        var recordCount = record[1].split("Matches");
        jobMaker.setatsJobCount(parseInt(recordCount[0].trim()));

        var stateElement = await driver.findElement(By.xpath('//*[@id="myform"]/form/ul/li[2]/select'));
        var optionArray = await stateElement.findElements(By.tagName('option'));

        for (var i = 2; i <= optionArray.length; i++) {
            var option = await driver.findElement(By.xpath('//*[@id="myform"]/form/ul/li[2]/select/option[' + i + ']'));
            var optionValue = await option.getAttribute('text');
            await option.click();

            var searchElements = await driver.findElements(By.xpath('//*[@id="results_link"]/a'));
            var isSearch = await searchElements.length;
            if (isSearch) {
                var searchElement = await driver.findElement(By.xpath('//*[@id="results_link"]/a'));
                await searchElement.click();
            }

            var counter = 2;
            do {
                var jobContainer = await driver.findElements(By.xpath("//*[@id='jobs']/tbody/tr[" + counter + "]"));
                var isPresent = await jobContainer.length;
                if (isPresent) {
                    try {
                        var job = jobMaker.create();
                        if (optionValue)
                        {
                            var state = optionValue.split("(");
                            job.JOB_LOCATION_STATE = state[0].trim();
                        }
                        var titleElement = await driver.findElement(By.xpath("//*[@id='jobs']/tbody/tr[" + counter + "]/td[1]"));
                        job.JOB_TITLE = await titleElement.getText();
                        var locationElement = await driver.findElement(By.xpath("//*[@id='jobs']/tbody/tr[" + counter + "]/td[3]"));
                        job.JOB_LOCATION_CITY = await locationElement.getText();
                        var categoryElement = await driver.findElement(By.xpath("//*[@id='jobs']/tbody/tr[" + counter + "]/td[5]"));
                        job.JOB_CATEGORY = await categoryElement.getText();
                        var typeElement = await driver.findElement(By.xpath("//*[@id='jobs']/tbody/tr[" + counter + "]/td[6]"));
                        job.JOB_TYPE = await typeElement.getText();
                        var travelElement = await driver.findElement(By.xpath("//*[@id='jobs']/tbody/tr[" + counter + "]/td[4]"));
                        job.TRAVEL = await travelElement.getText();
                        var statusElement = await driver.findElement(By.xpath("//*[@id='jobs']/tbody/tr[" + counter + "]/td[2]"));
                        job.JOB_STATUS = await statusElement.getText();
                        var urlElement = await driver.findElement(By.xpath("//*[@id='jobs']/tbody/tr[" + counter + "]/td[7]/a"));
                        var url = await urlElement.getAttribute("href");
                        if (url) {
                            job.JOB_APPLY_URL = url;
                            var jobID = url.split("SID=");
                            var idURL = Buffer.from(jobID[1], 'base64').toString('ascii');
                            var reqID = idURL.split('&jcode=').pop().split('&').shift();
                            job.JDTID_UNIQUE_NUMBER = reqID;                            
                        }
                        jobMaker.successful.add(job, botScheduleID);
                        counter++;
                    } catch (e) {
                        jobMaker.failed.add(job.JDTID_UNIQUE_NUMBER, e.message);
                        counter++;
                    }
                }
            } while (isPresent);
            var newSearchelement = await driver.findElement(By.xpath('//*[@id="new_search_link"]/a'));
            await newSearchelement.click();
        }
        await driver.quit();
        snippet(configuration, jobMaker.atsJobCount, jobMaker.failedJobs.length, jobMaker, onsuccess, onfailure);
    } catch (e) {
        await driver.quit();
        var output = package.service.bot.createBotErrorOutput(configuration.scheduleid, jobMaker.jobs.length, jobMaker.atsJobCount, jobMaker.failedJobs.length, e);
        onfailure(output);
    }
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
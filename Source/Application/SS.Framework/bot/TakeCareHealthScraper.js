var Promise = require('promise');
var package = global.createPackage();
var cleanHtml = require('clean-html');
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

        await driver.get('https://www5.recruitingcenter.net/Clients/TakeCare/PublicJobs/controller.cfm');

        var searchElement = await driver.findElement(By.xpath('//*[@id="SearchJobs"]'));
        await searchElement.click();
        var jobCount = await driver.findElement(By.xpath('//*[@id="crs_jobsearchresults"]/div[1]'));
        var atsCount = await jobCount.getText();
        var atsJobCount = atsCount.split(" ");
        jobMaker.setatsJobCount(parseInt(atsJobCount[1]));

        await driver.navigate().back();

        var categoryElement = await driver.findElement(By.xpath('//*[@id="SecondaryCat"]'));
        var optionArray = await categoryElement.findElements(By.tagName('option'));

        for (var i = 3; i <= optionArray.length; i++) {
            var option = await driver.findElement(By.xpath('//*[@id="SecondaryCat"]/Option[' + i + ']'));
            var category = await option.getAttribute('text');
            await option.click();
            var submitElement = await driver.findElement(By.xpath('//*[@id="SearchJobs"]'));
            await submitElement.click();

            var counter = 2;
            loop = false;
            do {
                var jobContainer = await driver.findElements(By.xpath('//*[@id="crs_jobsearchresults"]/table/tbody/tr[' + counter + ']'));
                var isPresent = await jobContainer.length;
                if (isPresent) {
                    try {
                        var job = jobMaker.create();

                        var urlElement = await driver.findElement(By.xpath('//*[@id="crs_jobsearchresults"]/table/tbody/tr[' + counter + ']/td[1]/a'));
                        var url = await urlElement.getAttribute("href");

                        await driverjobdetails.get(url);

                        var siteLocationElement = await driverjobdetails.findElement(By.xpath('//*[@id="crs_jobprofile"]/form/div[2]/table[1]/tbody/tr[4]/td[2]'));
                        var siteLocation = await siteLocationElement.getText();
                        var titleElement = await driverjobdetails.findElement(By.xpath('//*[@id="crs_jobprofile"]/form/div[2]/table[1]/tbody/tr[1]/td[2]'));
                        var title = await titleElement.getText();
                        var locationElement = await driverjobdetails.findElement(By.xpath('//*[@id="crs_jobprofile"]/form/div[2]/table[1]/tbody/tr[3]/td[2]'));
                        var location = await locationElement.getText();
                        var jobType = await driverjobdetails.findElement(By.xpath('//*[@id="crs_jobprofile"]/form/div[2]/table[1]/tbody/tr[2]/td[2]'));
                        var type = await jobType.getText();

                        var jobDescription = await driverjobdetails.findElement(By.xpath('//*[@id="crs_jobprofile"]/form/div[2]/table[2]/tbody/tr[2]/td'));
                        var description = await jobDescription.getAttribute("outerHTML");

                        title = title.replace(/-/g, '–').replace('*', '');
                        job.JOB_TITLE = title;
                        var jobId = url.replace('https://www5.recruitingcenter.net/Clients/TakeCare/PublicJobs/controller.cfm?jbaction=JobProfile&Job_Id=', '').replace('http://www5.recruitingcenter.net/Clients/TakeCare/PublicJobs/controller.cfm?jbaction=JobProfile&Job_Id=', '').replace('&esid=az', '');
                        job.JDTID_UNIQUE_NUMBER = jobId;
                        var descriptionText = description.replace(/<td class="regular">/g, '').replace(/<\/td>/g, '');
                        var descriptionRemovedTag;
                        var optionTag = {
                            'add-remove-tags': ['tbody', 'tr', 'td']
                        };

                        cleanHtml.clean(descriptionText, optionTag, function (html) {
                            descriptionRemovedTag = html;
                        });
                        job.TEXT = HtmlEscape(descriptionRemovedTag);

                        job.JOB_CATEGORY = category;
                        job.JOB_APPLY_URL = url.replace('posts', 'https').replace('??', '?');
                        if (location) {
                            var loc = location.split(",");
                            job.JOB_LOCATION_CITY = loc[0];
                            job.JOB_LOCATION_STATE = loc[1];
                        }
                        if (siteLocation.length == 0) {
                            job.JOB_CONTACT_COMPANY = "Employer Site Clinic";
                        } else {
                            job.JOB_CONTACT_COMPANY = siteLocation;
                        }
                        job.JOB_LOCATION_COUNTRY = "US";
                        job.JOB_TYPE = type;

                        jobMaker.successful.add(job, botScheduleID);
                        counter++;
                    } catch (e) {
                        jobMaker.failed.add(job.JDTID_UNIQUE_NUMBER, e.message);
                        counter++;
                    }
                }
                else
                    await driver.navigate().back();
            } while (isPresent);
        }
        driverjobdetails.quit();
        driver.quit();
        snippet(configuration, jobMaker.atsJobCount, jobMaker.failedJobs.length, jobMaker, onsuccess, onfailure);
    } catch (e) {
        driverjobdetails.quit();
        driver.quit();
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
    var values = await service.bot.setProgress(botScheduleID, log.logType.activity, log.activity.snippet.download + "feedgeneratorwithasync");
    var snippet = package.resource.download.snippet("feedgeneratorwithasync");
    var input = snippet.createInput(configuration, jobs);
    try {
        var jobcount = await snippet.execute(input);
        var output = package.service.bot.createBotOutput(configuration.scheduleid, jobcount, jobMaker.atsJobCount, jobMaker.failedJobs.length);
        onsuccess(output);
    }
    catch (e) {
        var output = package.service.bot.createBotErrorOutput(configuration.scheduleid, jobMaker.jobs.length, jobMaker.atsJobCount, jobMaker.failedJobs.length, e);
        onfailure(output);
    }
}
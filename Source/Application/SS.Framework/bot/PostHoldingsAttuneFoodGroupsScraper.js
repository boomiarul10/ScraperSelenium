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
       
        await driver.get('https://recruiting2.ultipro.com/POS1003POST/JobBoard/7bdceaf9-34a5-43a5-8650-8b6dac779b94');
        await driver.sleep(3000);
        var totalJobElement = await driver.findElement(By.xpath('//*[@id="SearchCount"]//span[@data-automation="opportunities-count"]'));
        var totalJobCount = await totalJobElement.getText();
        var jobCount = totalJobCount.split("are");
        var atsCount = jobCount[1].replace("opportunities","").trim();
        jobMaker.setatsJobCount(parseInt(atsCount));

        var counter = 1;
        do {

            var jobContainer = await driver.findElements(By.xpath('//*[@data-bind="foreach: opportunities"]/div[' + counter + ']'));
            var isPresent = await jobContainer.length;
            if (isPresent) {
                try {
                    var job = jobMaker.create();

                    var titleElement = await driver.findElement(By.xpath('//*[@data-bind="foreach: opportunities"]/div[' + counter + ']//h3/a'));
                    job.JOB_TITLE = await titleElement.getText();
                    var categoryElement = await driver.findElement(By.xpath('//*[@data-bind="foreach: opportunities"]/div[' + counter + ']//span[@data-bind="text: JobCategoryName()"]'));
                    job.JOB_CATEGORY = await categoryElement.getText();                    
                    var urlElement = await driver.findElement(By.xpath('//*[@data-bind="foreach: opportunities"]/div[' + counter + ']//h3/a'));
                    var url = await urlElement.getAttribute("href");
                    job.JOB_APPLY_URL = url;
                    if (url) {
                        var jobId = url.split("opportunityId=");
                        job.JDTID_UNIQUE_NUMBER = jobId[1].trim();
                    }
                    await driverjobdetails.get(url);

                    var jobdetailspage = await driverjobdetails.findElements(By.xpath('//*[@class="opportunity-description"]'));
                    var isDetailPage = await jobdetailspage.length;
                    if (isDetailPage) {

                        var locationElement = await driverjobdetails.findElement(By.xpath('//*[@data-bind="visible: $parent.showAllLocations"]//span[@data-bind="text: Address().CityStatePostalCodeAndCountry()"]'));
                        var location = await locationElement.getAttribute("innerHTML");
                        if (location != null) {                            
                            var loc = location.split(",");
                            if (loc.length == 2) {
                                job.JOB_LOCATION_CITY = loc[0].trim();
                                job.JOB_LOCATION_STATE = loc[1].trim();
                            }
                            else if (loc.length == 3) {
                                job.JOB_LOCATION_CITY = loc[0].trim();
                                job.JOB_LOCATION_STATE = loc[1].trim();
                                job.JOB_LOCATION_COUNTRY = loc[2].trim();
                            }
                            else {
                                job.JOB_LOCATION_CITY = location.trim();
                            }
                        }

                        var typeElement = await driverjobdetails.findElements(By.xpath('//*[@class="opportunity-sidebar list-unstyled"]//span[@id="JobFullTime"]'));
                        var isType = await typeElement.length;
                        if (isType) {
                            var type = await driverjobdetails.findElement(By.xpath('//*[@class="opportunity-sidebar list-unstyled"]//span[@id="JobFullTime"]'));
                            job.JOB_TYPE = await type.getText();
                        }
                        
                        var jobdesc = await driverjobdetails.findElement(By.xpath('//*[@id="opportunityDetailView"]//div[@class="col-md-18"]'));
                        var desc = await jobdesc.getAttribute("outerHTML");

                        var description="";
                        var optionTag = {
                            'add-remove-tags': ['ul']
                        };

                        cleanHtml.clean(desc, optionTag, function (html) {
                            description = html;
                        });
                        job.TEXT = HtmlEscape(description);
                    }
                    jobMaker.successful.add(job, botScheduleID);
                    counter++;
                } catch (e) {
                    jobMaker.failed.add(job.JDTID_UNIQUE_NUMBER, e.message);
                    counter++;
                }
            }
        } while (isPresent);

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
    description = description.replace(/&#9;/g, '');
    description = description.replace(/^\s+|\s+$/g, '');
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
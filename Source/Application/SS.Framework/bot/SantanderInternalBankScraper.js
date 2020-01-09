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
        //var driver = selenium.createDriver(configuration.configuration.execBotConfig.browsertype.toLowerCase());
        //var driverjobdetails = selenium.createDriver(configuration.configuration.execBotConfig.browsertype.toLowerCase());
        var driver = selenium.createDriverWithCapabilties();
        var driverjobdetails = selenium.createDriverWithCapabilties();
        await driver.manage().window().maximize();

        await driver.get('https://santandercareers.com/jobs');
        await driver.wait(until.elementLocated(By.xpath('//ul[@class="job_listings"]')), 50000);

        var allJobs;
        do {
            allJobs = false;
            var loadJobsElement = await driver.findElements(By.xpath("//a[@class='load_more_jobs'][contains(@style,'display: none;')]"));
            var loadJobs = await loadJobsElement.length;
            if (!loadJobs) {
                var loadJobsElement = await driver.findElement(By.xpath("//a[@class='load_more_jobs']"));
                await loadJobsElement.click();
                await driver.sleep(1000);
                allJobs = true;
            }
        } while (allJobs);

        var jobElements = await driver.findElements(By.xpath('//ul[@class="job_listings"]/li'));
        jobMaker.setatsJobCount(jobElements.length);

        var categoryElement = await driver.findElement(By.xpath('//select[@id="search_categories"]'));
        var optionArray = await categoryElement.findElements(By.tagName('option'));

        for (var i = 2; i <= optionArray.length; i++) {
            await driver.findElement(By.xpath('//div[@class="search_categories"]//a')).click();
            var option = await driver.findElement(By.xpath('//select[@id="search_categories"]/Option[' + i + ']'));
            var category = await option.getAttribute('text');
            await driver.findElement(By.xpath('//*[@id="search_categories_chosen"]/div/ul/li[' + i + ']')).click();

            var loop;
            do {
                loop = false;
                var loadJobsElement = await driver.findElements(By.xpath("//a[@class='load_more_jobs'][contains(@style,'display: block;')]"));
                var loadJobs = await loadJobsElement.length;
                if (loadJobs) {
                    var loadJobsElement = await driver.findElement(By.xpath("//a[@class='load_more_jobs']"));
                    await loadJobsElement.click();
                    await driver.sleep(1000);
                    loop = true;
                }
            } while (loop);

            var jobCounter = 1;
            do {
                var jobContainer = await driver.findElements(By.xpath("//ul[@class='job_listings']/li[" + jobCounter + "]"));
                var isPresent = await jobContainer.length;
                if (isPresent) {
                    try {
                        var job = jobMaker.create();
                        var titleElement = await driver.findElement(By.xpath("//ul[@class='job_listings']/li[" + jobCounter + "]//h3"));
                        job.JOB_TITLE = await titleElement.getText();

                        var locationElement = await driver.findElement(By.xpath("//ul[@class='job_listings']/li[" + jobCounter + "]/a/div[2]"));
                        var location = await locationElement.getText();
                        if (location) {
                            var loc = location.split(",");
                            if (loc.length == 2) {
                                job.JOB_LOCATION_CITY = loc[0];
                                job.JOB_LOCATION_STATE = loc[1];
                                job.JOB_LOCATION_COUNTRY = "US";
                            }
                            else {
                                job.JOB_LOCATION_CITY = location;
                                job.JOB_LOCATION_COUNTRY = "US";
                            }
                        }

                        job.JOB_CATEGORY = category;

                        var idElement = await driver.findElement(By.xpath("//ul[@class='job_listings']/li[" + jobCounter + "]"));
                        var jobID = await idElement.getAttribute("class");
                        jobID = jobID.split('post-');
                        jobID = jobID[1].split('type');
                        job.JDTID_UNIQUE_NUMBER = "post-" + jobID[0];

                        var urlElement = await driver.findElement(By.xpath("//ul[@class='job_listings']/li[" + jobCounter + "]/a"));
                        var url = await urlElement.getAttribute("href");
                        job.JOB_APPLY_URL = url + "/apply";

                        await driverjobdetails.get(url);


                        var jobTypeElement = await driverjobdetails.findElements(By.xpath("//li[contains(@class,'job-type')]"));
                        var typeLength = await jobTypeElement.length;
                        if (typeLength) {
                            var jobTypeElement = await driverjobdetails.findElement(By.xpath("//li[contains(@class,'job-type')]"));
                            job.JOB_TYPE = await jobTypeElement.getAttribute("innerHTML");
                        }

                        var JobDescription = await driverjobdetails.wait(until.elementLocated(By.xpath("//*[@class='job-overview no-company-desc']")), 2000);
                        var desc = await JobDescription.getAttribute("outerHTML");

                        if (desc) {
                            job.TEXT = HtmlEscape(desc);
                        }
                        jobMaker.successful.add(job, botScheduleID);
                        jobCounter++;
                    }
                    catch (e) {
                        jobMaker.failed.add(job.JDTID_UNIQUE_NUMBER, e.message);
                        jobCounter++;
                    }
                }
            } while (isPresent);

        }
        await driver.quit();
        await driverjobdetails.quit();
        await snippet(configuration, jobMaker.atsJobCount, jobMaker.failedJobs.length, jobMaker, onsuccess, onfailure);
    }
    catch (e) {
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

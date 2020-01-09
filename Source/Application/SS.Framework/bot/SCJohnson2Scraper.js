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
        await driver.get('http://careers.peopleclick.eu.com/careerscp/client_ams_sourcecloud/external1/search.do?functionName=getSearchCriteria');
        var loop;
        var atsJobCount = await driver.findElement(By.xpath('//*[@id="com.peopleclick.cp.formdata.JPM_LOCATION"]/option[1]'));
        var atscount = await atsJobCount.getAttribute('text');
        var record = atscount.split("(");
        jobMaker.setatsJobCount(parseInt(record[1].replace(")", "").trim()));
        var searchElement = await driver.findElement(By.xpath('//*[@id="searchButton"]'));
        await searchElement.click();
        do {
            loop = false;
            var counter = 2;
            do {
                var jobContainer = await driver.findElements(By.xpath('//*[@id="pcSearchResults"]/form/div[' + counter + ']//span[@class="resultsPill resultsPillTitle"]'));
                var isPresent = await jobContainer.length;
                if (isPresent) {
                    try {
                        var job = jobMaker.create();

                        var titleElement = await driver.findElement(By.xpath('//*[@id="pcSearchResults"]/form/div[' + counter + ']//span[@class="resultsPill resultsPillTitle"]'));
                        job.JOB_TITLE = await titleElement.getText();

                        var urlElement = await driver.findElement(By.xpath('//*[@id="pcSearchResults"]/form/div[' + counter + ']//span[@class="resultsPill resultsPillTitle"]/a'));
                        var id = await urlElement.getAttribute("href");
                        job.JOB_APPLY_URL = id;
                        await driverjobdetails.get(id);

                        var jobdetailspage = await driverjobdetails.findElements(By.xpath('//*[@id="jobDetailsDetails"]'));
                        var isDetailPage = await jobdetailspage.length;
                        if (isDetailPage) {

                            var idElement = await driverjobdetails.findElement(By.xpath('//*[@id="rdMainContent"]/form/div[2]/div[2]/div[1]/div[1]/ul/li[1]'));
                            job.JDTID_UNIQUE_NUMBER = await idElement.getText();
                            job.JDTID_UNIQUE_NUMBER = job.JDTID_UNIQUE_NUMBER.replace("Job ID:", "").trim();
                            var cityElement = await driverjobdetails.findElement(By.xpath('//*[@id="rdMainContent"]/form/div[2]/div[2]/div[1]/div[1]/ul/li[3]'));
                            var city = await cityElement.getText();
                            var countryElement = await driverjobdetails.findElement(By.xpath('//*[@id="rdMainContent"]/form/div[2]/div[2]/div[1]/div[1]/ul/li[2]'));
                            var country = await countryElement.getText();

                            job.JOB_LOCATION_CITY = city.replace('Location:', '').trim();
                            job.JOB_LOCATION_COUNTRY = country.replace('Country:', '').trim();

                            var categoryElement = await driverjobdetails.findElement(By.xpath('//*[@id="rdMainContent"]/form/div[2]/div[2]/div[1]/div[2]/ul/li[3]'));
                            var category = await categoryElement.getText();
                            job.JOB_CATEGORY = category.replace('Functional Area:', '').trim();

                            var statusElement = await driverjobdetails.findElement(By.xpath('//*[@id="rdMainContent"]/form/div[2]/div[2]/div[1]/div[2]/ul/li[1]'));
                            var jobStatus = await statusElement.getText();
                            if (jobStatus) {
                                var status = jobStatus.split("Job Type:");
                                job.JOB_STATUS = status[1].trim();
                            }

                            var type = await driverjobdetails.findElement(By.xpath('//*[@id="rdMainContent"]/form/div[2]/div[2]/div[1]/div[2]/ul/li[2]')).getText();
                            if (type) {
                                var jobType = type.split("Employment Type:");
                                job.JOB_TYPE = jobType[1].trim();
                            }

                            var JobDescription = await driverjobdetails.findElement(By.xpath('//*[@id="jobDetailsDetails"]/div[2]'));
                            var desc = await JobDescription.getAttribute("outerHTML");

                            if (desc) {
                                job.TEXT = await HtmlEscape(desc);
                            }
                            jobMaker.successful.add(job, botScheduleID);
                        }
                        counter++;
                    } catch (e) {
                        jobMaker.failed.add(job.JDTID_UNIQUE_NUMBER, e.message);
                        counter++;
                    }
                }
            } while (isPresent);
            try {
                var nextContainer = await driver.findElements(By.xpath('//input[@value=">"]'));
                var next = nextContainer.length;
                if (next == 2) {
                    var nextLink = await driver.findElement(By.xpath('//input[@value=">"]'));
                    await nextLink.click();
                    loop = true;
                }
            } catch (e) {
                var ex = e.message;
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

async function HtmlEscape(description) {
    description = he.encode(description, { 'useNamedReferences': true, 'decimal': true, 'allowUnsafeSymbols': true });
    description = await description.replace(/&#9;/g, ' ');
    description = await description.replace(/&nbsp;/g, '');
    description = await description.replace(/\s\s+/g, ' ');
    description = await description.replace(/\r?\n|\r/g, '');
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
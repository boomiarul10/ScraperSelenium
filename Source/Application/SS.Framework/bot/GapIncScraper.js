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

        await driver.get('https://gapinternationalsourcing.catsone.com/careers/');

        var pager = await driver.findElements(By.xpath('//*[@id="jobListingsContent"]/div/ul[@class="pager"]/li'));
        var pages = await pager.length;
        var count = pages - 3;
        var lastPage = await driver.findElement(By.xpath('//*[@id="jobListingsContent"]/div/ul[@class="pager"]/li[' + (pages - 1) + ']/a'));
        await lastPage.click();
        var jobCount = await driver.findElements(By.xpath('//*[@class="jobID"]'));
        var atsCount = await jobCount.length;
        var atsJobCount = (count * 20) + atsCount;
        jobMaker.setatsJobCount(parseInt(atsJobCount));

        var categoryElement = await driver.findElement(By.xpath('//*[@id="stepListings"]/div[2]/div[2]/select[@class="categorySelect"]'));
        var optionArray = await categoryElement.findElements(By.tagName('option'));

        for (var i = 2; i <= optionArray.length; i++) {
            var option = await driver.findElement(By.xpath('//*[@id="stepListings"]/div[2]/div[2]/select[@class="categorySelect"]/Option[' + i + ']'));
            var category = await option.getAttribute('text');
            await option.click();
            var submitElement = await driver.findElement(By.xpath('//input[@id="searchButton"]'));
            await submitElement.click();

            var loop;
            do {
                var prime = 3;
                loop = false;
                do {
                    var jobContainer = await driver.findElements(By.xpath("//*[@id='jobListings']/tbody/tr[" + prime + "]"));
                    var isPresent = await jobContainer.length;
                    if (isPresent) {
                        try {
                            var job = jobMaker.create();

                            var titleElement = await driver.findElement(By.xpath("//*[@id='jobListings']/tbody/tr[" + prime + "]/td[2]/a"));
                            var title = await titleElement.getText();
                            var idElement = await driver.findElement(By.xpath("//*[@id='jobListings']/tbody/tr[" + prime + "]/td[4]"));
                            var jobId = await idElement.getText();

                            //var urlElement = await driver.findElement(By.xpath("//*[@class='cssSearchResults']/tbody/tr[" + prime + "]/td[2]/a"));
                            var url = await titleElement.getAttribute("href");

                            await driverjobdetails.get(url);

                            var locationElement = await driverjobdetails.findElement(By.xpath("//*[@id='jobDetailLocation']"));
                            var location = await locationElement.getText();
                            var dateElement = await driverjobdetails.findElement(By.xpath("//*[@id='jobDetailPosted']"));
                            var date = await dateElement.getText();
                            var applyURLElement = await driverjobdetails.findElement(By.xpath("//*[@id='jobDetails']/div[1]/div/a"));
                            var applyURL = await applyURLElement.getAttribute("href");
                            var jobDescription = await driverjobdetails.findElement(By.xpath("//*[@class='detailsJobDescription']/table/tbody/tr[1]/td"));
                            var description = await jobDescription.getAttribute("outerHTML");


                            job.JOB_TITLE = title;
                            job.JDTID_UNIQUE_NUMBER = jobId;
                            job.TEXT = HtmlEscape(description);
                            job.JOB_CATEGORY = category;
                            job.JOB_APPLY_URL = applyURL;
                            if (location) {
                                location = location.replace("Location:", "");
                                var loc = location.split(",");
                                if (loc.length == 2) {
                                    job.JOB_LOCATION_CITY = loc[0];
                                    job.JOB_LOCATION_COUNTRY = loc[1];
                                }
                                else if (loc.length == 3) {
                                    job.JOB_LOCATION_CITY = loc[0] + "," + loc[1];
                                    job.JOB_LOCATION_COUNTRY = loc[2];
                                }
                            }
                            date = date.replace("Date Posted:", "");
                            job.ASSIGNMENT_START_DATE = date;

                            jobMaker.successful.add(job, botScheduleID);
                            prime += 2;
                        }
                        catch (e) {
                        jobMaker.failed.add(job.JDTID_UNIQUE_NUMBER, e.message);
                        prime += 2;
                        }
                    }
                } while (isPresent);
                try {
                    var HomeElement = await driver.findElements(By.xpath('//*[@id="jobListingsContent"]/div/ul/li[4]/a[@class="pageSelector"]'));
                    var home = await HomeElement.length;
                    if (home) {
                        var nextLink = await driver.findElement(By.xpath('//*[@id="jobListingsContent"]/div/ul/li[4]/a[@class="pageSelector"]'));
                        await nextLink.click();
                        loop = true;
                    }
                }
                catch (e) { }
            } while (loop);
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
    description = description.replace(/&nbsp;/g, '');
    description = description.replace(/\s\s+/g, ' ');
    description = description.replace(/\r?\n|\r/g, '');
    description = description.replace(/ZeroWidthSpace;/g, '#8203;');
    description = description.replace(/mldr/g, 'hellip;');
    return description;
}


var snippet = async (configuration, atsJobCount, failedJobCount, jobs, onsuccess, onfailure) => {
    await service.bot.setProgress(botScheduleID, log.logType.activity, log.activity.snippet.download + "feedgeneratorwithasync");
    var snippet = await package.resource.download.snippet("feedgeneratorwithasync");
    var input = await snippet.createInput(configuration, jobs);

    var jobcount = await snippet.execute(input);
    try {
        var output = await package.service.bot.createBotOutput(configuration.scheduleid, jobcount, jobMaker.atsJobCount, jobMaker.failedJobs.length);
        onsuccess(output);
    }
    catch (err) {
        var output = package.service.bot.createBotErrorOutput(configuration.scheduleid, jobMaker.jobs.length, jobMaker.atsJobCount, jobMaker.failedJobs.length, err);
        onfailure(output);
    }
}
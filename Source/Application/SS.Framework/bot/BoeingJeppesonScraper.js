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


        await driver.get('https://jeppesen.referrals.selectminds.com/jobs/search/77791');

        var atsJobCount = await driver.findElement(By.xpath('//*[@id="jobs_filters_title"]/div/span')).getText();
        jobMaker.setatsJobCount(parseInt(atsJobCount));


        var loop;
        var pagenumber = 1;
        var count;
        do {
            var counter = 1;
            await driver.wait(until.elementLocated(By.id('job_results_list_hldr')), 5000);
            loop = false;
            do {
                if (counter % 2 == 0) {
                    count = counter / 2;
                    var jobContainer = await driver.findElements(By.xpath('//*[@id="job_results_list_hldr"]/div[@class="job_list_row jlr_Even "][' + count + ']'));
                }
                else {
                    if (counter <= 1) { count = 1; }
                    else { count = (counter + 1) / 2; }
                    var jobContainer = await driver.findElements(By.xpath('//*[@id="job_results_list_hldr"]/div[@class="job_list_row jlr_Odd "][' + count + ']'));
                }
                var isPresent = await jobContainer.length;
                if (isPresent) {
                    try {
                        var job = jobMaker.create();

                        if (counter % 2 == 0) {
                            count = counter / 2;
                            var titleElement = await driver.findElement(By.xpath('//*[@id="job_results_list_hldr"]/div[@class="job_list_row jlr_Even "][' + count + ']/div/div/p/a'));
                            var title = await titleElement.getText();
                            var categoryElement = await driver.findElement(By.xpath('//*[@id="job_results_list_hldr"]/div[@class="job_list_row jlr_Even "][' + count + ']//*[@class="category"]'));
                            var category = await categoryElement.getText();
                            var locationElement = await driver.findElement(By.xpath('//*[@id="job_results_list_hldr"]/div[@class="job_list_row jlr_Even "][' + count + ']//*[@class="location"]'));
                            var otherLocations = await locationElement.getText();
                        }
                        else {
                            if (counter <= 1) { count = 1; }
                            else { count = (counter + 1) / 2; }
                            var titleElement = await driver.findElement(By.xpath('//*[@id="job_results_list_hldr"]/div[@class="job_list_row jlr_Odd "][' + count + ']/div/div/p/a'));
                            var title = await titleElement.getText();
                            var categoryElement = await driver.findElement(By.xpath('//*[@id="job_results_list_hldr"]/div[@class="job_list_row jlr_Odd "][' + count + ']//*[@class="category"]'));
                            var category = await categoryElement.getText();
                            var locationElement = await driver.findElement(By.xpath('//*[@id="job_results_list_hldr"]/div[@class="job_list_row jlr_Odd "][' + count + ']//*[@class="location"]'));
                            var otherLocations = await locationElement.getText();
                        }

                        var url = await titleElement.getAttribute('href');

                        await driverjobdetails.get(url);

                        var descriptionElement = await driverjobdetails.findElement(By.xpath('//*[@class="job_description"]'));
                        var description = await descriptionElement.getAttribute("outerHTML");

                        job.JOB_TITLE = title;

                        var Id = url.split("-");
                        var length = Id.length - 1;
                        var jobid = Id[length];
                        job.JDTID_UNIQUE_NUMBER = jobid;

                        job.TEXT = HtmlEscape(description);
                        job.JOB_CATEGORY = category;
                        if (otherLocations != null) {
                            var loc = otherLocations.split(",");
                            job.JOB_LOCATION_CITY = loc[0];
                            if (loc[1].indexOf('-') > 0) {
                                var state = loc[1].split("-");
                                job.JOB_LOCATION_STATE = state[1];
                            }
                            else {
                                job.JOB_LOCATION_STATE = loc[1];
                            }
                            if (loc[2].indexOf('-') > 0) {
                                var country = loc[2].split("-");
                                job.JOB_LOCATION_COUNTRY = country[1];
                            }
                            else {
                                job.JOB_LOCATION_COUNTRY = loc[2];
                            }
                        }
                        if (job.JOB_LOCATION_COUNTRY.indexOf('United States') >= 0) {
                            job.JOB_LOCATION_COUNTRY = 'United States';
                        }
                        job.JOB_LOCATION_CITY = job.JOB_LOCATION_CITY.replace('&#x1F50D;', '');
                        job.JOB_APPLY_URL = url;
                        jobMaker.successful.add(job, botScheduleID);
                        counter++;
                    } catch (e) {
                        jobMaker.failed.add(job.JDTID_UNIQUE_NUMBER, e.message);
                        counter++;
                    }
                }
            } while (isPresent);

            try {
                var nextContainer = await driver.findElements(By.xpath('//*[@id="jPaginationHldr"]/div/a[@class="next"]'));
                var next = nextContainer.length;
                if (next) {
                    var nextLink = await driver.findElement(By.xpath('//*[@id="jPaginationHldr"]/div/a[@class="next"]'));
                    var nextPage = await nextLink.getAttribute('href');
                    nextPage = nextPage.split('#');
                    var nextURL = "https://jeppesen.referrals.selectminds.com/jobs/search/77791/" + nextPage[1];
                    await driver.get(nextURL);
                    loop = true;
                    pagenumber++;
                }
            } catch (e) {

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
function HtmlEscape(description) {
    description = he.encode(description, { 'useNamedReferences': true, 'decimal': true, 'allowUnsafeSymbols': true });
    description = description.replace(/&#x9;/g, '');
    //description = description.replace(/\&nbsp;/g, '');
    description = description.replace(/&#9;/g, '');
    description = description.replace(/^\s+|\s+$/g, '');
    description = description.replace(/\r?\n|\r/g, '');
    return description;
}

var snippet = async (configuration, atsJobCount, failedJobCount, jobs, onsuccess, onfailure) => {
    await service.bot.setProgress(botScheduleID, log.logType.activity, log.activity.snippet.download + "feedgenerator");
    var snippet = await package.resource.download.snippet("feedgenerator");
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


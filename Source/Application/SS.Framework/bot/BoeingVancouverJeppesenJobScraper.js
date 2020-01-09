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


        await driver.get('https://jeppesen.referrals.selectminds.com/boeingvancouver/jobs/search/82819');

        var atsJobCount = await driver.findElement(By.xpath('//*[@id="jobs_filters_title"]/div/span')).getText();
        jobMaker.setatsJobCount(parseInt(atsJobCount));


        var loop;
        var pagenumber = 1;
        do {
            var counter = 1;
            await driver.wait(until.elementLocated(By.id('job_results_list_hldr')), 5000);
            loop = false;
            do {

                var jobContainer = await driver.findElements(By.xpath('//*[@id="job_results_list_hldr"]/div[contains(@id, "job_list")][' + counter + ']'));

                var isPresent = await jobContainer.length;
                if (isPresent) {
                    try {
                        var job = jobMaker.create();
                        var Id = undefined;
                        var length = undefined;
                        var jobid = undefined;
                        var url = undefined;
                        var location = undefined;
                        var description = undefined;

                        var titleElement = await driver.findElement(By.xpath('//*[@id="job_results_list_hldr"]/div[contains(@id, "job_list")][' + counter + ']/div/div/p/a'));
                        job.JOB_TITLE = await titleElement.getText();
                        var categoryElement = await driver.findElement(By.xpath('//*[@id="job_results_list_hldr"]/div[contains(@id, "job_list")][' + counter + ']//*[@class="category"]'));
                        job.JOB_CATEGORY = await categoryElement.getText();
                        url = await titleElement.getAttribute('href');

                        Id = url.split("-");
                        length = Id.length - 1;
                        jobid = Id[length];
                        job.JDTID_UNIQUE_NUMBER = jobid;



                        await driverjobdetails.get(url);


                        var locationElement = await driverjobdetails.findElement(By.xpath('//*[@id="job_details_content"]//*[@class="primary_location"]'));
                        location = await locationElement.getText();

                        var descriptionElement = await driverjobdetails.findElement(By.xpath('//*[@class="job_description"]'));
                        description = await descriptionElement.getAttribute("outerHTML");

                        job.TEXT = HtmlEscape(description);

                        if (location) {
                            var rex = /.*,.*,\s(.*)/;
                            var rexPresent = rex.test(location);
                            
                            if (rexPresent) {
                                var countryData1 = rex.exec(location);
                                job.JOB_LOCATION_COUNTRY = countryData1[1];
                            } 
                            rex.lastIndex = 0;

                            var stateRex = /.*,\s(.*),.*/;
                            var stateRexPresent = stateRex.test(location);

                            if (stateRexPresent) {
                                var stateData1 = stateRex.exec(location);
                                job.JOB_LOCATION_STATE = stateData1[1];
                                if (job.JOB_LOCATION_STATE){
                                    var stateRex1 = /.*-(.*)/;
                                    var stateRex1Present = stateRex1.test(job.JOB_LOCATION_STATE);
                                    if (stateRex1Present) {
                                        var stateData2 = stateRex1.exec(job.JOB_LOCATION_STATE);
                                        job.JOB_LOCATION_STATE = stateData2[1];
                                    }
                                }
                            } 
                            stateRex1.lastIndex = 0;
                            stateRex.lastIndex = 0;

                            var cityRex = /(.*),.*,.*/;
                            var cityRexPresent = cityRex.test(location);

                            if (cityRexPresent) {
                                var cityData1 = cityRex.exec(location);
                                job.JOB_LOCATION_CITY = cityData1[1];
                            }

                            cityRex.lastIndex = 0;

                        }
                        
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
                    var nextURL = "https://jeppesen.referrals.selectminds.com/boeingvancouver/jobs/search/82819/" + nextPage[1];
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
    description = description.replace(/\&nbsp;/g, ' ');
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


var Promise = require('promise');
var package = global.createPackage();
var he = require('he');
//var cleanHtml = require('clean-html');
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
               
        await driver.get('https://scjohnson.gr8people.com/index.gp?method=cappportal.showPortalSearch&sysLayoutID=123');
        await driver.sleep(5000);
        var searchElement = await driver.findElement(By.xpath('//span[@class="form-input-group-btn"]/button'));
        await searchElement.click();
        var jobcount = await driver.findElements(By.xpath('//div[@class="search-pagination btn-toolbar"]/div[@class="btn-group"]/span'));
        var count = await jobcount[0].getText();
        var atsjobcount = await count.split("of");
        var atscount = atsjobcount[1];
        jobMaker.setatsJobCount(parseInt(atscount));

        var pagenumber = 2;
        do {            
            var loop = false;
            var i = 1;
            do {                                             
                   var jobContainer = await driver.findElements(By.xpath('//tbody[contains(@id,"search-results")]/tr[' + i + ']'));
                    var isPresent = await jobContainer.length;
                    if (isPresent) {
                        try {  
                        var job = jobMaker.create();

                        var titleElement = await driver.findElement(By.xpath('//tbody[contains(@id,"search-results")]/tr[' + i + ']/td[1]/a'));
                        job.JOB_TITLE = await titleElement.getText();

                        var idElement = await driver.findElement(By.xpath('//tbody[contains(@id,"search-results")]/tr[' + i + ']/td[2]'));
                        job.JDTID_UNIQUE_NUMBER = await idElement.getText();

                        var categoryElement = await driver.findElement(By.xpath('//tbody[contains(@id,"search-results")]/tr[' + i + ']/td[3]'));
                        job.JOB_CATEGORY = await categoryElement.getText();

                        var locationElement = await driver.findElement(By.xpath('//tbody[contains(@id,"search-results")]/tr[' + i + ']/td[4]'));
                        var location = await locationElement.getText();

                        var loc = await location.split(",");
                        job.JOB_LOCATION_CITY = loc[0];
                        job.JOB_LOCATION_STATE = loc[1];

                        var joburl = await titleElement.getAttribute("href");
                        job.JOB_APPLY_URL = joburl;
                        await driverjobdetails.get(joburl);

                        await driverjobdetails.wait(until.elementLocated(By.xpath('//div[@class="job-details"]//div[@class="tpl-rowcol"]')), 3000);
                        var jobDescription = await driverjobdetails.findElement(By.xpath('//div[@class="job-details"]//div[@class="tpl-rowcol"]'));
                        var desc = await jobDescription.getAttribute("outerHTML");

                        if (desc) {
                            job.TEXT = HtmlEscape(desc);
                        }
                        jobMaker.successful.add(job, botScheduleID);
                        i++
                        }
                        catch (e) {
                            jobMaker.failed.add(job.JDTID_UNIQUE_NUMBER, e.message);
                            i++;
                        }
                    }
                
            } while (isPresent);
            try {
                var HomeElement = await driver.findElements(By.xpath('//div[@data-pager="footer"]/a[@title="Next" and @class="btn"]'));
                var home = await HomeElement.length;
                if (home) {
                    loop = true;
                    await driver.get("https://scjohnson.gr8people.com/index.gp?method=cappportal.showPortalSearch&sysLayoutId=123&page=" + pagenumber);
                    pagenumber++;                                  
                }
            }
            catch (e) { }
        } while (loop);
        await driver.quit();
        await driverjobdetails.quit();
        await snippet(configuration, jobMaker.atsJobCount, jobMaker.failedJobs.length, jobMaker, onsuccess, onfailure);
    } catch (e) {
        await driver.quit();
        await driverjobdetails.quit();
        var output = package.service.bot.createBotErrorOutput(configuration.scheduleid, jobMaker.jobs.length, jobMaker.atsJobCount, jobMaker.failedJobs.length, e);
        onfailure(output);
    }
}
function HtmlEscape(description) {
    description = he.encode(description, { 'useNamedReferences': true, 'decimal': true, 'allowUnsafeSymbols': true });
    description = description.replace(/&#9;/g, ' ');
    description = description.replace(/&nbsp;/g, ' ');
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


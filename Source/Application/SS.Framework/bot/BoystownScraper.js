var Promise = require('promise');
var package = global.createPackage();
var he = require('he');
var service = package.service;
var resource = package.resource;
var log = resource.constants.log;
var selenium = package.scrape.selenium();
var jobMaker = package.resource.download.variable("job");

jobMaker.setAlertCount(10);
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
    botScheduleID = configuration.scheduleid;
    var By = selenium.By;
    var until = selenium.until;
    var driver = selenium.createDriver(configuration.configuration.execBotConfig.browsertype.toLowerCase());


    var jobs = new Array();
    var jobCount;


    try {
        await driver.get('https://ch.tbe.taleo.net/CH05/ats/careers/jobSearch.jsp?org=BOYSTOWN&cws=1&rid=6330');
        var searchElement = await driver.findElement(By.xpath('//*[@name="tbe_cws_submit"]'));
        await searchElement.click();
        var countElement = await driver.findElement(By.xpath('//*[@id="main-content"]/table/tbody/tr[2]/td/b'));
        var record = await countElement.getText();
        jobMaker.setatsJobCount(parseInt(record));
        await driver.findElements(By.xpath('//*[@id="cws-search-results"]/tbody/tr'));

        var prime = 2;
        do {
            var jobList = await driver.findElements(By.xpath('//*[@id="cws-search-results"]/tbody/tr[' + prime + ']'));
            var ispresent = jobList.length;
            if (ispresent) {
                try {
                    var job = jobMaker.create();
                    var title = await driver.findElement(By.xpath("//*[@id='cws-search-results']/tbody/tr[" + prime + "]/td[1]/b/a")).getText();
                    if (title != null) {
                        var urlElement = await driver.findElement(By.xpath("//*[@id='cws-search-results']/tbody/tr[" + prime + "]/td[1]/b/a")).getAttribute('href');
                        var clickElement = await driver.findElement(By.xpath("//*[@id='cws-search-results']/tbody/tr[" + prime + "]/td[1]/b/a"));
                        await clickElement.click();
                        var location = await driver.findElement(By.xpath("//*[@id='main-content']/table/tbody/tr[3]/td[2]")).getText();
                        var category = await driver.findElement(By.xpath("//*[@id='main-content']/table/tbody/tr[4]/td[2]")).getText();
                        var status = await driver.findElement(By.xpath("//*[@id='main-content']/table/tbody/tr[5]/td[2]")).getText();
                        var descriptionElement = await driver.findElements(By.xpath('//*[@id="main-content"]/table/tbody/tr[9]/td/table/tbody/tr[1]/td/table/tbody/tr/td/table/tbody/tr/td/table/tbody/tr/td'));
                        var isDesc = descriptionElement.length;
                        if (isDesc) {
                            var descElement = await driver.findElement(By.xpath('//*[@id="main-content"]/table/tbody/tr[9]/td/table/tbody/tr[1]/td/table/tbody/tr/td/table/tbody/tr/td/table/tbody/tr/td'));
                            var description = await descElement.getAttribute("innerHTML");
                        }
                        else {
                            var description = await driver.findElement(By.xpath("//*[@id='main-content']/table/tbody/tr[9]/td")).getAttribute("innerHTML");
                        }
                        var previousElement = await driver.findElement(By.xpath("//*[@title='Back to Search Results']"));
                        await previousElement.click();
                        job.JOB_TITLE = title;
                        job.JOB_CATEGORY = category;
                        var id = urlElement.split("rid=");
                        job.JDTID_UNIQUE_NUMBER = id[1];
                        job.JOB_APPLY_URL = "https://ch.tbe.taleo.net/CH05/ats/careers/apply.jsp?org=BOYSTOWN&cws=1&rid=" + job.JDTID_UNIQUE_NUMBER;
                        if (location != null) {
                            if (location.indexOf('-') < 1) {
                                job.JOB_LOCATION_STATE = location.replace('Washington, D.C.', 'District Of Columbia');
                            }
                            else {
                                var loc = location.split('-');
                                job.JOB_LOCATION_CITY = loc[1];
                                job.JOB_LOCATION_STATE = loc[0];
                            }
                        }
                        job.JOB_STATUS = status;
                        description = description.replace('<tr>', '').replace('<td>', '').replace('<tbody>', '').replace('<th>', '').replace('<table>', '').replace('</tr>', '').replace('</td>', '').replace('</tbody>', '').replace('</th>', '').replace('</table>', '');
                        description = description + "<br>";
                        job.TEXT = HtmlEscape(description);
                        jobMaker.successful.add(job, botScheduleID);
                        prime++;
                    }
                }

                catch (e) {
                    jobMaker.failed.add(job.JDTID_UNIQUE_NUMBER, e.message);
                    prime++;
                }
            }
        } while (ispresent);

        driver.quit();
        await snippet(configuration, jobMaker.atsJobCount, jobMaker.failedJobs.length, jobMaker, onsuccess, onfailure);
    }

    catch (err) {

        driver.quit();
        var output = package.service.bot.createBotErrorOutput(configuration.scheduleid, jobMaker.jobs.length, jobMaker.atsJobCount, jobMaker.failedJobs.length, err);
        onfailure(output);
    }
}

function HtmlEscape(description) {
    description = he.encode(description, { 'useNamedReferences': true, 'decimal': true, 'allowUnsafeSymbols': true });
    description = description.replace(/&#x9;/g, '');
    description = description.replace(/&nbsp;/g, '');
    description = description.replace(/&#9;/g, '');
    description = description.replace(/^\s+|\s+$/g, '');
    description = description.replace(/\r?\n|\r/g, '');
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

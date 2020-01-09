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

        await driver.get('http://careers.peopleclick.com/careerscp/client_hospice_fl_suncoast/external/search.do?functionName=getSearchCriteria');
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
                var jobContainer = await driver.findElements(By.xpath('//*[@id="searchResultsTable"]/tbody/tr[' + counter + ']/td[7]'));
                var isPresent = await jobContainer.length;
                if (isPresent) {
                    try {
                        var job = jobMaker.create();

                        var titleElement = await driver.findElement(By.xpath('//*[@id="searchResultsTable"]/tbody/tr[' + counter + ']/td[7]'));
                        job.JOB_TITLE = await titleElement.getText();
                        var idElement = await driver.findElement(By.xpath('//*[@id="searchResultsTable"]/tbody/tr[' + counter + ']/td[9]'));
                        job.JDTID_UNIQUE_NUMBER = await idElement.getText();
                        var dateElement = await driver.findElement(By.xpath('//*[@id="searchResultsTable"]/tbody/tr[' + counter + ']/td[13]'));
                        job.ASSIGNMENT_START_DATE = await dateElement.getText();
                        var locationElement = await driver.findElement(By.xpath('//*[@id="searchResultsTable"]/tbody/tr[' + counter + ']/td[11]'));
                        var location = await locationElement.getText();

                        if (location) {
                            if (location.includes("-")) {
                                job.JOB_INDUSTRY = location;
                                var loc;
                                var value;
                                if (location.indexOf("-") > -1) {
                                    loc = location.split("-");
                                    value = loc[0].split(",");
                                    job.JOB_LOCATION_CITY = value[0];
                                    job.JOB_LOCATION_STATE = value[1];
                                }
                                else {
                                    loc = location.split(",");
                                    value = loc[1].split(" ");
                                    job.JOB_LOCATION_CITY = loc[0];
                                    job.JOB_LOCATION_STATE = value[1];
                                }
                            }
                            else {
                                job.JOB_INDUSTRY = location;
                                loc = location.split(",");
                                value = loc[1].split(" ");
                                job.JOB_LOCATION_CITY = loc[0];
                                job.JOB_LOCATION_STATE = value[1];
                            }
                        }

                        var urlElement = await driver.findElement(By.xpath('//*[@id="searchResultsTable"]/tbody/tr[' + counter + ']/td[7]/a'));
                        var id = await urlElement.getAttribute("href");
                        await driverjobdetails.get(id);

                        var jobdetailspage = await driverjobdetails.findElements(By.xpath("//*[@id='pc-rtg-main']/form/table[3]/tbody/tr/td"));
                        var isDetailPage = await jobdetailspage.length;
                        if (isDetailPage) {

                            if (id) {
                                var applyurl = id.split("jobPostId=");
                                var apply = applyurl[1].split("&locale");
                                job.JOB_APPLY_URL = "http://careers.peopleclick.com/careerscp/client_hospice_fl_suncoast/external/gateway.do?functionName=viewFromLink&jobPostId=" + apply[0] + "&localeCode=en-us";
                            }

                            var categoryElement = await driverjobdetails.findElement(By.xpath("//*[@id='pc-rtg-main']/form/table[1]/tbody/tr[2]/td[1]/font/span"));
                            var category = await categoryElement.getText();
                            job.JOB_CATEGORY = category;

                            var statusElement = await driverjobdetails.findElement(By.xpath("//*[@id='pc-rtg-main']/form/table[1]/tbody/tr[3]/td[2]"));
                            var jobStatus = await statusElement.getText();
                            if (jobStatus) {
                                var status = jobStatus.split("Shift:");
                                job.JOB_STATUS = status[1].trim();
                            }

                            var type = await driverjobdetails.findElement(By.xpath("//*[@id='pc-rtg-main']/form/table[1]/tbody/tr[4]/td[1]")).getText();
                            if (type) {
                                var jobType = type.split(":");
                                job.JOB_TYPE = jobType[1].trim();
                            }

                            var contactcompany = await driverjobdetails.findElement(By.xpath("//*[@id='pc-rtg-main']/form/table[1]/tbody/tr[3]/td[1]")).getText();
                            if (contactcompany) {
                                var company = contactcompany.split(":");
                                job.JOB_CONTACT_COMPANY = company[1];
                            }

                            var JobDescription = await driverjobdetails.findElement(By.xpath("//*[@id='pc-rtg-main']/form/table[3]/tbody/tr/td"));
                            var desc = await JobDescription.getAttribute("outerHTML");

                            if (desc) {
                                var value = desc.split("<table");
                                job.TEXT = value[0].replace("CB*", "").replace("<li><br>", "<li>").replace("<br><p>", "<p>").replace("<p></p>", "").replace("</p><br><ul> <br><ul><br><ul><br><li>", "</p><ul> <ul><ul><li>").replace("<br><br><br><br><br><br>", "<br>").replace(">Position Requirements<", "><br>Position Requirements<").replace('<td width="100%" colspan="2" align="left">', '');
                                job.TEXT = job.TEXT + '<td width="10"> </td> <td> </td>';
                                job.TEXT = await HtmlEscape(job.TEXT);
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
                if (next) {
                    var nextLink = await driver.findElement(By.xpath('//input[@value=">"]'));
                    await nextLink.click();
                    loop = true;
                }
            } catch (e) {

            }
        } while (loop);
        driver.quit();
        driverjobdetails.quit();
        snippet(configuration, jobMaker.atsJobCount, jobMaker.failedJobs.length, jobMaker, onsuccess, onfailure);
    } catch (e) {
        driver.quit();
        driverjobdetails.quit();
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
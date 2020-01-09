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

        await driver.get('https://careers.peopleclick.com/careerscp/Client_BrookhavenLab/postdoc/search.do?functionName=getSearchCriteria');
        var loop;
        var atsJobCount = await driver.findElement(By.xpath('//*[@id="com.peopleclick.cp.formdata.FLD_JP_POSITION_CATEGORY"]/option[1]'));
        var atscount = await atsJobCount.getText();
        var record = atscount.split("(");
        jobMaker.setatsJobCount(parseInt(record[1].replace(")", "")));
        var searchElement = await driver.findElement(By.id('searchButton'));
        await searchElement.click();
        var pagenumber = 1;
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
                        var idElement = await driver.findElement(By.xpath('//*[@id="searchResultsTable"]/tbody/tr[' + counter + ']/td[11]'));
                        job.JDTID_UNIQUE_NUMBER = await idElement.getText();
                        var dateElement = await driver.findElement(By.xpath('//*[@id="searchResultsTable"]/tbody/tr[' + counter + ']/td[13]'));
                        job.ASSIGNMENT_START_DATE = await dateElement.getText();
                        var categoryElement = await driver.findElement(By.xpath('//*[@id="searchResultsTable"]/tbody/tr[' + counter + ']/td[9]'));
                        job.JOB_CATEGORY = await categoryElement.getText();

                        job.JOB_LOCATION_CITY = "Upton";
                        job.JOB_LOCATION_STATE = "NY";
                        job.JOB_LOCATION_COUNTRY = "United States";

                        var urlElement = await driver.findElement(By.xpath('//*[@id="searchResultsTable"]/tbody/tr[' + counter + ']/td[7]/a'));
                        var id = await urlElement.getAttribute("href");
                        if (id) {
                            var url = id.split("jobPostId=");
                            var apply = url[1].split("&");
                            job.JOB_APPLY_URL = "https://careers.peopleclick.com/careerscp/Client_BrookhavenLab/postdoc/jobDetails.do?jobPostId=" + apply[0] + "&localeCode=en-us";
                        }

                        await driverjobdetails.get(id);

                        var jobdetailspage = await driverjobdetails.findElements(By.xpath("//*[@id='pc-rtg-main']/form/table[3]/tbody/tr/td/p[2]"));
                        var isDetailPage = await jobdetailspage.length;
                        if (isDetailPage) {
                            var type = await driverjobdetails.findElement(By.xpath('//*[@id="pc-rtg-main"]/form/table[1]/tbody/tr[2]/td[1]/font')).getText();
                            job.JOB_TYPE = type;
                            var JobDescription = await driverjobdetails.findElement(By.xpath("//*[@id='pc-rtg-main']/form/table[3]/tbody/tr/td"));
                            var desc = await JobDescription.getAttribute("innerHTML");
                            if (desc) {
                                var description = desc.split("Why Work at BNL?</label></span>");

                                var jobDetail = description[1].split("<table");
                                var jobDesc = jobDetail[0].replace("</a></p><a>", "</a></p>");
                                job.TEXT = HtmlEscape(jobDesc);
                            }
                        }
                        jobMaker.successful.add(job, botScheduleID);
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
                    pagenumber++;
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
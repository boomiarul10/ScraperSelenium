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

        await driver.get('https://careers.peopleclick.com/careerscp/client_acs/external/search.do');
        var loop;
        var recordsCount = await driver.findElement(By.xpath("//*[@id='com.peopleclick.cp.formdata.JPM_LOCATION']/option[1]")).getText();
        var record = recordsCount.split("(");
        record = record[1].replace(")", "");
        jobMaker.setatsJobCount(parseInt(record));
        await driver.executeScript("document.getElementById('searchButton').click();");
        do {
            loop = false;
            var counter = 2;
            do {
                var jobContainer = await driver.findElements(By.xpath('//*[@id="searchResultsTable"]/tbody/tr[' + counter + ']/td[3]'));
                var isPresent = await jobContainer.length;
                if (isPresent) {
                    try {
                        var job = jobMaker.create();

                        var idElement = await driver.findElement(By.xpath('//*[@id="searchResultsTable"]/tbody/tr[' + counter + ']/td[4]'));
                        job.JDTID_UNIQUE_NUMBER = await idElement.getText();
                        var titleElement = await driver.findElement(By.xpath('//*[@id="searchResultsTable"]/tbody/tr[' + counter + ']/td[3]'));
                        job.JOB_TITLE = await titleElement.getText();
                        var locationElement = await driver.findElement(By.xpath('//*[@id="searchResultsTable"]/tbody/tr[' + counter + ']/td[5]'));
                        var location = await locationElement.getText();

                        if (location) {
                            if (location.indexOf("-") > -1) {
                                loc = location.split("-");
                                if (loc.length == 2) {
                                    if (!(loc[1].indexOf(",") > -1)) {
                                        job.JOB_LOCATION_CITY = loc[1];
                                        job.JOB_LOCATION_STATE = loc[0];
                                    }
                                }
                                else if (loc.length == 3) {
                                    job.JOB_LOCATION_CITY = loc[1] + "-" + loc[2];
                                    job.JOB_LOCATION_STATE = loc[0];
                                }
                            }
                        }

                        var urlElement = await driver.findElement(By.xpath('//*[@id="searchResultsTable"]/tbody/tr[' + counter + ']/td[3]/a'));
                        var url = await urlElement.getAttribute("href");
                        var id = "";
                        if (url) {
                            job.JOB_APPLY_URL = url;
                        }
                        await driverjobdetails.get(url);

                        var jobdetailspage = await driverjobdetails.findElements(By.xpath("//*[@id='pc-rtg-main']/form/table[4]/tbody/tr/td"));
                        var isDetailPage = await jobdetailspage.length;
                        if (isDetailPage) {
                            var JobDescription1 = await driverjobdetails.findElement(By.xpath('//*[@id="pc-rtg-main"]/form/table[4]/tbody/tr/td'));
                            var desc1 = await JobDescription1.getAttribute("innerHTML");

                            var desc2 = desc1.split('<table width="300"');

                            var postId = url.split("jobPostId=")
                            var jobPostId = postId[1].split("&");
                            var desc3 = '<td width="10"><a href="https://careers.peopleclick.com/careerscp/client_acs/external/jobDetails.do?functionName=getJobDetail&amp;jobPostId=' + jobPostId[0] + '&amp;localeCode=en-us#top"> </a></td><td> </td>'
                            var descr = desc2[0] + desc3;
                            job.TEXT = HtmlEscape(descr);

                            var categoryElement = await driverjobdetails.findElement(By.xpath("//*[@id='pc-rtg-main']/form/table[2]/tbody/tr[2]/td[1]/font/span"));
                            job.JOB_CATEGORY = await categoryElement.getText();

                            var type = await driverjobdetails.findElement(By.xpath("//*[@id='pc-rtg-main']/form/table[2]/tbody/tr[3]/td[1]/font/span")).getText();
                            job.JOB_TYPE = type;

                            var jobEducation = await driverjobdetails.findElement(By.xpath("//*[@id='pc-rtg-main']/form/table[2]/tbody/tr[3]/td[2]/font/span"));
                            job.EDUCATION = await jobEducation.getText();

                            var industryElement = await driverjobdetails.findElement(By.xpath("//*[@id='pc-rtg-main']/form/table[2]/tbody/tr[2]/td[2]/font/span"));
                            job.JOB_INDUSTRY = await industryElement.getText();

                            var qualificationElement = await driverjobdetails.findElement(By.xpath("//*[@id='pc-rtg-main']/form/table[2]/tbody/tr[4]/td[1]/font/span"));
                            job.QUALIFICATIONS = await qualificationElement.getText();

                            var relocationElement = await driverjobdetails.findElement(By.xpath("//*[@id='pc-rtg-main']/form/table[2]/tbody/tr[4]/td[2]/font/span"));
                            job.RELOCATION = await relocationElement.getText();
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
    description = description.replace(/&#9;/g, '');
    description = description.replace(/^\s+|\s+$/g, '');
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
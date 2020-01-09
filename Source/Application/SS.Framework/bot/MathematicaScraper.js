var Promise = require('promise');
var cleanHtml = require('clean-html');
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

        await driver.get('https://careers.peopleclick.com/careerscp/client_mathematica/external/search.do');
        var loop;
        var atsJobCount = await driver.findElement(By.xpath('//*[@id="com.peopleclick.cp.formdata.JPM_LOCATION"]/option[1]'));
        var atscount = await atsJobCount.getAttribute('text');
        var record = atscount.split("(");
        jobMaker.setatsJobCount(parseInt(record[1].replace(")", "").trim()));

        await driver.executeScript("document.getElementById('searchButton').click();");
        do {
        await driver.sleep(4000);

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

                        var urlElement = await driver.findElement(By.xpath('//*[@id="searchResultsTable"]/tbody/tr[' + counter + ']/td[7]/a'));
                        var id = await urlElement.getAttribute("href");
                        await driverjobdetails.get(id);
                        if (id) {
                            var applyurl = id.replace("jobDetails.do", "gateway.do").replace("getJobDetail", "viewFromLink");
                            job.JOB_APPLY_URL = applyurl;
                        }

                        var jobdetailspage = await driverjobdetails.findElements(By.xpath("//*[@id='pc-rtg-main']/form/table[3]/tbody/tr/td"));
                        var isDetailPage = await jobdetailspage.length;
                        if (isDetailPage) {

                            var categoryElement = await driverjobdetails.findElement(By.xpath("//*[@id='pc-rtg-main']/form/table[1]//td[contains(text(),'Functional Area')]//span"));
                            var category = await categoryElement.getText();
                            job.JOB_CATEGORY = category;

                            var statusElement = await driverjobdetails.findElement(By.xpath("//*[@id='pc-rtg-main']/form/table[1]//td[contains(text(),'Position Type')]//span"));
                            var jobStatus = await statusElement.getText();
                            if (jobStatus) {
                                job.JOB_STATUS = jobStatus.trim();
                            }
                            var type = await driverjobdetails.findElement(By.xpath("//*[@id='pc-rtg-main']/form/table[1]//td[contains(text(),'Department')]//span")).getText();
                            if (type) {
                                job.JOB_TYPE = type.trim();
                            }
                            var relocation = await driverjobdetails.findElement(By.xpath("//*[@id='pc-rtg-main']/form/table[1]//td[contains(text(),'Location')]//span")).getText();
                            if (relocation) {
                                relocation = relocation.replace('Multiple', '');
                                job.OTHER_LOCATIONS = relocation.replace('Remote', 'Remote,');
                            }
                            var JobDescription = await driverjobdetails.findElement(By.xpath("//*[@id='pc-rtg-main']/form/table[3]/tbody/tr/td"));
                            var desc = await JobDescription.getAttribute("outerHTML");

                            var jobText = "";
                            var optionTag = {
                                'add-remove-tags': ['a', 'image'],
                                'remove-attributes': [],
                                'remove-tags': []
                            };

                            cleanHtml.clean(desc, optionTag, function (html) {
                                jobText = html;
                            });

                            if (desc) {
                                jobText = jobText.replace("Position Description", "<b>Position Description</b>").
                                    replace("Position Requirements", "<b>Position Requirements</b>").replace("Back to top", "");
                                job.TEXT = await HtmlEscape(jobText);
                            }

                            var jobDescription = "";
                            if (job.OTHER_LOCATIONS == "") {

                                var JobDescription = await driverjobdetails.findElement(By.xpath("//*[@id='pc-rtg-main']/form/table[3]/tbody/tr/td"));
                                jobDescription = await JobDescription.getText();

                                var text = jobDescription;
                                if (text.toLowerCase().includes("available locations:")) {
                                    var locVal;
                                    var otherLoc;
                                    if (jobDescription.includes("Available Locations:")) {
                                        locVal = jobDescription.split('Available Locations:');
                                        if (locVal[1].includes('Applicants must submit a cover letter,')) {
                                            otherLoc = locVal[1].split("Applicants must submit a cover letter,");
                                            job.OTHER_LOCATIONS = otherLoc[0].trim();
                                        }
                                        else if (locVal[1].includes('Various federal agencies with')) {
                                            otherLoc = locVal[1].split("Various federal agencies with");
                                            job.OTHER_LOCATIONS = otherLoc[0].trim();
                                        }
                                        else {
                                            otherLoc = locVal[1].split("We");
                                            job.OTHER_LOCATIONS = otherLoc[0].trim();
                                        }
                                    }
                                    else if (jobDescription.includes("Available locations:")) {

                                        locVal = jobDescription.split('Available locations:');
                                        otherLoc = locVal[1].split("We");
                                        job.OTHER_LOCATIONS = otherLoc[0].trim();
                                    }

                                    if (job.OTHER_LOCATIONS) {
                                        if (job.OTHER_LOCATIONS.includes(";")) {
                                            var loc;
                                            var value;
                                            loc = job.OTHER_LOCATIONS.split(";");
                                            var locLength = loc.length;
                                            var index = locLength - 1;
                                            value = loc[index].split(",");
                                            if (value.length == 2) {
                                                job.JOB_LOCATION_CITY = value[0];
                                                job.JOB_LOCATION_STATE = value[1];
                                            }
                                            else if (value.length == 1) {
                                                job.JOB_LOCATION_CITY = value[0];
                                                job.JOB_LOCATION_STATE = value[0];
                                            }
                                        }
                                        else {
                                            var value = job.OTHER_LOCATIONS.split(",");
                                            job.JOB_LOCATION_CITY = value[0];
                                            job.JOB_LOCATION_STATE = value[1];
                                        }

                                        if (job.JOB_LOCATION_CITY == job.JOB_LOCATION_STATE) {
                                            job.JOB_LOCATION_STATE = "";
                                        }
                                    }
                                }
                            }
                            else {
                                var loc = job.OTHER_LOCATIONS.split(",");
                                job.JOB_LOCATION_CITY = loc[0];
                                job.JOB_LOCATION_STATE = loc[1];
                            }
                            job.RELOCATION = job.OTHER_LOCATIONS;
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
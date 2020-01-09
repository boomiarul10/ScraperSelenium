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

        await driver.get('https://prm.healthcaresource.com/JobBoard/JobListings.aspx?cid=ca005ddc-1809-4481-b35e-b361ac0aea02');

        var jobArray = await driver.findElements(By.xpath("//table[@id='gvSearchResults']//tr[@class='search-row' or @class='search-alternating']"));
        var perPageRecord = jobArray.length;
        await driver.sleep(2000);
        var lastPageElemData = await driver.findElement(By.xpath("//select[@class='pager-dropdown']/option[last()]"));
        var lastPageData = await lastPageElemData.getText();
        if (lastPageData) {
            lastPageData = lastPageData.trim();
            var lastPageNumber = parseInt(lastPageData);
            await lastPageElemData.click();
            await driver.sleep(2000);
            var lastPageJobArray = await driver.findElements(By.xpath("//table[@id='gvSearchResults']//tr[@class='search-row' or @class='search-alternating']"));
            var lastPageRecord = lastPageJobArray.length;
            var atsJobCount = (perPageRecord * (lastPageNumber - 1)) + lastPageRecord;
            jobMaker.setatsJobCount(atsJobCount);
        }

        await driver.navigate().refresh();

        //await driver.get('https://prm.healthcaresource.com/JobBoard/JobListings.aspx?cid=ca005ddc-1809-4481-b35e-b361ac0aea02');

        var idData = 10001;
        do {
            loop = false;
            var prime = 1;  
            do {
                var jobContainer = await driver.findElements(By.xpath("//table[@id='gvSearchResults']//tr[@class='search-row' or @class='search-alternating'][" + prime + "]"));
                var isPresent = await jobContainer.length;
                if (isPresent) {
                    try {
                        var job = jobMaker.create();

                        job.JDTID_UNIQUE_NUMBER = idData+"AK";

                        job.COMPANY_URL = "https://prm.healthcaresource.com/JobBoard/JobListings.aspx?cid=ca005ddc-1809-4481-b35e-b361ac0aea02";

                        job.JOB_CONTACT_COMPANY = "Akron's Children Hospital";

                        job.JOB_LOCATION_COUNTRY = "USA";

                        job.JOB_LOCATION_STATE = "Ohio";

                        var titleElement = await driver.findElement(By.xpath("//table[@id='gvSearchResults']//tr[@class='search-row' or @class='search-alternating'][" + prime + "]/td/a"));
                        job.JOB_TITLE = await titleElement.getText();

                        var cityElement = await driver.findElement(By.xpath("//table[@id='gvSearchResults']//tr[@class='search-row' or @class='search-alternating'][" + prime + "]/td[2]/span"));
                        job.JOB_LOCATION_CITY = await cityElement.getText();

                        job.JOB_CATEGORY = "Physician";

                        var typeElement = await driver.findElement(By.xpath("//table[@id='gvSearchResults']//tr[@class='search-row' or @class='search-alternating'][" + prime + "]/td[5]/span"));
                        var typeData = await typeElement.getText();
                        if (typeData) {
                            job.JOB_TYPE = typeData;
                        }

                        var url = await titleElement.getAttribute('href');
                        await driverjobdetails.get(url);

                        if (url) {
                            if (url.includes("?oid=")) {
                                var oidVal = url.split("?oid=").pop().split("&").shift();
                                job.JOB_APPLY_URL = "https://prm.healthcaresource.com/JobBoard/Apply.aspx?cid=ca005ddc-1809-4481-b35e-b361ac0aea02&oid=" + oidVal;
                            }
                        }           
                        
                        var jobDescription = await driverjobdetails.findElement(By.xpath("//form/div/div[3]"));
                        var descriptionText = await jobDescription.getAttribute("outerHTML");
                        job.TEXT = HtmlEscape(descriptionText);

                        jobMaker.successful.add(job, botScheduleID);
                        prime++;
                        idData++;
                    } catch (e) {
                        jobMaker.failed.add(job.JDTID_UNIQUE_NUMBER, e.message);
                        prime++;
                    }
                }
            } while (isPresent);
            try {
                var nextContainer = await driver.findElements(By.xpath("//input[@id='gvSearchResults_ctl13_imgRight']"));
                var next = nextContainer.length;
                if (next == 1) {
                    var nextLink = await driver.findElement(By.xpath("//input[@id='gvSearchResults_ctl13_imgRight']"));
                    await nextLink.click();
                    driver.sleep(1000);
                    loop = true;
                }
            } catch (e) {
            }
        } while (loop);
        await driverjobdetails.quit();
        await driver.quit();
        snippet(configuration, jobMaker.atsJobCount, jobMaker.failedJobs.length, jobMaker, onsuccess, onfailure);
    } catch (e) {
        await driverjobdetails.quit();
        await driver.quit();
        var output = package.service.bot.createBotErrorOutput(configuration.scheduleid, jobMaker.jobs.length, jobMaker.atsJobCount, jobMaker.failedJobs.length, e);
        onfailure(output);
    }
}

function HtmlEscape(description) {
    description = he.encode(description, { 'useNamedReferences': true, 'decimal': true, 'allowUnsafeSymbols': true });
    description = description.replace(/&#9;/g, ' ');
    description = description.replace(/\s\s+/g, ' ');
    description = description.replace(/&nbsp;/g, ' ');
    description = description.replace(/\r?\n|\r/g, '');
    description = description.replace(/ZeroWidthSpace;/g, '#8203;');
    description = description.replace(/&mldr+/g, '&hellip');
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
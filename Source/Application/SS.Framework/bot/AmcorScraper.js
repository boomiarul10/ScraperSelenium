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

        await driver.get('https://career4.successfactors.com/career?company=Amcor&career_ns=job_listing_summary&navBarLevel=JOB_SEARCH');
        var loop;
        var atsJobCount = await driver.wait(until.elementLocated(By.xpath("//table[@class='searchFiltersLeftSection']//td[@class='jobSearchResults']//td[@class='resultsHeaderCounter']/div/span[@class='jobCount']")),2000);
        var atscount = await atsJobCount.getText();
        var record = atscount.split("Jobs");
        jobMaker.setatsJobCount(parseInt(record[0].trim()));
       
        do {
            loop = false;
            var counter = 1;
            do {
                var jobContainer = await driver.findElements(By.xpath("//table[@class='searchFiltersLeftSection']//td[@class='jobSearchResults']//tr[@class='jobResultItem'][" + counter + "]//div[1]/a"));
                var isPresent = await jobContainer.length;
                if (isPresent) {
                    try {
                        var job = jobMaker.create();

                        var titleElement = await driver.findElement(By.xpath("//table[@class='searchFiltersLeftSection']//td[@class='jobSearchResults']//tr[@class='jobResultItem'][" + counter + "]//div[1]/a"));
                        job.JOB_TITLE = await titleElement.getText();
                        var idElement = await driver.findElement(By.xpath("//table[@class='searchFiltersLeftSection']//td[@class='jobSearchResults']//tr[@class='jobResultItem'][" + counter + "]//div[@class='noteSection']/div[1]/span[1]"));
                        job.JDTID_UNIQUE_NUMBER = await idElement.getText();
                        var dateElement = await driver.findElement(By.xpath("//table[@class='searchFiltersLeftSection']//td[@class='jobSearchResults']//tr[@class='jobResultItem'][" + counter + "]//div[@class='noteSection']/div[1]/span[2]"));
                        job.ASSIGNMENT_START_DATE = await dateElement.getText();
                        var categoryElement = await driver.findElement(By.xpath("//table[@class='searchFiltersLeftSection']//td[@class='jobSearchResults']//tr[@class='jobResultItem'][" + counter + "]//div[@class='noteSection']/div[1]/span[3]"));
                        job.JOB_CATEGORY = await categoryElement.getText();

                        var cityElement = await driver.findElement(By.xpath("//table[@class='searchFiltersLeftSection']//td[@class='jobSearchResults']//tr[@class='jobResultItem'][" + counter + "]//div[@class='noteSection']/div[2]/span[2]"));
                        job.JOB_LOCATION_CITY = await cityElement.getText();
                        var stateElement = await driver.findElement(By.xpath("//table[@class='searchFiltersLeftSection']//td[@class='jobSearchResults']//tr[@class='jobResultItem'][" + counter + "]//div[@class='noteSection']/div[2]/span[1]"));
                        job.JOB_LOCATION_STATE = await stateElement.getText();
                        var countryElement = await driver.findElement(By.xpath("//table[@class='searchFiltersLeftSection']//td[@class='jobSearchResults']//tr[@class='jobResultItem'][" + counter + "]//div[@class='noteSection']/div[1]/span[5]"));
                        job.JOB_LOCATION_COUNTRY = await countryElement.getText();

                        var urlElement = await driver.findElement(By.xpath("//table[@class='searchFiltersLeftSection']//td[@class='jobSearchResults']//tr[@class='jobResultItem'][" + counter + "]//div[1]/a"));
                        var id = await urlElement.getAttribute("href");
                        if (id) {
                            var applyUrl = "https://career4.successfactors.com/career?career_ns=job_listing&amp;company=Amcor&amp;navBarLevel=JOB_SEARCH&amp;career_job_req_id=" + job.JDTID_UNIQUE_NUMBER;
                            job.JOB_APPLY_URL = applyUrl;
                        }

                        await driverjobdetails.get(id);                      
                           
                        var JobDescription = await driverjobdetails.wait(until.elementLocated(By.xpath("//div[@class='content']/div[@class='joqReqDescription']")),2000);
                        var desc = await JobDescription.getAttribute("outerHTML");
                            if (desc) { 
                                job.TEXT = HtmlEscape(desc);
                            }
                        jobMaker.successful.add(job, botScheduleID);
                        counter++;
                    } catch (e) {
                    }
                }
            } while (isPresent);

            try {
                var nextContainer = await driver.findElements(By.xpath(".//table[@class='searchFiltersLeftSection']//td[@class='jobSearchResults']//td[@class='resultsHeaderPaginator']//li[contains(@id, 'next')]/a[@title='Next Page']"));
                var next = nextContainer.length;
                if (next) {
                    var nextLink = await driver.findElement(By.xpath("//table[@class='searchFiltersLeftSection']//td[@class='jobSearchResults']//td[@class='resultsHeaderPaginator']//li[contains(@id, 'next')]/a[@title='Next Page']"));
                    await nextLink.click();

                    var jobElement = await driver.wait(until.elementLocated(By.xpath(".//table[@class='searchFiltersLeftSection']//td[@class='jobSearchResults']//tr[@class='jobResultItem']")), 2000);
                    var isTitle = await jobElement.getText();
                    if (isTitle)
                    {
                        loop = true;
                    }
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
        var output = package.service.bot.createBotErrorOutput(configuration.scheduleid, jobMaker.jobs.length, jobMaker.atsJobCount, jobMaker.failedJobs.length, err);
        onfailure(output);
    }
}

function HtmlEscape(description) {
    description = he.encode(description, { 'useNamedReferences': true, 'decimal': true, 'allowUnsafeSymbols': true });
    description = description.replace(/&#9;/g, ' ');
    description = description.replace(/&nbsp;/g, '');
    description = description.replace(/\s\s+/g, ' ');
    description = description.replace(/\r?\n|\r/g, '');
    return description;
}

var snippet = (configuration, atsJobCount, failedJobCount, jobs, onsuccess, onfailure) => {
    service.bot.setProgress(botScheduleID, log.logType.activity, log.activity.snippet.download + "writeObjectToFile").then(values => {
        var snippet = package.resource.download.snippet("writeObjectToFile");
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
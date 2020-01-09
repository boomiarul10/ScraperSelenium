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
        //var driver = selenium.createDriver("chrome");
        //var driverjobdetails = selenium.createDriver("chrome");
        await driver.get('https://recruiting2.ultipro.com/COR1023CMINC/JobBoard/9a888ef5-4447-48b2-ac0c-894b2c6bded6?o=postedDateDesc&f=%5B%5D');
        await driver.sleep(2000);

        var atsJobCountElement = await driver.findElement(By.xpath('//*[@id="SearchCount"]/div[1]/span'));
        var atsjobscount = await atsJobCountElement.getText();

        var atsjbcount = atsjobscount.split("are");
        var atscnt = atsjbcount[1].split("opportunities");
        var atscount = atscnt[0];
        jobMaker.setatsJobCount(parseInt(atscount));

        for (var i = 49; i < atscount - 1;) {
            await driver.executeScript("document.getElementById('LoadMoreJobs').click();");
            await driver.sleep(2000);
            i += 50;
        }       

        var loop;
        do {
            var prime = 1;
            loop = false;
            do {
                var jobContainer = await driver.findElements(By.xpath("//div[@id='Opportunities']/div[3]/div[" + prime + "]"));
                var isPresent = await jobContainer.length;
                if (isPresent) {
                    try {
                        var job = jobMaker.create();
                        var idElement = await driver.findElement(By.xpath("//*[@id='Opportunities']/div[3]/div[" + prime + "]/div[2]/div[1]/div/div[2]/span/span"));
                        var jobid = await idElement.getText();

                        var titleElement = await driver.findElement(By.xpath("//*[@id='Opportunities']/div[3]/div[" + prime + "]/div[1]/div[1]/h3/a"));
                        var title = await titleElement.getText();

                        var categoryElement = await driver.findElement(By.xpath("//div[@id='Opportunities']/div[3]/div[" + prime + "]/div[2]/div[1]/div/div[1]/span/span"));
                        var category = await categoryElement.getText();

                        var jobtypeElement = await driver.findElement(By.xpath("//div[@id='Opportunities']/div[3]/div[" + prime + "]/div[2]/div[1]/div/div[3]/span/span"));
                        var jobtype = await jobtypeElement.getText();

                        var locationsElement = await driver.findElements(By.xpath("//div[@id='Opportunities']/div[3]/div[" + prime + "]//*[@id='Preview']/span[4]/span"));
                        var locations = await locationsElement.length;
                        if (locations) {
                            var locationElem = await driver.findElement(By.xpath("//div[@id='Opportunities']/div[3]/div[" + prime + "]//*[@id='Preview']/span[4]/span"));
                            var location = await locationElem.getText();
                            var loc = await location.split(",");
                            job.JOB_LOCATION_CITY = loc[0];
                            job.JOB_LOCATION_STATE = loc[1];
                            job.JOB_LOCATION_COUNTRY = loc[2];
                        }

                        var urlElement = await driver.findElement(By.xpath("//*[@id='Opportunities']/div[3]/div[" + prime + "]/div[1]/div[1]/h3/a"));
                        var url = await urlElement.getAttribute("href");

                        await driverjobdetails.get(url);
                        await driver.sleep(2000);

                        var jobDescription = await driverjobdetails.findElement(By.xpath("//*[@id='opportunityDetailView']/div[2]/div/div/div/div[2]"));
                        var description = await jobDescription.getAttribute("innerHTML");

                        job.JDTID_UNIQUE_NUMBER = jobid;
                        job.JOB_APPLY_URL = url;
                        job.JOB_CATEGORY = category;
                        job.JOB_TITLE = title;
                        job.JOB_TYPE = jobtype;
                        job.TEXT = HtmlEscape(description);
                        jobMaker.successful.add(job, botScheduleID);
                        prime++;
                    } catch (e) {
                        jobMaker.failed.add(job.JDTID_UNIQUE_NUMBER, e.message);
                        prime++;
                    }
                }
            } while (isPresent);

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
    description = description.replace(/&#9;/g, ' ');
   description = description.replace(/&nbsp;/g, '');
    description = description.replace(/\s\s+/g, ' ');
    description = description.replace(/\r?\n|\r/g, '');
    return description;
}

var snippet = (configuration, atsJobCount, failedJobCount, jobs, onsuccess, onfailure) => {
    service.bot.setProgress(botScheduleID, log.logType.activity, log.activity.snippet.download + "feedgenerator").then(values => {
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

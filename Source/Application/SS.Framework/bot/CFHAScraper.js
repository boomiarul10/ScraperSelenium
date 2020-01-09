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

        await driver.get('https://pm.healthcaresource.com/CareerSite/cfha/Search.aspx');
        await driver.sleep(2000);

        await driver.findElement(By.xpath('//*[@class="form-control btn btn-primary"]/i[@class="fa fa-fw fa-search"]')).click();
        await driver.sleep(2000);
        var atsJobCountElement = await driver.findElement(By.xpath('//div[@class="card-body"]/div[@class="row"]//span[@class="badge alert-info"]'));
        var atsjobscount = await atsJobCountElement.getText();

        var atsjbcount = atsjobscount.split("Results");
        var atscount = atsjbcount[0];
        jobMaker.setatsJobCount(parseInt(atscount));

        var pages = atscount / 25;
        if (pages) {
            var s = 0;
            var q = pages - 1;
            while (s < q) {
                var loadElement = await driver.findElement(By.xpath('//button[@class="btn-default btn deafult"]'));
                await loadElement.click();
                await driver.sleep(5000);
                s++;
            }
        }
        var loop;
        var counter = 1;
        loop = false;
        do {

            var jobContainer = await driver.findElements(By.xpath('//div[@class="row"]/div[@id="listings"]/div[' + counter + '][@class="job-listing card simple"]'));
            var isPresent = await jobContainer.length;
            if (isPresent) {
                try {
                    var job = jobMaker.create();

                    var titleElement = await driver.findElement(By.xpath('//div[@class="row"]/div[@id="listings"]/div[' + counter + '][@class="job-listing card simple"]/h3[@class="simple card-heading"]/span[1]/a'));
                    var title = await titleElement.getText();
                    var categoryElement = await driver.findElement(By.xpath('//div[@class="row"]/div[@id="listings"]/div[' + counter + '][@class="job-listing card simple"]/div[@class="card-body"]//div[@class="col-md-12 col-xs-12"]/div[2]/div[@class="col-md-12 col-xs-12"]/span[1]'));
                    var category = await categoryElement.getText();

                    var contactcompanyElement = await driver.findElement(By.xpath('//div[@class="row"]/div[@id="listings"]/div[' + counter + '][@class="job-listing card simple"]/div[@class="card-body"]//div[@class="col-md-12 col-xs-12"]/div[1]//span[@itemprop="hiringOrganization"]/span[2]/span[2]'));
                    var contactcompany = await contactcompanyElement.getText();

                    var jobtypeElement = await driver.findElement(By.xpath('//div[@class="row"]/div[@id="listings"]/div[' + counter + '][@class="job-listing card simple"]/div[@class="card-body"]//div[@class="col-md-12 col-xs-12"]/div[2]/div[@class="col-md-12 col-xs-12"]/span[2]/span[2]/span[2]'));
                    var jobtype = await jobtypeElement.getText();

                    var travelElement = await driver.findElement(By.xpath('//div[@class="row"]/div[@id="listings"]/div[' + counter + '][@class="job-listing card simple"]/div[@class="card-body"]//div[@class="col-md-12 col-xs-12"]/div[2]/div[@class="col-md-12 col-xs-12"]/span[2]/span[1]/span[1]'));
                    var travel = await travelElement.getText();

                    job.JOB_TITLE = title;
                    job.JOB_CATEGORY = category;
                    job.JOB_CONTACT_COMPANY = contactcompany;
                    job.JOB_TYPE = jobtype;
                    job.TRAVEL = travel;
                    job.JOB_LOCATION_CITY = 'Leesburg';
                    job.JOB_LOCATION_STATE = 'FL';
                    job.JOB_LOCATION_COUNTRY = 'US';

                    var applyElement = await driver.findElement(By.xpath('//div[@class="row"]/div[@id="listings"]/div[' + counter + '][@class="job-listing card simple"]/h3[@class="simple card-heading"]/span[1]/a'));
                    var url = await applyElement.getAttribute("href");
                    job.JOB_APPLY_URL = url;

                    await driverjobdetails.get(url);
                    await driver.sleep(2000);
                    var jobdetailspage = await driverjobdetails.findElements(By.xpath('//div[@class="field-column col-md-12"]'));
                    var isDetailPage = await jobdetailspage.length;
                    if (isDetailPage) {
                        var jobIDElement = await driverjobdetails.findElement(By.xpath('//div[@class="col-md-12 col-xs-12"]/div[3]/div[@class="col-md-12 col-xs-12"]/span[2]/span[1]/span[2]'));
                        var id = await jobIDElement.getText();
                        job.JDTID_UNIQUE_NUMBER = id;

                        var descriptionElement = await driverjobdetails.findElement(By.xpath('//div[@class="field-column col-md-12"]'));
                        var description = await descriptionElement.getAttribute("outerHTML");
                        var requirementElementcount = await driverjobdetails.findElements(By.xpath('//div[@class="row"][4]'));
                        if (requirementElementcount.length > 0) {
                            var requirementElement = await driverjobdetails.findElement(By.xpath('//div[@class="row"][4]'));
                            var requirement = await requirementElement.getAttribute("outerHTML");
                            description += "\n" + requirement;
                        }
                        job.TEXT = HtmlEscape(description);
                        jobMaker.successful.add(job, botScheduleID);
                    }
                    counter++;
                } catch (e) {
                    jobMaker.failed.add(job.JDTID_UNIQUE_NUMBER, e.message);
                    counter++;
                }
            }
        } while (isPresent);
        await driver.quit();
        await driverjobdetails.quit();
        snippet(configuration, jobMaker.atsJobCount, jobMaker.failedJobs.length, jobMaker, onsuccess, onfailure);
    } catch (e) {
        await driver.quit();
        await driverjobdetails.quit();
        var output = package.service.bot.createBotErrorOutput(configuration.scheduleid, jobMaker.jobs.length, jobMaker.atsJobCount, jobMaker.failedJobs.length, err);
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

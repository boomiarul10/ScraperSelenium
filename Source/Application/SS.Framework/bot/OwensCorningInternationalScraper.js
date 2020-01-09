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
        //var driver = selenium.createDriver("chrome");
        //var driverjobdetails = selenium.createDriver("chrome");
        var driver = selenium.createDriver(configuration.configuration.execBotConfig.browsertype.toLowerCase());
        var driverjobdetails = selenium.createDriver(configuration.configuration.execBotConfig.browsertype.toLowerCase());

        await driver.get('http://global.owenscorningcareers.com/');
        var searchElement = await driver.findElement(By.xpath('//*[@id="imgSubmitForm"]'));
        await searchElement.click();

        var atsJobCount = await driver.findElements(By.xpath('//*[@id="gvJobList"]/tbody/tr'));
        var record = (atsJobCount.length) - 1;
        jobMaker.setatsJobCount(parseInt(record));


        var counter = 2;
        do {
            var jobContainer = await driver.findElements(By.xpath('//*[@id="gvJobList"]/tbody/tr[' + counter + ']'));
            var isPresent = await jobContainer.length;
            if (isPresent) {
                try {
                    var job = jobMaker.create();

                    var titleElement = await driver.findElement(By.xpath('//*[@id="gvJobList"]/tbody/tr[' + counter + ']/td[1]/a'));
                    var title = await titleElement.getText();
                    var jobIdElement = await driver.findElement(By.xpath('//*[@id="gvJobList"]/tbody/tr[' + counter + ']/td[2]'));
                    var jobid = await jobIdElement.getText();
                    var categoryElement = await driver.findElement(By.xpath('//*[@id="gvJobList"]/tbody/tr[' + counter + ']/td[4]'));
                    var category = await categoryElement.getText();
                    var cityElement = await driver.findElement(By.xpath('//*[@id="gvJobList"]/tbody/tr[' + counter + ']/td[5]'));
                    var city = await cityElement.getText();


                    var url = await titleElement.getAttribute("href");
                    await driverjobdetails.get(url);

                    var countryElement = await driverjobdetails.findElement(By.xpath('//*[@id="lblAllTitleText"]'));
                    var country = await countryElement.getText();
                    var descriptionElement = await driverjobdetails.findElement(By.xpath('//*[@id="form1"]/table[2]/tbody/tr/td'));
                    var description = await descriptionElement.getAttribute("innerHTML");

                    job.JOB_TITLE = title;
                    job.JDTID_UNIQUE_NUMBER = jobid;
                    job.JOB_CATEGORY = category;
                    if (city.indexOf(',') > 0) {
                        city = city.split(',');
                        job.JOB_LOCATION_CITY = city[0];
                    } else {
                        job.JOB_LOCATION_CITY = city;
                    }
                    var jobCountry = country.split('Country: ');
                    country = jobCountry[1].split(' ');
                    job.JOB_LOCATION_COUNTRY = country[0];
                    job.JOB_LOCATION_COUNTRY = job.JOB_LOCATION_COUNTRY.replace('Signapore', 'Singapore');
                    job.TEXT = HtmlEscape(description);
                    job.JOB_APPLY_URL = "http://global.owenscorningcareers.com/tccglobal/interest-form.aspx?reqid=" + job.JDTID_UNIQUE_NUMBER;
                    job.JOB_CONTACT_COMPANY = "Owens Corning";
                    jobMaker.successful.add(job, botScheduleID);
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
    description = description.replace(/&#x9;/g, '');
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

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

        await driver.get('http://www.latestvacancies.com/greene-king/rssfeed.asp');
        var rssFeed = await driver.getPageSource();


        var jobList = await driver.findElements(By.xpath("//rss/channel/item"));
        var jobCount = jobList.length;
        jobMaker.setatsJobCount(jobCount);

        for (var dataVal in jobList) {
            try {
                var i = parseInt(dataVal);
                var j = i + 1;
                //var loc = "//rss/channel/item[" + j + "]";
                var job = jobMaker.create();

                var titleElement = await driver.findElement(By.xpath("//rss/channel/item[" + j + "]/title"));
                //var jobData = await jobElement.getAttribute("innerHTML");

                var title = await titleElement.getText();
                job.JOB_TITLE = title;
                if (title != null) {
                    var rex = /(.*?)-.*/;
                    var rexPresent = rex.test(title);
                    if (rexPresent) {
                        var cateData = rex.exec(title);
                        job.JOB_CATEGORY = cateData[1];
                    } else {
                        job.JOB_CATEGORY = title;
                    } 
                    rex.lastIndex = 0;

                    var cityRex = /.*-\s(.*)/;
                    var cityRexPresent = cityRex.test(title);
                    if (cityRexPresent) {
                        var cityData = cityRex.exec(title);
                        var cityValue = cityData[1];
                        cityValue = cityValue.replace(/.*,\s(.*),.*/, "$1");
                        cityValue = cityValue.replace(/.*,\s(.*)/, "$1");
                        job.JOB_LOCATION_CITY = cityValue;
                        var i = 1;

                    }
                    cityRex.lastIndex = 0; 

                }

                var urlElement = await driver.findElement(By.xpath("//rss/channel/item[" + j + "]/link"));
                var url = await urlElement.getText();
                url = url.split('?FromSearch=False').shift();
                if (url != null) {
                    var idRex = /.*\/(.*\d+)?.*/;
                    var idRexPresent = idRex.test(url);
                    if (idRexPresent) {
                        var idData = idRex.exec(url);
                        job.JDTID_UNIQUE_NUMBER = idData[1];
                    }
                    idRex.lastIndex = 0;                    
                }

                var brandElement = await driver.findElement(By.xpath("//rss/channel/item[" + j + "]/brand"));
                var brand = await brandElement.getText();
                job.JOB_CONTACT_COMPANY = brand;
                //var startDate = jobData.split('<pubdate>').pop().split('</pubdate>').shift();
                //var endDate = jobData.split('<closingdate>').pop().split('</closingdate>').shift();
                //var salary = jobData.split('<salary>').pop().split('</salary>').shift();
                var locationElement = await driver.findElement(By.xpath("//rss/channel/item[" + j + "]/location"));
                var location = await locationElement.getText();
                job.JOB_LOCATION_STATE = location;
                job.JOB_LOCATION_COUNTRY = "UK";

                job.JOB_APPLY_URL = url;

                await driverjobdetails.get(url);
                var dataa = await driverjobdetails.getPageSource();
                driverjobdetails.sleep(3000);
                var descpage = await driverjobdetails.findElements(By.xpath('//table//td//div[@class="AdvertParentContainer"]'));
                var isdesc = await descpage.length;
                if (isdesc) {
                    var desc = await driverjobdetails.findElement(By.xpath('//table//td//div[@class="AdvertParentContainer"]')).getAttribute("outerHTML");
                    desc = HtmlEscape(desc);
                    job.TEXT = desc;
                }

                jobMaker.successful.add(job, botScheduleID);                
            } catch (e) {
                jobMaker.failed.add(job.JDTID_UNIQUE_NUMBER, e.message);
            }
        }

        await driver.quit();
        await driverjobdetails.quit();
        await snippet(configuration, jobMaker.atsJobCount, jobMaker.failedJobs.length, jobMaker, onsuccess, onfailure);
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
    //description = description.replace(/&nbsp;/g, '');
    description = description.replace(/\s\s+/g, ' ');
    description = description.replace(/\r?\n|\r/g, '');
    description = description.replace(/&mldr;+/g, "&hellip;");
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
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
     //   var driver = selenium.createDriver("chrome");
     //   var driverjobdetails = selenium.createDriver("chrome");
        await driver.get('https://sjobs.brassring.com/TGWebHost/home.aspx?partnerid=420&siteid=42');
        await driver.sleep(2000);

        await driver.findElement(By.xpath('//*[@id="srchOpenLink"]/strong')).click();
        await driver.sleep(2000);

        await driver.findElement(By.xpath('//*[@id="ctl00_MainContent_submit1"]')).click();
        await driver.sleep(2000);

        var atsJobCountElement = await driver.findElement(By.xpath('//*[@id="yui-pg0-0-page-report"]'));
        var atsjobscount = await atsJobCountElement.getText();

        var atsjbcount = atsjobscount.split("of");
        var atscount = atsjbcount[1];
        jobMaker.setatsJobCount(parseInt(atscount));
            var loop;
            do {
                var prime = 1;
                loop = false;
                do {
                    var jobContainer = await driver.findElements(By.xpath("//*[@id='idSearchresults_dataBody']/tr[" + prime + "]"));
                    var isPresent = await jobContainer.length;
                    if (isPresent) {
                        try {
                            var job = jobMaker.create();
                                        
                            var titleElement = await driver.findElement(By.xpath("//*[@id='idSearchresults_dataBody']/tr[" + prime + "]/td[2]/div/a"));
                            var title = await titleElement.getText();

                            var categoryElement = await driver.findElement(By.xpath("//*[@id='idSearchresults_dataBody']/tr[" + prime + "]/td[3]/div"));
                            var category = await categoryElement.getText();

                            var locationElement = await driver.findElement(By.xpath("//*[@id='idSearchresults_dataBody']/tr[" + prime + "]/td[4]/div"));
                            var location = await locationElement.getText();

                           var locatnElement = await driver.findElements(By.xpath("//*[@id='idSearchresults_dataBody']/tr[" + prime + "]/td[4]/div"));
                            var locElement = await locatnElement.length;

                            if (locElement) {
                                if (location.indexOf(",") > -1) {
                                    var loc = await location.split(",");
                                    var city = loc[0];
                                    var state = loc[1];
                                }
                                else {
                                    var loc = await location.split(" ");
                                    var city = loc[0];
                                    var state = loc[1];
                                }
                            }

                            var joburl = await titleElement.getAttribute("href");
                            await driver.get(joburl);

                            //await titleElement.click();
                            //await driver.sleep(2000);

                            //var joburl = await titleElement.getAttribute("href");

                            //await driverjobdetails.get(joburl);

                            var jobDescription = await driver.findElement(By.xpath("//*[@id='Job Description']"));
                            var description = await jobDescription.getAttribute("innerHTML");

                            var idElement = await driver.findElement(By.xpath("//*[@id='Requisition Number']"));
                            var jobid = await idElement.getText();

                            await driver.navigate().back();
                            await driver.sleep(2000);

                            await driver.navigate().refresh();
                            await driver.sleep(2000);
                           
                                  
                            job.JDTID_UNIQUE_NUMBER = jobid;
                            job.JOB_APPLY_URL = "https://sjobs.brassring.com/TGWebHost/jobdetails.aspx?partnerid=420&siteid=42&areq="+jobid;
                            job.JOB_CATEGORY = category;
                            job.JOB_LOCATION_CITY = city;
                            job.JOB_LOCATION_STATE= state;
                            job.JOB_TITLE = title;
                            job.TEXT = HtmlEscape(description);
                            jobMaker.successful.add(job, botScheduleID);
                            prime++;
                        } catch (e) {
                            jobMaker.failed.add(job.JDTID_UNIQUE_NUMBER, e.message);
                            prime++;
                        }
                    }
                } while (isPresent);
                try {
                    var nextContainer = await driver.findElements(By.xpath('//*[@id="yui-pg0-0-next-link"]'));
                    var next = nextContainer.length;
                    if (next) {
                        var nextLink = await driver.findElement(By.xpath('//*[@id="yui-pg0-0-next-link"]'));
                        await nextLink.click();
                        await driver.sleep(2000);
                        loop = true;
                    }
                }
                catch (e) {
                }
            } while (loop);
        await driver.quit();
        snippet(configuration, jobMaker.atsJobCount, jobMaker.failedJobs.length, jobMaker, onsuccess, onfailure);
    } catch (e) {
        await driver.quit();
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

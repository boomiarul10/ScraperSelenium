var Promise = require('promise');
var package = global.createPackage();
var he = require('he');
var cleanHtml = require('clean-html');
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

        //var driver = selenium.createDriverWithCapabilties();
        //var driverjobdetails = selenium.createDriverWithCapabilties();

        await driver.manage().window().maximize();
        await driverjobdetails.manage().window().maximize();

        await driver.get('https://chj.tbe.taleo.net/chj01/ats/careers/jobSearch.jsp?org=ANGIESLIST&cws=1');
        driver.sleep(3000);
        await driver.findElement(By.xpath("//*[@id='taleoContent']//input[@value='Search']")).click();
        await driverjobdetails.sleep(3000);
        var atsJobCount = await driver.wait(until.elementLocated(By.xpath("//*[@id='taleoContent']//*[contains(text(),'Your search found')]/b")), 4000);
        var atscount = await atsJobCount.getText();
        jobMaker.setatsJobCount(parseInt(atscount.trim()));

        var counter;
        counter = 2;

        do {
            var jobContainer = await driver.findElements(By.xpath("//table[@id='cws-search-results']//tr[" + counter + "]"));
            var isPresent = await jobContainer.length;
            if (isPresent) {
                try {
                    var job = jobMaker.create();
                    var run = "default";

                    while (run != "completed") {


                        var titleElement = await driver.findElement(By.xpath("//table[@id='cws-search-results']//tr[" + counter + "]/td[1]//a"));
                        job.JOB_TITLE = await titleElement.getText();

                        var url = await titleElement.getAttribute("href");

                        if (url) {
                            job.JOB_APPLY_URL = url;
                            if (url.includes("&rid=")) {
                                job.JDTID_UNIQUE_NUMBER = url.split("&rid=").pop();
                            }
                        }

                        var typeElement = await driver.findElement(By.xpath("//table[@id='cws-search-results']//tr[" + counter + "]/td[2]"));
                        job.JOB_TYPE = await typeElement.getText();

                        var categoryElement = await driver.findElement(By.xpath("//table[@id='cws-search-results']//tr[" + counter + "]/td[3]"));
                        job.JOB_CATEGORY = await categoryElement.getText();

                        var locationElem = await driver.findElements(By.xpath("//table[@id='cws-search-results']//tr[" + counter + "]/td[5]"));
                        var isLocation = await locationElem.length;
                        if (isLocation) {
                            var locationElement = await driver.findElement(By.xpath("//table[@id='cws-search-results']//tr[" + counter + "]/td[5]"));
                            var location = await locationElement.getText();

                            if (location) {
                                var stateRex = /.*,(.*)/;
                                var stateRexPresent = stateRex.test(location);

                                if (stateRexPresent) {
                                    var stateData1 = stateRex.exec(location);
                                    job.JOB_LOCATION_STATE = stateData1[1];
                                } 
                                stateRex.lastIndex = 0;

                                var cityRex = /(.*),.*/;
                                var cityRexPresent = cityRex.test(location);

                                if (cityRexPresent) {
                                    var cityData1 = cityRex.exec(location);
                                    job.JOB_LOCATION_CITY = cityData1[1];
                                } else {
                                    job.JOB_LOCATION_CITY = location;
                                }
                                cityRex.lastIndex = 0;

                            }

                        }                                                
                        await driverjobdetails.get(url);

                        try {

                            var jobdetailspage = await driverjobdetails.findElements(By.xpath("//*[@id='taleoContent']//table/tbody"));
                            var isDetailPage = await jobdetailspage.length;
                            if (isDetailPage) {                                

                                var descElement = await driverjobdetails.findElement(By.xpath("//*[@id='taleoContent']//table/tbody"));
                                var desc0 = await descElement.getAttribute("outerHTML");

                                var desc1Element = await driverjobdetails.findElement(By.xpath("//*[@id='taleoContent']//table/tbody/tr[td/h1[text()='Description']]"));
                                var desc1 = await desc1Element.getAttribute("innerHTML");

                                var desc2Element = await driverjobdetails.findElement(By.xpath("//*[@id='taleoContent']//table/tbody/tr[td//input[@name='tbe_cws_submit' and @value='Apply for this Position']]"));
                                var desc2 = await desc2Element.getAttribute("outerHTML");

                                var desc = desc0.split(desc1)[1];
                                desc = desc.split(desc2)[0];
                                desc = desc1 + desc;                           

                                if (desc) {
                                    job.TEXT = HtmlEscape(desc);
                                }
                                jobMaker.successful.add(job, botScheduleID);
                            }
                            counter++;
                            run = "completed";

                        } catch (ex) {
                            if (run == "default") {
                                run = "retry 1";
                            }
                            else if (run == "retry 1") {
                                run = "retry 2";
                            }
                            else {
                                run = "completed";
                                jobMaker.failed.add(job.JDTID_UNIQUE_NUMBER, ex.message);
                                counter++;
                            }
                        }
                    }

                } catch (e) {
                    jobMaker.failed.add(job.JDTID_UNIQUE_NUMBER, e.message);
                    counter++;
                }
            }
        } while (isPresent);            

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
    description = description.replace(/\s\s+/g, ' ');
    description = description.replace(/\r?\n|\r/g, '');
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
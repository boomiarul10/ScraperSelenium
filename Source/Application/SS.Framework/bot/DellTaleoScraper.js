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
        driver.manage().timeouts().implicitlyWait(35000);

        await driver.get('https://dell.taleo.net/careersection/2/jobsearch.ftl?lang=en');

        await driver.sleep(10000);
        var atsJobCount = await driver.findElement(By.xpath('//*[@id="infoPanelContainer"]/div'));
        var atscount = await atsJobCount.getText();
        var record = atscount.split("of");
        jobMaker.setatsJobCount(parseInt(record[1]));

        var loop;
        var pagenumber = 1;
        do {
            loop = false;
            var jobsPresent = await driver.findElements(By.xpath('//ul[@id="jobList"]/li'));
            var totalJobs = await jobsPresent.length;
            var counter = 1;
            do {
                var jobContainer = await driver.findElements(By.xpath('//ul[@id="jobList"]/li[' + counter + ']'));
                var isPresent = await jobContainer.length;
                if (isPresent) {
                    try {
                        var job = jobMaker.create();

                        var urlElement = await driver.findElement(By.xpath('//ul[@id="jobList"]/li[' + counter + ']//a'));
                        var url = await urlElement.getAttribute('href');

                        var id = url.split('job=');
                        id = id[1].split('&');
                        id = id[0].trim();
                        job.JDTID_UNIQUE_NUMBER = id;

                        await driverjobdetails.get(url);
                        //await driver.sleep(3000);
                        //await driver.wait(until.elementLocated(By.xpath('//*[@class="requisitionDescription"]')), 10000);
                        var descElement = await driverjobdetails.findElements(By.xpath('//*[@class="requisitionDescription"]'));
                        var descpage = await descElement.length;
                        if (descpage) {

                            job.JOB_APPLY_URL = url;
                            var titleElement = await driverjobdetails.findElement(By.xpath('//*[@class="titlepage"][1]'));
                            job.JOB_TITLE = await titleElement.getText();
                            var locationElement = await driverjobdetails.findElement(By.xpath('//*[@id="requisitionDescriptionInterface.ID1795.row1"]'));
                            var location = await locationElement.getText();
                            if (location) {
                                var loc = location.split('-');
                                var city = loc[loc.length - 1].trim();
                                var state = loc.length == 4 ? loc[2] : "";
                                if (state.length >= 1) {
                                    state = state == "Wisconsin" ? "WI" : state;
                                }
                                var country = loc[1].trim();
                            }
                            job.JOB_LOCATION_CITY = city;
                            job.JOB_LOCATION_STATE = state;
                            job.JOB_LOCATION_COUNTRY = country;


                            var JobDescription = await driverjobdetails.findElement(By.xpath("//div[@class='editablesection']"));
                            var desc = await JobDescription.getAttribute("outerHTML");
                            desc = desc.replace(/<o:p>/g, '<p>').replace(/<\/o:p>/g, '</p>');
                            desc = desc.trim();
                            if (desc) {
                                job.TEXT = HtmlEscape(desc);
                            }

                            var industryElement = await driverjobdetails.findElement(By.xpath('//*[@id="requisitionDescriptionInterface.ID1983.row1"]'));
                            job.JOB_CONTACT_COMPANY = await industryElement.getText();

                            var jobLevelElement = await driverjobdetails.findElements(By.xpath('//*[@id="requisitionDescriptionInterface.ID1935.row1"]'));
                            var level = await jobLevelElement.length;
                            if (level) {                            
                                var categoryElement = await driverjobdetails.findElement(By.xpath('//*[@id="requisitionDescriptionInterface.ID1935.row1"]'));
                                var category = await categoryElement.getText();
                                category = "Level " + category;
                                job.JOB_CATEGORY = category.trim();
                            } else {
                                var categoryElement = await driverjobdetails.findElement(By.xpath('//*[@id="requisitionDescriptionInterface.ID1751.row1"]'));
                                job.JOB_CATEGORY = await categoryElement.getText();
                            }
                            
                            /*var jobtypeElement = await driverjobdetails.findElement(By.xpath('//*[@id="requisitionDescriptionInterface.ID1891.row1"]'));
                            var type = await jobtypeElement.length;
                            if(type)
                            {
                            job.JOB_TYPE = await type.getText();
                            }*/
                            try
                            {
                            var type = await driverjobdetails.findElement(By.xpath('//*[@id="requisitionDescriptionInterface.ID1891.row1"]'));
                            if(type)
                            {
                            job.JOB_TYPE = await type.getText();
                            }
                            }
                            catch(e)
                            {
                            jobMaker.failed.add(job.JDTID_UNIQUE_NUMBER, e.message);
                            }

                            jobMaker.successful.add(job, botScheduleID);
                        }
                    } catch (e) {
                        jobMaker.failed.add(job.JDTID_UNIQUE_NUMBER, e.message);
                        //counter++;
                    }
                }
                counter++;
            } while (counter <= totalJobs);
            try {
                var nextContainer = await driver.findElements(By.xpath('//*[@class="pagerlink"]/a[@id="next"]'));
                var next = nextContainer.length;
                if (next) {
                    var nextLink = await driver.findElement(By.xpath('//*[@id="next"]'));
                    await nextLink.click();
                    await driver.wait(until.elementLocated(By.xpath('//ul[@id="jobList"]/li')), 30000);
                    loop = true;
                    pagenumber++;
                }
            } catch (e) {

            }
        } while (loop);
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
    description = description.replace(/&nbsp;/g, ' ');
    description = description.replace(/\s\s+/g, ' ');
    description = description.replace(/\r?\n|\r/g, '');
    description = description.replace(/mldr/g, 'hellip;');
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
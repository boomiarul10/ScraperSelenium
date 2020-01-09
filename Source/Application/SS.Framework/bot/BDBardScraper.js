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

        //var driver = selenium.createDriverWithCapabilties();
        //var driverjobdetails = selenium.createDriverWithCapabilties();

        await driver.manage().window().maximize();
        await driverjobdetails.manage().window().maximize();

        await driver.get('https://jobs-crbard.icims.com/jobs/intro?hashed=0');

        await driver.switchTo().frame("icims_content_iframe");
        var searchElement = await driver.findElement(By.xpath('//input[@id="jsb_form_submit_i"]'));
        await searchElement.click();


        var lastPage = await driver.findElement(By.xpath("//div[@class='iCIMS_Paginator_Bottom']//a[span[text()='Last']]"));
        await lastPage.click();
        var pageElement = await driver.findElement(By.xpath("//div[@class='iCIMS_Paginator_Bottom']//a[@class='selected']/span[2]"));
        var countData = await pageElement.getText();
        var countVal = countData.split("of")[1].trim();
        if (countVal) {
            var count = parseInt(countVal);
            var recordCount = await driver.findElements(By.xpath('//div[@class="container-fluid iCIMS_JobsTable"]/div[@class="row"]'));
            var records = recordCount.length;
            var jobsCount = (((count - 1) * 10) + records);

            jobMaker.setatsJobCount(parseInt(jobsCount));
        }

        var submitElement = await driver.findElement(By.xpath('//input[@id="jsb_form_submit_i"]'));
        await submitElement.click();

        var loop;
        var pagenumber = 1;
        do {
            loop = false;
            var counter = 1;
            do {
                var jobContainer = await driver.findElements(By.xpath('//div[@class="container-fluid iCIMS_JobsTable"]/div[@class="row"][' + counter + ']'));
                var isPresent = await jobContainer.length;
                if (isPresent) {
                    try {
                        var job = jobMaker.create();

                        var titleElement = await driver.findElement(By.xpath('//div[@class="container-fluid iCIMS_JobsTable"]/div[@class="row"][' + counter + ']/div[contains(@class, "title")]//dd'));
                        var title = await titleElement.getText();
                        job.JOB_TITLE = title;




                        var locationElement = await driver.findElement(By.xpath('//div[@class="container-fluid iCIMS_JobsTable"]/div[@class="row"][' + counter + ']/div/dl[.//label[contains(text(),"Job Locations")]]/dd'));
                        var location = await locationElement.getText();

                        var titleURLElement = await driver.findElement(By.xpath('//div[@class="container-fluid iCIMS_JobsTable"]/div[@class="row"][' + counter + ']/div[contains(@class, "title")]/a'));
                        var url = await titleURLElement.getAttribute("href");
                        await driverjobdetails.get(url);
                        await driverjobdetails.sleep(2000);
                        await driverjobdetails.switchTo().frame("icims_content_iframe");


                        var cateContainer = await driverjobdetails.findElements(By.xpath("//div[@class='iCIMS_JobContent']/div[@class='container-fluid iCIMS_JobsTable']//dl[.//dt[contains(text(),' Category')]]/dd"));
                        var isCatePresent = await cateContainer.length;
                        if (isCatePresent) {
                            var categoryElement = await driverjobdetails.findElement(By.xpath("//div[@class='iCIMS_JobContent']/div[@class='container-fluid iCIMS_JobsTable']//dl[.//dt[contains(text(),'Category')]]/dd"));
                            var category = await categoryElement.getText();
                        }

                        job.JOB_CATEGORY = category;


                        var jobIdElement = await driverjobdetails.findElement(By.xpath("//div[@class='container-fluid iCIMS_JobsTable']/div[@class='row']/div[4]/dl[2]/dd"));
                        job.JDTID_UNIQUE_NUMBER = await jobIdElement.getText();


                        var jobDescElement1 = await driverjobdetails.findElement(By.xpath('//div[@class="container-fluid iCIMS_JobsTable"]'));
                        var jobDesc1 = await jobDescElement1.getAttribute("outerHTML");

                        var jobDescElement = await driverjobdetails.findElement(By.xpath('//*[@class="iCIMS_JobContent"]'));
                        var jobDesc = await jobDescElement.getAttribute("outerHTML");

                        var jobDescription = jobDesc.split(jobDesc1)[1];
                        jobDescription = jobDescription.split('<div class="iCIMS_JobOptions">')[0];

                        job.TEXT = HtmlEscape(jobDescription);

                        var applyurlElement = await driverjobdetails.findElement(By.xpath("//div[@class='iCIMS_JobContent']/div[@class='iCIMS_JobOptions']/div[1]/a[@title='Apply for this job online']"));
                        var applyurl = await applyurlElement.getAttribute("href");

                        job.JOB_APPLY_URL = applyurl;


                        if (location != null) {
                            var loc = location.split("-");
                            if (loc.length == 2) {
                                job.JOB_LOCATION_COUNTRY = loc[0];
                                job.JOB_LOCATION_CITY = loc[1];
                            }
                            else if (loc.length == 3) {
                                job.JOB_LOCATION_COUNTRY = loc[0];
                                job.JOB_LOCATION_CITY = loc[2];
                                job.JOB_LOCATION_STATE = loc[1];
                            }
                            else if (loc.length == 1) {
                                if (loc[0].indexOf('SE') >= 1) {
                                    job.JOB_LOCATION_COUNTRY = 'FISE';
                                }
                                else {
                                    job.JOB_LOCATION_COUNTRY = loc[0];
                                }
                            }
                            job.JOB_LOCATION_COUNTRY = job.JOB_LOCATION_COUNTRY.replace("Location: ", "");
                        }
                        jobMaker.successful.add(job, botScheduleID);
                        counter++;
                    } catch (e) {
                        jobMaker.failed.add(job.JDTID_UNIQUE_NUMBER, e.message);
                        counter++;
                    }
                }
            } while (isPresent);
            try {
                var e = await driver.findElements(By.xpath('//a[@target="_self"][.//span[@title="Next page of results"]]'));
                if (e.length == 1) {
                    var nextPage = await driver.findElement(By.xpath('//a[@target="_self"][.//span[@title="Next page of results"]]'));
                    await nextPage.click();
                    loop = true;
                }
            } catch (e) {

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
function HtmlEscape(description) {
    description = he.encode(description, { 'useNamedReferences': true, 'decimal': true, 'allowUnsafeSymbols': true });
    description = description.replace(/&#9;/g, ' ');
    description = description.replace(/&nbsp;/g, '');
    description = description.replace(/\s\s+/g, ' ');
    description = description.replace(/\r?\n|\r/g, '');
    description = description.replace(/&#x9;/g, '');
    description = description.replace(/&ensp;+/g, "");
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

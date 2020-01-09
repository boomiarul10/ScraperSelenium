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
        await driver.get('https://uncpn.igreentree.com/CSS_External/CSSPage_Welcome.asp');

        var totalJobElement = await driver.findElement(By.xpath('//*[@id="BJ10"]/h4'));
        var totalJobCount = await totalJobElement.getText();
        var record = totalJobCount.split("(");
        var atsCount = record[1].split("Jobs");
        jobMaker.setatsJobCount(parseInt(atsCount[0]));

        var searchelement = await driver.findElement(By.xpath('//*[@id="cmdCSSSearch"]'));
        await searchelement.click();
        do {
            loop = false;
            var counter = 2;
            do {
                var jobContainer = await driver.findElements(By.xpath('//*[@class="table2 table-collapse"]/div[' + counter + ']'));
                var isPresent = await jobContainer.length;
                if (isPresent) {
                    try {
                        var job = jobMaker.create();
                        var idElement = await driver.findElement(By.xpath('//*[@class="table2 table-collapse"]/div[' + counter + ']/div[1]/a'));
                        var jobId = await idElement.getText();
                        job.JDTID_UNIQUE_NUMBER = jobId.trim();
                        var titleElement = await driver.findElement(By.xpath('//*[@class="table2 table-collapse"]/div[' + counter + ']/div[2]'));
                        job.JOB_TITLE = await titleElement.getText();

                        var locationElement = await driver.findElement(By.xpath('//*[@class="table2 table-collapse"]/div[' + counter + ']/div[3]'));
                        job.JOB_LOCATION_CITY = await locationElement.getText();
                        var categoryElement = await driver.findElement(By.xpath('//*[@class="table2 table-collapse"]/div[' + counter + ']/div[4]'));
                        job.JOB_CATEGORY = await categoryElement.getText();
                        var clickelement = await driver.findElement(By.xpath('//*[@class="table2 table-collapse"]/div[' + counter + ']/div[1]/a'));
                        await clickelement.click();
                        var url = await driver.getCurrentUrl();
                        if (url) {
                            var applyID = url.split("T=");
                            job.JOB_APPLY_URL = "https://uncpn.igreentree.com/CSS_External/CSSPage_ApplyNow_Questions.ASP?T=" + applyID[1];
                        }

                        var jobdetailspage = await driver.findElements(By.xpath('//*[@class="col-sm-12 updateProfile jobDetail parallelFields"]/h5[1]'));
                        var isDetailPage = await jobdetailspage.length;
                        if (isDetailPage) {

                            var jobEducation = await driver.findElement(By.xpath('//*[@class="col-sm-12 updateProfile jobDetail parallelFields"]/h5[1]'));
                            var desc1 = await jobEducation.getAttribute("outerHTML");

                            var jobDescriptionElement = await driver.findElement(By.xpath('//*[@class="col-sm-12 updateProfile jobDetail parallelFields"]/table[1]'));
                            var desc2 = await jobDescriptionElement.getAttribute("outerHTML");

                            var jobSalaryFrom = await driver.findElement(By.xpath('//*[@class="col-sm-12 updateProfile jobDetail parallelFields"]/h5[2]'));
                            var desc3 = await jobSalaryFrom.getAttribute("outerHTML");

                            var jobQualificationElement = await driver.findElement(By.xpath('//*[@class="col-sm-12 updateProfile jobDetail parallelFields"]/table[2]'));
                            var desc4 = await jobQualificationElement.getAttribute("outerHTML");

                            var jobElement = await driver.findElement(By.xpath('//*[@id="frmApply"]'));
                            var desc5 = await jobElement.getAttribute("outerHTML");

                            var JobDescription = "<br><br><br>" + desc1 + desc2 + desc3 + desc4 + desc5 + "<!---->";
                            job.TEXT = HtmlEscape(JobDescription);
                        }
                        else {
                            var jobElement = await driver.findElement(By.xpath('//*[@id="frmApply"]'));
                            var desc5 = await jobElement.getAttribute("outerHTML");

                            var JobDescription = "<br><br><br>" + desc5 + "<!---->";
                            job.TEXT = HtmlEscape(JobDescription);
                        }
                        await driver.navigate().back();
                        jobMaker.successful.add(job, botScheduleID);
                        counter++;
                    } catch (e) {
                        jobMaker.failed.add(job.JDTID_UNIQUE_NUMBER, e.message);
                        await driver.navigate().back();
                        counter++;
                    }
                }
            } while (isPresent);
            try {
                var nextContainer = await driver.findElements(By.xpath('//*[@title="Go to Next Results Page"]'));
                var next = nextContainer.length;
                if (next == 1) {
                    var nextLink = await driver.findElement(By.xpath('//*[@title="Go to Next Results Page"]'));
                    await nextLink.click();
                    loop = true;
                }
            } catch (e) {

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
    description = description.replace(/&#9;/g, '');
    description = description.replace(/^\s+|\s+$/g, '');
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
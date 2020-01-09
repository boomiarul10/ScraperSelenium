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

        await driver.manage().window().maximize();

        await driver.get('https://rexcss.igreentree.com/CSS_Internal/CSSPage_Welcome.asp');
        await driver.sleep(2000);
        var searchElement = await driver.findElement(By.xpath('//*[@id="cmdCSSSearch"]'));
        await searchElement.click();

        var recordsCount = await driver.findElement(By.xpath("//*[@class='panel-heading']/h4/span"));
        var records = await recordsCount.getText();
        jobMaker.setatsJobCount(parseInt(records));
        await driver.navigate().back();

        var optionArray = await driver.findElements(By.xpath('//*[@id="Job Group"]//input'));

        for (var i = 2; i <= optionArray.length; i++) {
            var categoryListElement = await driver.findElement(By.xpath('//*[@id="W7"]/ul/li[4]/input'));
            await categoryListElement.click();
            driver.sleep(2000);
            var categoryElement = await driver.findElement(By.xpath('//*[@id="Job Group"]//li[' + i + ']/label'));
            var category = await categoryElement.getText();
            var option = await driver.findElement(By.xpath('//*[@id="Job Group"]//li[' + i + ']//input'));
            await option.click();
            var searchElement = await driver.findElement(By.xpath('//*[@id="cmdCSSSearch"]'));
            await searchElement.click();

            do {
                loop = false;
                var prime = 1;
                do {
                    var jobContainer = await driver.findElements(By.xpath('//div[@class="tr"][' + prime + ']'));
                    var isPresent = await jobContainer.length;
                    if (isPresent) {
                        try {
                            var job = jobMaker.create();

                            var titleElement = await driver.findElement(By.xpath('//div[@class="tr"][' + prime + ']/div[1]//a'));
                            var title = await titleElement.getText();

                            var typeElement = await driver.findElement(By.xpath('//div[@class="tr"][' + prime + ']/div[5]'));
                            var type = await typeElement.getText();

                            var locationElement = await driver.findElement(By.xpath('//div[@class="tr"][' + prime + ']/div[3]'));
                            var location = await locationElement.getText();

                            var idElement = await driver.findElement(By.xpath('//div[@class="tr"][' + prime + ']/div[6]'));
                            var jobId = await idElement.getText();

                            var IndustryElement = await driver.findElement(By.xpath('//div[@class="tr"][' + prime + ']/div[4]'));
                            var industry = await IndustryElement.getText();

                            await titleElement.click();
                            await driver.wait(until.elementLocated(By.xpath('//div[@class="category row"]')), 10000);

                            var salaryElement = await driver.findElements(By.xpath("//div[@class='panel-body']//li[10]/h6[2]"));
                            var salaryLength = await salaryElement.length;
                            if (salaryLength) {
                                var salaryElement = await driver.findElement(By.xpath("//div[@class='panel-body']//li[10]/h6[2]"));
                                job.JOB_SALARY_FROM = await salaryElement.getText();
                            }

                            var educationElement = await driver.findElements(By.xpath("//div[@class='panel-body']//li[9]/h6[2]"));
                            var educationLength = await educationElement.length;
                            if (educationLength) {
                                var educationElement = await driver.findElement(By.xpath("//div[@class='panel-body']//li[9]/h6[2]"));
                                job.EDUCATION = await educationElement.getText();
                            }

                            var jobDescriptionElement = await driver.findElement(By.xpath("//div[contains(@class,'jobDetail')]"));
                            var jobDescription = await jobDescriptionElement.getAttribute("innerHTML");
                            var descSplit = jobDescription.split('<strong>Job Description:</strong>');
                            descSplit = '<strong>Job Description:</strong>' + descSplit[1];
                            descSplit = descSplit.split('<form autocomplete="OFF" id="frmApply" name="frmApply" method="POST" action=');
                            var description = descSplit[0].replace('</h5>', '');

                            var urlElement = await driver.findElement(By.xpath('//*[@id="frmApply"]'));
                            var url = await urlElement.getAttribute("action");

                            await driver.navigate().back();
                            job.JOB_TITLE = title;
                            job.JDTID_UNIQUE_NUMBER = jobId.trim();
                            job.JOB_INDUSTRY = industry;
                            job.TEXT = HtmlEscape(description);
                            job.JOB_CATEGORY = category.trim();
                            job.JOB_APPLY_URL = url;
                            if (location) {
                                var loc = location.split(",");
                                if (loc.length == 2) {
                                    job.JOB_LOCATION_STATE = loc[1];
                                    job.JOB_LOCATION_CITY = loc[0];
                                }
                            }
                            job.JOB_TYPE = type;

                            jobMaker.successful.add(job, botScheduleID);
                            prime++;
                        }
                        catch (e) {
                            jobMaker.failed.add(job.JDTID_UNIQUE_NUMBER, e.message);
                            prime++;
                        }
                    }
                } while (isPresent);
                try {
                    var pagerElement = await driver.findElements(By.xpath("//ul[@class='pagination']/li/a[contains(@title,'Next')]"));
                    var pager = await pagerElement.length;
                    if (pager) {
                        var nextLink = await driver.findElement(By.xpath("//ul[@class='pagination']/li/a[contains(@title,'Next')]"));
                        await nextLink.click();
                        loop = true;
                    }
                    else {
                        var homeElement = await driver.findElement(By.xpath("//a[contains(@title,'Previous Page')]"));
                        await homeElement.click();
                    }
                }
                catch (e) {
                    var a = e.message;
                }
            } while (loop);
        }
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
    description = description.replace(/&nbsp;/g, ' ');
    description = description.replace(/\s\s+/g, ' ');
    description = description.replace(/\r?\n|\r/g, '');
    description = description.replace(/ZeroWidthSpace;/g, '#8203;');
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
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
        
        await driver.get('https://walgreens.taleo.net/careersection/std_cs_ext/jobsearch.ftl?lang=en');
        await driver.findElement(By.xpath('//*[@id="requisitionListInterface.dropListSize"]/option[5]')).click();

        var jobCount = await driver.findElement(By.xpath('//*[@id="requisitionListInterface"]/div[2]'));
        var atsCount = await jobCount.getText();
        atsCount = atsCount.split('(');
        var count = atsCount[1].split(' ');
        count = count[0].trim();
        jobMaker.setatsJobCount(parseInt(count));

        var companyElement = await driver.findElement(By.xpath('//select[@id="basicSearchInterface.jobfield1L1"]/option[2]'));
        await companyElement.click();
        await driver.wait(until.elementLocated(By.xpath('//select[@id="basicSearchInterface.jobfield1L2"]')), 10000);
        var categoryElement = await driver.findElement(By.xpath('//select[@id="basicSearchInterface.jobfield1L2"]'));
        var optionArray = await categoryElement.findElements(By.tagName('option'));

        for (var i = 2; i <= optionArray.length; i++) {
            var option = await driver.findElement(By.xpath('//select[@id="basicSearchInterface.jobfield1L2"]/Option[' + i + ']'));
            var category = await option.getAttribute('text');
            if (category != 'Retail') {
                await option.click();
                driver.sleep(5000);
                var submitElement = await driver.findElement(By.xpath('//*[@id="basicSearchFooterInterface.searchAction"]'));
                await submitElement.click();

                var loop;
                do {
                    var prime = 1;
                    loop = false;
                    do {
                        var jobContainer = await driver.findElements(By.xpath('//*[@id="requisitionListInterface.listRequisition"]/tbody/tr[@class="ftlcopy ftlrow"][' + prime + ']'));
                        var isPresent = await jobContainer.length;
                        if (isPresent) {
                            try {
                                var job = jobMaker.create();

                                var titleElement = await driver.findElement(By.xpath('//*[@id="requisitionListInterface.listRequisition"]/tbody/tr[@class="ftlcopy ftlrow"][' + prime + ']//*[@class="titlelink"]/a'));
                                var title = await titleElement.getText();
                                var locationElement = await driver.findElement(By.xpath('//*[@id="requisitionListInterface.listRequisition"]/tbody/tr[@class="ftlcopy ftlrow"][' + prime + ']//*[@class="morelocation"]'));
                                var location = await locationElement.getText();
                                var typeElement = await driver.findElement(By.xpath('//*[@id="requisitionListInterface.listRequisition"]/tbody/tr[@class="ftlcopy ftlrow"][' + prime + ']//*[@class="jobtype"]'));
                                var type = await typeElement.getText();
                                var idElement = await driver.findElement(By.xpath('//*[@id="requisitionListInterface.listRequisition"]/tbody/tr[@class="ftlcopy ftlrow"][' + prime + ']//span[contains(@id,"requisitionListInterface.reqContestNumberValue")]'));
                                var jobId = await idElement.getText();
                                var applyIdElement = await driver.findElement(By.xpath("//div[@id='requisitionListInterface.listRequisitionContainer']/table/tbody/tr[@class='ftlcopy ftlrow'][" + prime + "]/td[2]/div"));
                                var applyId = await applyIdElement.getAttribute("id");

                                var url = "https://walgreens.taleo.net/careersection/std_cs_ext/jobdetail.ftl?job=" + applyId + "&lang=en";
                                await driverjobdetails.get(url);
                                await driverjobdetails.wait(until.elementLocated(By.xpath('//div[@class="editablesection"]')), 10000);

                                var otherLoc = location.replace(/, US/g, '; US');
                                otherLoc = otherLoc.trim();

                                var jobContact = await driverjobdetails.findElement(By.xpath('//div[@class="editablesection"]/div[3]/div[2]'));                              
                                var address = await jobContact.getText();
                                var relocationElement = await driverjobdetails.findElement(By.xpath('//div[@class="editablesection"]/div[3]/div[3]'));
                                var relocation = await relocationElement.getText();

                                var jobDescription = await driverjobdetails.findElement(By.xpath('//*[@class="mastercontentpanel3"]'));
                                var description = await jobDescription.getAttribute("outerHTML");
                                description = '&nbsp; ' + description + ' <span class="">&nbsp;</span>';

                                var optionsTag = {
                                    'add-remove-tags': ['h1', 'span']
                                };
                                cleanHtml.clean(description, optionsTag, function (html) {
                                    description = html;
                                });

                                job.JOB_TITLE = title;
                                job.JDTID_UNIQUE_NUMBER = jobId;
                                job.TEXT = HtmlEscape(description);
                                job.JOB_CATEGORY = category;
                                job.JOB_APPLY_URL = url;
                                if (location) {
                                    var loc = location.split("-");
                                    job.JOB_LOCATION_CITY = loc[2].replace(', US', '');
                                    job.JOB_LOCATION_STATE = loc[1];
                                    job.JOB_LOCATION_COUNTRY = loc[0];
                                }
                                job.JOB_TYPE = type;
                                job.JOB_CONTACT_ADDRESS = address + " " + relocation;
                                job.OTHER_LOCATIONS = otherLoc;
                                job.JOB_INDUSTRY = otherLoc;
                                job.RELOCATION = relocation;
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
                        var HomeElement = await driver.findElements(By.xpath('//*[@class="pagerpanel"]//span[contains(@id,"Next")]/span[@class="pagerlink"]'));
                        var home = await HomeElement.length;
                        if (home) {
                            var nextLink = await driver.findElement(By.xpath('//a[contains(@id,"Next")]'));
                            await nextLink.click();
                            loop = true;
                        }                        
                    }
                    catch (e) { }
                } while (loop);                
            }
            var clearElementData = await driver.findElements(By.xpath("//input[@id='basicSearchFooterInterface.clearAction']"));
            var isclearElementPresent = await clearElementData.length;
            if (isclearElementPresent) {
                var clearElement = await driver.findElement(By.xpath("//input[@id='basicSearchFooterInterface.clearAction']"));
                await clearElement.click();
                await driver.sleep(1000);
                var companyElement = await driver.findElement(By.xpath('//select[@id="basicSearchInterface.jobfield1L1"]/option[2]'));
                await companyElement.click();
            }
        }
        await driverjobdetails.quit();
        await driver.quit();
        snippet(configuration, jobMaker.atsJobCount, jobMaker.failedJobs.length, jobMaker, onsuccess, onfailure);
    } catch (e) {
        await driverjobdetails.quit();
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
var Promise = require('promise');
var package = global.createPackage();
var he = require('he');
var service = package.service;
var cleanHtml = require('clean-html');
var resource = package.resource;
var log = resource.constants.log;
var selenium = package.scrape.selenium();
var jobMaker = package.resource.download.variable("job");
jobMaker.setAlertCount(2);
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

        await driver.get('https://citi.taleo.net/careersection/2/jobdetail.ftl?lang=pt-BR');
        await driver.sleep(4000);
        var searchLink = await driver.findElement(By.xpath('//*[@id="topNavInterface.advancedSearchTabAction"]'));
        await searchLink.click();

        var jobCountElement = await driver.findElement(By.xpath('//*[@id="requisitionListInterface.searchResultHeaderId"]//span[contains(text(),"Resultados da Pesquisa")]'));
        var atsCount = await jobCountElement.getText();
        var jobCount = atsCount.split("(");
        var atsJobCount = jobCount[1].split("vagas");
        jobMaker.setatsJobCount(parseInt(atsJobCount[0].trim()));

        var categoryElement = await driver.findElement(By.xpath('//*[@id="advancedSearchInterface.jobfield1L1"]'));
        var optionArray = await categoryElement.findElements(By.tagName('option'));

        for (var i = 2; i <= optionArray.length; i++) {

            if (i > 2) {
                var showCriteriaLink = await driver.findElement(By.xpath('//*[@id="advancedSearchFooterInterface.showCriteriaAction"]'));
                await showCriteriaLink.click();
                await driver.sleep(2000);
            }

            var option = await driver.findElement(By.xpath('//*[@id="advancedSearchInterface.jobfield1L1"]/option[' + i + ']'));
            var category = await option.getAttribute('text');
            await option.click();
            await driver.sleep(2000);
            var submitElement = await driver.findElement(By.xpath('//*[@id="advancedSearchFooterInterface.searchAction"]'));
            await submitElement.click();
            await driver.sleep(1000);

            var counter = 1;
            do {
                var jobContainer = await driver.findElements(By.xpath('//*[@id="requisitionListInterface.listRequisition"]/tbody/tr[' + counter + ']'));
                var isPresent = await jobContainer.length;
                if (isPresent) {
                    try {
                        var job = jobMaker.create();

                        var titleElement = await driver.findElement(By.xpath('//*[@id="requisitionListInterface.listRequisition"]/tbody/tr[' + counter + ']//span[@class="titlelink"]/a'));
                        var title = await titleElement.getText();
                        var jobIdElement = await driver.findElement(By.xpath('//*[@id="requisitionListInterface.listRequisition"]/tbody/tr[' + counter + ']//span[contains(@id,"requisitionListInterface.reqContestNumberValue")]'));
                        job.JDTID_UNIQUE_NUMBER = await jobIdElement.getText();

                        job.JOB_APPLY_URL = "https://citi.taleo.net/careersection/2/jobdetail.ftl?lang=pt-BR&job=" + job.JDTID_UNIQUE_NUMBER;

                        var jobDetailURL = "https://citi.taleo.net/careersection/2/jobdetail.ftl?lang=pt-BR&job=" + job.JDTID_UNIQUE_NUMBER;
                        await driverjobdetails.get(jobDetailURL);
                        await driver.sleep(3000);

                        var jobDetail = await driverjobdetails.findElements(By.xpath('//div[@class="editablesection"]'));
                        if (jobDetail.length == 1) {
                            var locationElement = await driverjobdetails.findElement(By.xpath('//*[@id="requisitionDescriptionInterface.ID1798.row1"]'));
                            var location = await locationElement.getText();
                            var multipleLocationElement = await driverjobdetails.findElement(By.xpath('//*[@id="requisitionDescriptionInterface.ID1798.row1"]'));
                            var multipleLocation = await multipleLocationElement.getAttribute("innerHTML");
                            var typeElement = await driverjobdetails.findElement(By.xpath('//*[@id="requisitionDescriptionInterface.ID1948.row1"]'));
                            job.JOB_TYPE = await typeElement.getText();
                            job.JOB_STATUS = job.JOB_TYPE;
                            var qualificationElement = await driverjobdetails.findElements(By.xpath('//*[@id="requisitionDescriptionInterface.ID1898.row1"]'));
                            if (qualificationElement.length == 1) {
                                var qualificationElement = await driverjobdetails.findElement(By.xpath('//*[@id="requisitionDescriptionInterface.ID1898.row1"]'));
                                job.QUALIFICATIONS = await qualificationElement.getText();
                            }

                            var descriptionElement = await driverjobdetails.findElement(By.xpath('//div[@class="editablesection"]'));
                            var desc1 = await descriptionElement.getAttribute("outerHTML");
                            var descr = desc1.split('Descrição</span></div></h2>');
                            var desc = descr[1].split('<div id="requisitionDescriptionInterface.ID1755');
                            var description = 'Descrição' + desc[0].replace('<h2 xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:ftl="http://www.taleo.net/ftl" xmlns:htm="http://www.w3.org/1999/xhtml" class="no-change-header-inline"><div id="requisitionDescription<br>Interface.d26612e324.row1" class="inlinepanel" title="" style="DISPLAY: inline"> Qualificações</div></h2>', '').
                                replace('<div class="staticcontentlinepanel"><p></p></div>', '').
                                replace('Description', 'Description<br>');
                            description = description.replace(/<div class="staticcontentlinepanel"><p><\/p><\/div>/g, '');

                            job.JOB_TITLE = title;
                            job.JOB_CATEGORY = category;
                            if (location != null) {
                                if (multipleLocation.includes(",")) {
                                    var multipleLoc = multipleLocation.split(",");
                                    var loc = multipleLoc[0].split("-");
                                    if (loc.length == 2) {
                                        job.JOB_LOCATION_CITY = loc[1];
                                    }
                                    else if (loc.length == 4) {
                                        job.JOB_LOCATION_COUNTRY = loc[1];
                                        job.JOB_LOCATION_STATE = loc[2];
                                        job.JOB_LOCATION_CITY = loc[3];
                                    }
                                    else if (loc.length == 3) {
                                        job.JOB_LOCATION_COUNTRY = loc[1];
                                        job.JOB_LOCATION_CITY = loc[2];
                                    }
                                    else {
                                        job.JOB_LOCATION_CITY = location;
                                    }
                                }
                                else {
                                    var loc = location.split("-");
                                    if (loc.length == 2) {
                                        job.JOB_LOCATION_CITY = loc[1];
                                    }
                                    else if (loc.length == 4) {
                                        job.JOB_LOCATION_COUNTRY = loc[1];
                                        job.JOB_LOCATION_STATE = loc[2];
                                        job.JOB_LOCATION_CITY = loc[3];
                                    }
                                    else if (loc.length == 3) {
                                        job.JOB_LOCATION_COUNTRY = loc[1];
                                        job.JOB_LOCATION_CITY = loc[2];
                                    }
                                    else {
                                        job.JOB_LOCATION_CITY = location;
                                    }
                                }

                            }

                            if (job.JOB_LOCATION_COUNTRY == "BRA") {
                                job.JOB_LOCATION_COUNTRY = "BR";
                            }

                            var jobDescription = "";
                            var optionTag = {
                                'add-remove-tags': ['span']
                            };

                            cleanHtml.clean(description, optionTag, function (html) {
                                jobDescription = html;
                            });
                            job.TEXT = HtmlEscape(jobDescription);
                            jobMaker.successful.add(job, botScheduleID);
                        }
                        counter = counter + 2;
                    } catch (e) {
                        jobMaker.failed.add(job.JDTID_UNIQUE_NUMBER, e.message);
                        counter = counter + 2;
                    }
                }
            } while (isPresent);

        }
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
    description = description.replace(/\s\s+/g, ' ');
    description = description.replace(/\r?\n|\r/g, '');
    description = description.replace(/&#x9;/g, '');
    description = description.replace(/&ensp;+/g, "");
    description = description.replace(/&mldr;+/g, "&hellip;");
    description = description.replace(/&#xfffd;+/g, "")
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

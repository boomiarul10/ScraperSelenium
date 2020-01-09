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

        await driver.get('https://citi.taleo.net/careersection/2/moresearch.ftl?lang=hu');
        await driver.sleep(5000);

        var atsJobCount = await driver.findElement(By.xpath('//*[@id="requisitionListInterface.searchResultHeaderId"]//span[contains(text(),"Keresés eredménye")]'));
        var atscount = await atsJobCount.getText();
        var record = atscount.split("eredménye (").pop().split("állás").shift();
        jobMaker.setatsJobCount(parseInt(record.trim()));

        var categoryElement = await driver.findElement(By.xpath('//Select[@name="jobfield1L1"]'));
        var optionArray = await categoryElement.findElements(By.tagName('option'));

        for (var i = 2; i <= optionArray.length; i++) {
            var option = await driver.findElement(By.xpath('//Select[@name="jobfield1L1"]/Option[' + i + ']'));
            var optionValue = await option.getAttribute('text');
            await option.click();

            var searchelement = await driver.findElement(By.xpath("//input[@id='advancedSearchFooterInterface.searchAction']"));
            await searchelement.click();

            var mainJobContainer = await driver.findElements(By.xpath("//div[@id='requisitionListInterface.listRequisitionContainer']/table/tbody/tr[@class='ftlcopy ftlrow']"));
            var isJobPresent = await mainJobContainer.length;
            if (isJobPresent) {
                await driver.findElement(By.xpath('//*[@id="requisitionListInterface.dropListSize"]/option[5]')).click();
            }

            var loop;
            var pagenumber = 1;
            do {
                loop = false;
                var counter = 1;
                do {
                    var jobContainer = await driver.findElements(By.xpath("//div[@id='requisitionListInterface.listRequisitionContainer']/table/tbody/tr[@class='ftlcopy ftlrow'][" + counter + ']'));
                    var isPresent = await jobContainer.length;
                    if (isPresent) {
                        try {
                            var job = jobMaker.create();

                            var titleElement = await driver.findElement(By.xpath("//div[@id='requisitionListInterface.listRequisitionContainer']/table/tbody/tr[@class='ftlcopy ftlrow'][" + counter + "]//a[starts-with(@id,'requisitionListInterface.reqTitleLinkAction.row')]"));
                            job.JOB_TITLE = await titleElement.getText();

                            var idElement = await driver.findElement(By.xpath("//div[@id='requisitionListInterface.listRequisitionContainer']/table/tbody/tr[@class='ftlcopy ftlrow'][" + counter + "]//div[@class='editablesection']//span[starts-with(@id,'requisitionListInterface.reqContestNumberValue.row')]"));
                            job.JDTID_UNIQUE_NUMBER = await idElement.getText();

                            if (job.JDTID_UNIQUE_NUMBER){
                                var url = "https://citi.taleo.net/careersection/2/jobdetail.ftl?lang=hu&job=" + job.JDTID_UNIQUE_NUMBER;
                            }
                            await driverjobdetails.get(url);
                            await driverjobdetails.sleep(1000);

                            var jobdetailspage = await driverjobdetails.findElements(By.xpath("//div[@class='editablesection']"));
                            var isDetailPage = await jobdetailspage.length;
                            if (isDetailPage) {

                                var locationElement = await driverjobdetails.findElement(By.xpath("//*[@id='requisitionDescriptionInterface.ID1798.row1']"));
                                var location = await locationElement.getText();

                                if (location) {

                                    if (location.includes('-')) {
                                        var countryIndex = location.indexOf('-');
                                        var stringCountry = location.substring(countryIndex + 1);
                                        var stateIndex = stringCountry.indexOf('-');
                                        job.JOB_LOCATION_COUNTRY = stringCountry.substring(0, stateIndex);

                                        var stringState = stringCountry.substring(stateIndex + 1);
                                        var cityIndex = stringState.indexOf('-');
                                        job.JOB_LOCATION_CITY = stringState.substring(cityIndex + 1);

                                        job.JOB_LOCATION_STATE = stringState.substring(0, cityIndex);

                                        if (job.JOB_LOCATION_COUNTRY) {
                                            if (job.JOB_LOCATION_COUNTRY == "HUN") {
                                                job.JOB_LOCATION_COUNTRY = "HU";
                                            }
                                        }
                                    }
                                }

                                var typeData = await driverjobdetails.findElements(By.xpath("//div[@id='requisitionDescriptionInterface.ID1905.row1' and //*[contains(text(), 'Munkarend')]]//span[3]"));
                                var isTypePresent = await typeData.length;
                                if (isTypePresent) {
                                    var typeElement = await driverjobdetails.findElement(By.xpath("//div[@id='requisitionDescriptionInterface.ID1905.row1' and //*[contains(text(), 'Munkarend')]]//span[3]"));
                                    job.JOB_TYPE = await typeElement.getText();
                                }

                                job.JOB_STATUS = job.JOB_TYPE;

                                //var statusData = await driverjobdetails.findElements(By.xpath("//div[@id='requisitionDescriptionInterface.ID2055.row1' and //*[contains(text(), 'Status pracownika')]]//span[3]"));
                                //var isStatusPresent = await statusData.length;
                                //if (isStatusPresent) {
                                //    var statusElement = await driverjobdetails.findElement(By.xpath("//div[@id='requisitionDescriptionInterface.ID2055.row1' and //*[contains(text(), 'Status pracownika')]]//span[3]"));
                                //    job.JOB_STATUS = await statusElement.getText();
                                //}

                                var qualificationData = await driverjobdetails.findElements(By.xpath("//div/div/div/form/div/div/div/div/div/div/table//div/div/table//div/div[4]/span/ul"));
                                var isQualificationPresent = await qualificationData.length;
                                if (isQualificationPresent) {
                                    var qualificationElement = await driverjobdetails.findElement(By.xpath("//div/div/div/form/div/div/div/div/div/div/table//div/div/table//div/div[4]/span/ul"));
                                    job.QUALIFICATIONS = await qualificationElement.getText();
                                }

                                var JobDescription = await driverjobdetails.findElement(By.xpath('//*[@id="requisitionDescriptionInterface.ID1509.row1"]'));
                                var desc = await JobDescription.getAttribute("outerHTML");
                                var JobDescriptionFirst = await driverjobdetails.findElement(By.xpath("//div/div/div/form/div/div/div/div/div/div/table//div/div/table//div/div[8][@class='contentlinepanel']"));
                                var desc1 = await JobDescriptionFirst.getAttribute("outerHTML");
                                var JobDescriptionSecond = await driverjobdetails.findElement(By.xpath("//div[@class='editablesection']"));
                                var desc2 = await JobDescriptionSecond.getAttribute("outerHTML");

                                if (desc && desc1 && desc2) {
                                    var description = desc2.split(desc)[1].split(desc1)[0];
                                }

                                if (description) {
                                    description = description.replace(/<span/g, '<font');
                                    description = description.replace(/<\/span/g, '</font');
                                    description = description.replace('Description', 'Description<br>');
                                    description = description.replace('<h2 xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:ftl="http://www.taleo.net/ftl" xmlns:htm="http://www.w3.org/1999/xhtml" class="no-change-header-inline"><div id="requisitionDescription<br>Interface.d26612e324.row1" class="inlinepanel" title="" style="DISPLAY: inline"> Qualifications</div></h2>', '');
                                    description = description.replace('<div class="staticcontentlinepanel"><p></p></div>', '');
                                    job.TEXT = HtmlEscape(description);
                                }

                                job.JOB_APPLY_URL = "https://citi.taleo.net/careersection/2/jobdetail.ftl?lang=hu&job=" + job.JDTID_UNIQUE_NUMBER;
                                job.JOB_CATEGORY = optionValue;                                
                                jobMaker.successful.add(job, botScheduleID);
                            }
                            counter++;
                        } catch (e) {
                            jobMaker.failed.add(job.JDTID_UNIQUE_NUMBER, e.message);
                            counter++;
                        }
                    }
                } while (isPresent);

                try {
                    var HomeElement = await driver.findElements(By.xpath('//*[@id="requisitionListInterface.pagerDivID4003.panel.Next"]/span[@class="pagerlink"]'));
                    var home = await HomeElement.length;
                    if (home) {
                        var nextLink = await driver.findElement(By.xpath('//*[@id="requisitionListInterface.pagerDivID4003.panel.Next"]'));
                        await nextLink.click();
                        loop = true;
                    }
                } catch (e) {
                    var a = e.message;
                }
            } while (loop);

            var clearElementData = await driver.findElements(By.xpath("//input[@id='advancedSearchFooterInterface.clearAction']"));
            var isclearElementPresent = await clearElementData.length;
            if (isclearElementPresent) {
                var clearElement = await driver.findElement(By.xpath("//input[@id='advancedSearchFooterInterface.clearAction']"));
                await clearElement.click();
                await driver.sleep(1000);
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
    description = description.replace(/&nbsp;/g, ' ');
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
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
        //var driver = selenium.createDriver("chrome");
        //var driverjobdetails = selenium.createDriver("chrome");

        await driver.manage().window().maximize();
        await driverjobdetails.manage().window().maximize();

        await driver.get('https://citi.taleo.net/careersection/2/moresearch.ftl?lang=zh-TW');

        var atsJobCount = await driver.wait(until.elementLocated(By.xpath("//span[@id='requisitionListInterface.ID4252']")), 4000);
        var atscount = await atsJobCount.getText();
        var record = atscount.split("(找到").pop().split("個職務)").shift();
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

                            var locationElement = await driver.findElement(By.xpath("//div[@id='requisitionListInterface.listRequisitionContainer']/table/tbody/tr[@class='ftlcopy ftlrow'][" + counter + "]//div[@class='editablesection']//span[starts-with(@id,'requisitionListInterface.reqBasicLocation.row')]"));
                            var location = await locationElement.getText();

                            if (location) {
                                var country = location;
                                country = country.replace('亞太, APAC-CHN', 'China');
                                country = country.replace('APAC-TWN', 'Taiwan');
                                country = country.replace('NAM-USA', 'USA');
                                country = country.replace('(Nanking)', '');
                                country = country.replace('LATAM-', '');

                                var rex = /(.*)-.*-.*/;
                                var rex1 = /(.*)-.*/;
                                var rexPresent = rex.test(country);

                                if (rexPresent) {
                                    var countryData1 = rex.exec(country);
                                    country = countryData1[1];
                                }
                                rex.lastIndex = 0;

                                country = country.replace('APAC-', '');

                                var rex1Present = rex1.test(country);

                                if (rex1Present) {
                                    var countryData2 = rex1.exec(country);
                                    country = countryData2[1];
                                }
                                rex1.lastIndex = 0;

                                job.JOB_LOCATION_COUNTRY = country;

                                var state = location;
                                state = state.replace('亞太, APAC-CHN', 'China');
                                state = state.replace(' (Nanking)', '');
                                state = state.replace('APAC-', '');
                                state = state.replace('LATAM-', '');

                                var stateRex = /.*-(.*)-.*-.*/;
                                var stateRexPresent = stateRex.test(state);

                                if (stateRexPresent) {
                                    var stateData1 = stateRex.exec(state);
                                    state = stateData1[1];
                                }
                                stateRex.lastIndex = 0;

                                var stateRex1 = /.*-(.*)-.*/;
                                var stateRex1Present = stateRex1.test(state);

                                if (stateRex1Present) {
                                    var stateData2 = stateRex1.exec(state);
                                    state = stateData2[1];
                                }
                                stateRex1.lastIndex = 0;

                                var stateRex2 = /(.*)-.*/;
                                var stateRex2Present = stateRex2.test(state);

                                if (stateRex2Present) {
                                    var stateData3 = stateRex2.exec(state);
                                    state = stateData3[1];
                                }
                                stateRex2.lastIndex = 0;

                                job.JOB_LOCATION_STATE = state;

                                var city = location;
                                city = city.replace('亞太, APAC-CHN', 'China');
                                city = city.replace(' (Nanking)', '');

                                var cityRex = /.*-(.*)/;
                                var cityRexPresent = cityRex.test(city);

                                if (cityRexPresent) {
                                    var cityData1 = cityRex.exec(city);
                                    city = cityData1[1];
                                }
                                cityRex.lastIndex = 0;
                                
                                city = city.replace("nan", "T'ai-nan");
                                city = city.replace("chung", "T'ai-chung");
                                city = city.replace("LATAM-", "");
                                city = city.replace("APAC-", "");

                                job.JOB_LOCATION_CITY = city;

                            }

                            if (job.JDTID_UNIQUE_NUMBER) {
                                var url = "https://citi.taleo.net/careersection/2/jobdetail.ftl?lang=zh-TW&job=" + job.JDTID_UNIQUE_NUMBER;
                            }
                            await driverjobdetails.get(url);
                            await driverjobdetails.sleep(1000);

                            var jobdetailspage = await driverjobdetails.findElements(By.xpath("//div[@class='editablesection']"));
                            var isDetailPage = await jobdetailspage.length;
                            if (isDetailPage) {

                                var typeData = await driverjobdetails.findElements(By.xpath("//div/div/div/form/div/div/div/div/div/div/table//div/div/table//div/div[11]/span[3]"));
                                var isTypePresent = await typeData.length;
                                if (isTypePresent) {
                                    var typeElement = await driverjobdetails.findElement(By.xpath("//div/div/div/form/div/div/div/div/div/div/table//div/div/table//div/div[11]/span[3]"));
                                    job.JOB_TYPE = await typeElement.getText();
                                    job.JOB_STATUS = job.JOB_TYPE;
                                }

                                //var statusData = await driverjobdetails.findElements(By.xpath("//div[@id='requisitionDescriptionInterface.ID2055.row1' and //*[contains(text(), 'Status pracownika')]]//span[3]"));
                                //var isStatusPresent = await statusData.length;
                                //if (isStatusPresent) {
                                //    var statusElement = await driverjobdetails.findElement(By.xpath("//div[@id='requisitionDescriptionInterface.ID2055.row1' and //*[contains(text(), 'Status pracownika')]]//span[3]"));
                                //    job.JOB_STATUS = await statusElement.getText();
                                //}

                                var qualificationData = await driverjobdetails.findElements(By.xpath("//div/div/div/form/div/div/div/div/div/div/table//div/div/table//div/div[10]/span[3]"));
                                var isQualificationPresent = await qualificationData.length;
                                if (isQualificationPresent) {
                                    var qualificationElement = await driverjobdetails.findElement(By.xpath("//div/div/div/form/div/div/div/div/div/div/table//div/div/table//div/div[10]/span[3]"));
                                    job.QUALIFICATIONS = await qualificationElement.getText();
                                }

                                var JobDescription = await driverjobdetails.findElement(By.xpath('//*[@id="requisitionDescriptionInterface.ID1509.row1"]'));
                                var desc = await JobDescription.getAttribute("outerHTML");
                                var JobDescriptionFirst = await driverjobdetails.findElement(By.xpath("//div/div/div/form/div/div/div/div/div/div/table//div/div/table//div/div[8]"));
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
                                
                                job.JOB_APPLY_URL = "https://citi.taleo.net/careersection/2/jobdetail.ftl?lang=zh-TW&job=" + job.JDTID_UNIQUE_NUMBER;
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
                    var pagerLink = await driver.findElements(By.xpath('//*[@class="pagerpanel"][contains(@style,"display: block")]'));
                    var pager = await pagerLink.length;
                    if (pager) {
                        var HomeElement = await driver.findElements(By.xpath('//*[@id="requisitionListInterface.pagerDivID4591.panel.Next"]/span[@class="pagerlink"]'));
                        var home = await HomeElement.length;
                        if (home) {
                            var nextLink = await driver.findElement(By.xpath('//*[@id="requisitionListInterface.pagerDivID4591.Next"]'));
                            await nextLink.click();
                            loop = true;
                        }
                    }
                } catch (e) {
                    var ex = e.message;
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
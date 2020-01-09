var Promise = require('promise');
var package = global.createPackage();
var he = require('he');
var service = package.service;
var cleanHtml = require('clean-html');
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

        driver.manage().timeouts().implicitlyWait(10000);

        await driver.get('https://citi.taleo.net/careersection/2/jobdetail.ftl?lang=es');

        var searchLink = await driver.findElement(By.xpath('//*[@id="topNavInterface.advancedSearchTabAction"]'));
        await searchLink.click();

        await driver.findElement(By.xpath('//*[@id="requisitionListInterface.dropListSize"]/option[5]')).click();

        var jobCountElement = await driver.findElement(By.xpath('//*[@id="requisitionListInterface.searchResultHeaderId"]//span'));
        var atsCount = await jobCountElement.getText();
        var jobCount = atsCount.split("(");
        var atsJobCount = jobCount[1].split(" ");
        jobMaker.setatsJobCount(parseInt(atsJobCount[0].trim()));

        var categoryElement = await driver.findElement(By.xpath('//*[@id="advancedSearchInterface.jobfield1L1"]'));
        var optionArray = await categoryElement.findElements(By.tagName('option'));

        for (var i = 2; i <= optionArray.length; i++) {
            var option = await driver.findElement(By.xpath('//*[@id="advancedSearchInterface.jobfield1L1"]/option[' + i + ']'));
            var category = await option.getAttribute('text');
            await option.click();
            var submitElement = await driver.findElement(By.xpath('//*[@id="advancedSearchFooterInterface.searchAction"]'));
            await submitElement.click();

            var loop;
            do {
                loop = false;
                var counter = 1;
                do {
                    var jobContainer = await driver.findElements(By.xpath('//*[@id="requisitionListInterface.listRequisition"]/tbody/tr[@class="ftlcopy ftlrow"][' + counter + ']'));
                    var isPresent = await jobContainer.length;
                    if (isPresent) {
                        try {
                            var job = jobMaker.create();

                            var titleElement = await driver.findElement(By.xpath('//*[@id="requisitionListInterface.listRequisition"]/tbody/tr[@class="ftlcopy ftlrow"][' + counter + ']//span[@class="titlelink"]/a'));
                            var title = await titleElement.getText();
                            var jobIdElement = await driver.findElement(By.xpath('//*[@id="requisitionListInterface.listRequisition"]/tbody/tr[@class="ftlcopy ftlrow"][' + counter + ']//span[contains(@id,"requisitionListInterface.reqContestNumberValue")]'));
                            job.JDTID_UNIQUE_NUMBER = await jobIdElement.getText();

                            var url = "https://citi.taleo.net/careersection/2/jobdetail.ftl?lang=es&job=" + + job.JDTID_UNIQUE_NUMBER;
                            job.JOB_APPLY_URL = url;

                            await driverjobdetails.get(url);
                            var locationElement = await driverjobdetails.findElement(By.xpath('//*[@id="requisitionDescriptionInterface.ID1798.row1"]'));
                            var location = await locationElement.getText();

                            var typeElement = await driverjobdetails.findElements(By.xpath('//*[@id="requisitionDescriptionInterface.ID1948.row1"]'));
                            var typeLength = await typeElement.length;
                            if (typeLength) {
                                var typeElement = await driverjobdetails.findElement(By.xpath('//*[@id="requisitionDescriptionInterface.ID1948.row1"]'));
                                job.JOB_TYPE = await typeElement.getText();
                            }

                            var statusElement = await driverjobdetails.findElements(By.xpath('//*[@id="requisitionDescriptionInterface.ID2098.row1"]'));
                            var statusLength = await statusElement.length;
                            if (statusLength) {
                                var statusElement = await driverjobdetails.findElement(By.xpath('//*[@id="requisitionDescriptionInterface.ID2098.row1"]'));
                                job.JOB_STATUS = await statusElement.getText();
                            }


                            var qualificationElement = await driverjobdetails.findElements(By.xpath('//*[@id="requisitionDescriptionInterface.ID1898.row1"]'));
                            var qualificationLength = await qualificationElement.length;
                            if (qualificationLength) {
                                var qualificationElement = await driverjobdetails.findElement(By.xpath('//*[@id="requisitionDescriptionInterface.ID1898.row1"]'));
                                job.QUALIFICATIONS = await qualificationElement.getText();
                            }

                            var descriptionElement = await driverjobdetails.findElement(By.xpath('//div[@class="editablesection"]'));
                            var desc = await descriptionElement.getAttribute("innerHTML");
                            desc = desc.split('<span class="subtitle">Descripción</span>');
                            desc = 'Descripción' + desc[1];
                            desc = desc.split('<div id="requisitionDescriptionInterface.buttongrouppanelBottom.row1"');
                            var description = desc[0];
                            description = description.replace('Descripción', 'Descripción<br>')
                                .replace('<h2 xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:ftl="http://www.taleo.net/ftl" xmlns:htm="http://www.w3.org/1999/xhtml" class="no-change-header-inline"><div id="requisitionDescription<br>Interface.d26612e324.row1" class="inlinepanel" title="" style="DISPLAY: inline"> Qualifications</div></h2>', '')
                                .replace('<div class="staticcontentlinepanel"><p></p></div>', '');

                            job.JOB_TITLE = title;
                            job.JOB_CATEGORY = category;


                            var jobDescription = "";
                            if (job.JDTID_UNIQUE_NUMBER == "17064647") {
                                var optionTag = {
                                    'add-remove-tags': ['span', 'imagedata']
                                    //'remove-attributes': [],
                                    //'remove-tags': []
                                };
                            } else {
                                var optionTag = {
                                    'add-remove-tags': ['span', 'imagedata'],
                                    'remove-attributes': [],
                                    'remove-tags': []
                                };
                            }
                            cleanHtml.clean(description, optionTag, function (html) {
                                jobDescription = html;
                            });
                            job.TEXT = HtmlEscape(jobDescription);


                            if (location) {
                                var loc = location.split("-");
                                if (loc.length == 3) {
                                    var city = loc[2];
                                    var state = "";
                                    var country = loc[1];
                                } else if (loc.length > 3) {
                                    var city = loc[3];
                                    var state = loc[2];
                                    var country = loc[1];
                                } else if (loc.length == 2) {
                                    var country = loc[1];
                                    var city = "";
                                    var state = "";
                                } else if (loc.length == 1) {
                                    var country = loc;
                                    var city = "";
                                    var state = "";
                                }
                                city = city.replace('Latinoamérica/México', '').replace('México', 'Mexico');
                                state = state.replace('Latinoamérica/México', '').replace(/[0-9]/g, '');
                                country = country.replace('Latinoamérica/México', 'Mexico').replace('México', 'Mexico').replace('Panamá', 'Panama').replace('CGPA', '').replace(/[0-9]/g, '');
                                country = country.replace('NIC', 'NC').replace('COL', 'CO').replace('VEN', 'VE').replace('ARG', 'AR').
                                    replace('República Dominicana', 'Dominican Republic').replace('PER', 'PE').replace('URY', 'UY').
                                    replace('SLV', 'SV').replace('MEX', 'MX').replace('PAN', 'PA').replace('BRA', 'BR').
                                    replace('CRI', 'CR').replace('DOM', 'DO').replace('El Salvador', 'SV').replace('Salvador', 'SV').replace('Mexico', 'MX');
                                job.JOB_LOCATION_CITY = city;
                                job.JOB_LOCATION_STATE = state;
                                job.JOB_LOCATION_COUNTRY = country;
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
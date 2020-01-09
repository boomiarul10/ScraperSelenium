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

        await driver.get('https://csc.taleo.net/careersection/sitemap.jss?portalCode=CSCExternalCareerSite&lang=en');
        await driver.sleep(1000);
        var urls = [];
        var totalJobElement = await driver.findElements(By.xpath('//*[contains(text(),"http")][@class="text"]'));
        var totalJobCount = await totalJobElement.length;
        jobMaker.setatsJobCount(parseInt(totalJobCount));

        for (var i = 0; i < totalJobCount; i++) {
            var url = await totalJobElement[i].getText();
            urls.push(url);
        }

        await driver.quit();

        for (var j = 0; j < totalJobCount; j++) {
            try {
                var job = jobMaker.create();


                await driverjobdetails.get(urls[j]);
                await driverjobdetails.sleep(2000);
                var jobdetailspage = await driverjobdetails.findElements(By.xpath('//*[@class="editablesection"]'));
                var isDetailPage = await jobdetailspage.length;
                if (isDetailPage) {

                    var idElement = await driverjobdetails.findElement(By.xpath('//*[@id="requisitionDescriptionInterface.reqContestNumberValue.row1"]'));
                    job.JDTID_UNIQUE_NUMBER = await idElement.getText();

                    var typeElementData = await driverjobdetails.findElements(By.xpath("//*[@class='editablesection']/div[.//span[text()='Schedule']]/span[@class='text']"));
                    var isType = await typeElementData.length;
                    if (isType) {
                        var typeElement = await driverjobdetails.findElement(By.xpath("//*[@class='editablesection']/div[.//span[text()='Schedule']]/span[@class='text']"));
                        job.JOB_TYPE = await typeElement.getText();
                    }

                    var longText1ElemData = await driverjobdetails.findElements(By.xpath("//*[@class='editablesection']/div[.//span[text()='Job Title']]/span[@class='text']"));
                    var isLongText = await longText1ElemData.length;
                    if (isLongText) {
                        var longText1Elem = await driverjobdetails.findElement(By.xpath("//*[@class='editablesection']/div[.//span[text()='Job Title']]/span[@class='text']"));
                        var longText1 = await longText1Elem.getText();
                    }

                    var titleElement = await driverjobdetails.findElement(By.xpath('//*[@id="requisitionDescriptionInterface.reqTitleLinkAction.row1"]'));
                    job.JOB_TITLE = await titleElement.getText();

                    var salaryElemData = await driverjobdetails.findElements(By.xpath("//*[@class='editablesection']/div[.//span[text()='Job Title']]/span[@class='text']"));
                    var isSalary = await salaryElemData.length;
                    if (isSalary) {
                        var salaryElem = await driverjobdetails.findElement(By.xpath("//*[@class='editablesection']/div[.//span[text()='Job Title']]/span[@class='text']"));
                        job.JOB_SALARY = await salaryElem.getText();
                    }



                    job.JOB_APPLY_URL = "https://csc.taleo.net/careersection/cscexternalcareersite/jobdetail.ftl?job=" + job.JDTID_UNIQUE_NUMBER + "&lang=en&sns_id";

                    var locationsElement = await driverjobdetails.findElements(By.xpath("//*[@class='editablesection']/div[.//span[text()='Primary Location']]/span[@class='text']"));
                    var islocation = await locationsElement.length;
                    if (islocation) {
                        var locationElement = await driverjobdetails.findElement(By.xpath("//*[@class='editablesection']/div[.//span[text()='Primary Location']]/span[@class='text']"));
                        var location = await locationElement.getText();
                        var country = location;
                        //var state = location;

                        if (country) {
                            var rex = /(\w*\s?\w*\s?\w*)-.*-.*/;
                            var rexPresent = rex.test(country);
                            var rex1 = /(\w*)-.*/;
                            var rex1Present = rex1.test(country);
                            var rex2 = /(.*),.*/;
                            var rex2Present = rex2.test(country);

                            if (rexPresent) {
                                var countryData1 = rex.exec(country);
                                job.JOB_LOCATION_COUNTRY = countryData1[1];
                            } else if (rex1Present) {
                                var countryData2 = rex1.exec(country);
                                job.JOB_LOCATION_COUNTRY = countryData2[1];

                            } else if (rex2Present) {
                                var countryData3 = rex2.exec(country);
                                job.JOB_LOCATION_COUNTRY = countryData3[1];
                            }
                            rex.lastIndex = 0;
                            rex1.lastIndex = 0;
                            rex2.lastIndex = 0;

                        }

                        if (location) {
                            var stateRex = /.*-(.*)-.*/;
                            var stateRexPresent = stateRex.test(location);


                            if (stateRexPresent) {
                                var stateData1 = stateRex.exec(location);
                                job.JOB_LOCATION_STATE = stateData1[1];

                                if (job.JOB_LOCATION_STATE) {
                                    var stateRex1 = /.*:\s(.*)/;
                                    var stateRex1Present = stateRex1.test(job.JOB_LOCATION_STATE);

                                    if (stateRex1Present) {
                                        var stateData2 = stateRex1.exec(job.JOB_LOCATION_STATE);
                                        job.JOB_LOCATION_STATE = stateData2[1];
                                    }
                                }
                            }
                            stateRex1.lastIndex = 0;
                            stateRex.lastIndex = 0;

                            var cityRex = /.*-.*-(.*)/;
                            var cityRexPresent = cityRex.test(location);


                            if (cityRexPresent) {
                                var cityData1 = cityRex.exec(location);
                                job.JOB_LOCATION_CITY = cityData1[1];

                                if (job.JOB_LOCATION_CITY) {
                                    var cityRex1 = /.*-(.*)/;
                                    var cityRex1Present = cityRex1.test(job.JOB_LOCATION_CITY);

                                    if (cityRex1Present) {
                                        var cityData2 = cityRex1.exec(job.JOB_LOCATION_CITY);
                                        job.JOB_LOCATION_CITY = cityData2[1];
                                    }
                                }
                            }
                            cityRex.lastIndex = 0;
                            cityRex1.lastIndex = 0;
                        }
                    }

                    job.JOB_LOCATION_STATE = (job.JOB_LOCATION_STATE == "E" ? " " : job.JOB_LOCATION_STATE);
                    job.JOB_LOCATION_STATE = (job.JOB_LOCATION_STATE == job.JOB_LOCATION_CITY ? "" : job.JOB_LOCATION_STATE);
                    job.JOB_LOCATION_CITY = ((job.JOB_LOCATION_COUNTRY == "AFGHANISTAN") && job.JOB_LOCATION_STATE == "" && job.JOB_LOCATION_CITY == "") ? "BAGRAM" : job.JOB_LOCATION_CITY;
                    job.JOB_TITLE = (job.JOB_TITLE == "" ? longText1 : job.JOB_TITLE);

                    var industryElemData = await driverjobdetails.findElements(By.xpath("//*[@class='editablesection']/div[.//span[text()='Division']]/span[@class='text']"));
                    var isIndustry = await industryElemData.length;
                    if (isIndustry) {
                        var industryElem = await driverjobdetails.findElement(By.xpath("//*[@class='editablesection']/div[.//span[text()='Division']]/span[@class='text']"));
                        job.JOB_INDUSTRY = await industryElem.getText();
                    }

                    var categoryElemData = await driverjobdetails.findElements(By.xpath("//*[@class='editablesection']/div[.//span[text()='Job Category']]/span[@class='text']"));
                    var isCategory = await categoryElemData.length;
                    if (isCategory) {
                        var categoryElement = await driverjobdetails.findElement(By.xpath("//*[@class='editablesection']/div[.//span[text()='Job Category']]/span[@class='text']"));
                        job.JOB_CATEGORY = await categoryElement.getText();
                    }

                    var statusElementData = await driverjobdetails.findElements(By.xpath("//*[@class='editablesection']/div[.//span[text()='Employee Status']]/span[@class='text']"));
                    var isStatus = await statusElementData.length;
                    if (isStatus) {
                        var statusElement = await driverjobdetails.findElement(By.xpath("//*[@class='editablesection']/div[.//span[text()='Employee Status']]/span[@class='text']"));
                        job.JOB_STATUS = await statusElement.getText();
                    }

                    var dateElementData = await driverjobdetails.findElements(By.xpath('//*[@id="requisitionDescriptionInterface.reqPostingDate.row1"]'));
                    var isDate = await dateElementData.length;
                    if (isDate) {
                        var dateElement = await driverjobdetails.findElement(By.xpath('//*[@id="requisitionDescriptionInterface.reqPostingDate.row1"]'));
                        job.ASSIGNMENT_START_DATE = await dateElement.getText();

                    }

                    var contactElementData = await driverjobdetails.findElements(By.xpath("//*[@class='editablesection']/div[.//span[text()='Remote Work Authorized']]/span[@class='text']"));
                    var isContact = await contactElementData.length;
                    if (isContact) {
                        var contactElement = await driverjobdetails.findElement(By.xpath("//*[@class='editablesection']/div[.//span[text()='Remote Work Authorized']]/span[@class='text']"));
                        job.JOB_CONTACT_PHONE = await contactElement.getText();
                    }

                    var contactStateElementData = await driverjobdetails.findElements(By.xpath("//*[@class='editablesection']/div[.//span[text()='Relocation Assistance']]/span[@class='text']"));
                    var isContactState = await contactStateElementData.length;
                    if (isContactState) {
                        var contactStateElement = await driverjobdetails.findElement(By.xpath("//*[@class='editablesection']/div[.//span[text()='Relocation Assistance']]/span[@class='text']"));
                        job.JOB_CONTACT_STATE = await contactStateElement.getText();
                    }

                    var contactZipElementData = await driverjobdetails.findElements(By.xpath("//*[@class='editablesection']/div[.//span[text()='Clearance Level']]/span[@class='text']"));
                    var isContactZip = await contactZipElementData.length;
                    if (isContactZip) {
                        var contactZipElement = await driverjobdetails.findElement(By.xpath("//*[@class='editablesection']/div[.//span[text()='Clearance Level']]/span[@class='text']"));
                        job.JOB_CONTACT_ZIP = await contactZipElement.getText();
                    }

                    var descElement1 = await driverjobdetails.findElement(By.xpath("//div[contains(@id,'requisitionDescriptionInterface.ID') and .//h2/div/span[text()='Description']]"));
                    var desc1 = await descElement1.getAttribute("outerHTML");

                    var descElementData2 = await driverjobdetails.findElements(By.xpath("//div[contains(@id,'requisitionDescriptionInterface.ID') and .//h2/div/span[text()='Qualifications']]"));
                    var isdesc2 = await descElementData2.length;
                    var desc2 = "";
                    if (isdesc2) {
                        var descElement2 = await driverjobdetails.findElement(By.xpath("//div[contains(@id,'requisitionDescriptionInterface.ID') and .//h2/div/span[text()='Qualifications']]"));
                        desc2 = await descElement2.getAttribute("outerHTML");
                    }

                    var descElementData3 = await driverjobdetails.findElements(By.xpath("//div[contains(@id,'requisitionDescriptionInterface.ID') and .//span[contains(text(), 'Equal Opportunity')]]"));
                    var isdesc3 = await descElementData3.length;
                    var desc3 = "";
                    if (isdesc3) {
                        var descElement3 = await driverjobdetails.findElement(By.xpath("//div[contains(@id,'requisitionDescriptionInterface.ID') and .//span[contains(text(), 'Equal Opportunity')]]"));
                        desc3 = await descElement3.getAttribute("outerHTML");
                    }

                    if (desc1) {
                        var desc = desc1 + desc2 + desc3;
                        desc = desc.replace(/<div class="mastercontentpanel3">/g, '<div>');
                        desc = desc.replace(/<span class="blockpanel"><span class="">&nbsp;<\/span><\/span>/g, '');
                        desc = desc.replace(/<p><\/p>/g, '');
                        desc = desc.replace(/<p><\/p><tr><td vAlign="top" width="840"><div><strong><\/strong>&nbsp;<\/div><\/td><\/tr>/g, '');
                        desc = desc.replace(/<div><b>&nbsp;<\/b><\/div>/g, '');
                        desc = desc.replace(/<div>&nbsp;<\/div>/g, '');
                        desc = desc.replace(/<div><strong><\/strong>&nbsp;<\/div>/g, '');
                        desc = desc.replace(/<p><br \/>              <\/p><br \/>/g, '<br />');
                        desc = desc.replace(/<\/p>/g, '</p><br/>');
                        desc = desc.replace(/<p/g, '<font');
                        desc = desc.replace(/<\/p/g, '</font');
                        desc = desc.replace(/<h2/g, '<font');
                        desc = desc.replace(/<\/h2/g, '</font');
                        desc = desc.replace(/<h1/g, '<font');
                        desc = desc.replace(/<\/h1/g, '</font');
                        desc = desc.replace(/<br \/><br \/>/g, "<br /><br />");
                        desc = desc.replace(">Description", "><b>Description:</b><br/>");
                        desc = desc.replace(">DUTIES AND RESPONSIBILITIES:", "><b>DUTIES AND RESPONSIBILITIES:</b>");
                        desc = desc.replace("Job Title:", "<br/><b>Job Title:</b>");
                        desc = desc.replace("Requisition ID:", "<b>Requisition ID:</b>");
                        desc = desc.replace("Job Category:", "<b>Job Category:</b>");
                        desc = desc.replace("Primary Location:", "<b>Primary Location:</b>");
                        desc = desc.replace("Schedule:", "<b>Schedule:</b>");
                        desc = desc.replace("Job Type:", "<b>Job Type:</b>");
                        desc = desc.replace("Employee Status:", "<b>Employee Status:</b>");
                        desc = desc.replace(">Travel:", "><b>Travel:</b>");
                        desc = desc.replace("Job Posting:", "<b>Job Posting:</b>");
                        desc = desc.replace("Remote Work Authorized:", "<b>Remote Work Authorized:</b>");
                        desc = desc.replace("Relocation Assistance:", "<b>Relocation Assistance:</b>");
                        desc = desc.replace("Clearance Level:", "<b>Clearance Level:</b>");
                        desc = desc.replace(/<\/span>/g, "</span><br/>");
                        desc = desc.replace(/<div id="requisitionDescriptionInterface.ID2107.row1" class="contentlinepanel" title="" style="">(.*)<\/div>/g, "");
                        job.TEXT = HtmlEscape(desc);
                    }
                    jobMaker.successful.add(job, botScheduleID);
                }

            } catch (e) {
                jobMaker.failed.add(job.JDTID_UNIQUE_NUMBER, e.message);
            }
        }

        await driverjobdetails.quit();
        snippet(configuration, jobMaker.atsJobCount, jobMaker.failedJobs.length, jobMaker, onsuccess, onfailure);
    } catch (e) {
        try {
            await driver.quit();
        } catch (ex) {
        }
        try {
            await driverjobdetails.quit();
        } catch (ex) {
        }

        var output = package.service.bot.createBotErrorOutput(configuration.scheduleid, jobMaker.jobs.length, jobMaker.atsJobCount, jobMaker.failedJobs.length, e);
        onfailure(output);
    }
}

function HtmlEscape(description) {
    description = he.encode(description, { 'useNamedReferences': true, 'decimal': true, 'allowUnsafeSymbols': true });
    description = description.replace(/&#9;/g, '');
    description = description.replace(/^\s+|\s+$/g, '');
    description = description.replace(/\r?\n|\r/g, '');
    description = description.replace(/&nbsp;/g, ' ');
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
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

        await driver.get('https://conduent.taleo.net/careersection/conduent_netherlands_nl/jobsearch.ftl?lang=nl&radiusType=K&location=275340492270&searchExpanded=true&radius=1');
        driver.sleep(5000);
        var dataa = await driver.getPageSource();
        var isJobTypePresent;
        var typeCounter = 1;
        var atsJobCount = await driver.wait(until.elementLocated(By.xpath("//span[@id='currentPageInfo']")), 4000);
        var atscount = await atsJobCount.getText();
        var record = atscount.split("van");
        jobMaker.setatsJobCount(parseInt(record[1].trim()));

        await driver.findElement(By.xpath('//*[@id="listFormatSwitch"]')).click();
        await driver.sleep(3000);
        //await driverjobdetails.sleep(3000);
        do {

            var jobTypeContainer = await driver.findElements(By.xpath("//div[@id='JOB_TYPE-content']/div[" + typeCounter + "]"));
            var isJobTypePresent = await jobTypeContainer.length;
            if (isJobTypePresent) {
                try {
                                        

                    await driver.findElement(By.xpath("//div[@id='JOB_TYPE-content']/div[" + typeCounter + "]/a/label")).click();
                    await driver.sleep(3000);
                    var jobType = await driver.findElement(By.xpath("//div[@id='JOB_TYPE-content']/div[" + typeCounter + "]/a/label/span/span[1]")).getText();

                    var loop;
                    var pagenumber = 1;
                    do {
                        loop = false;
                        var counter = 1;

                        do {


                            var jobContainer = await driver.findElements(By.xpath("//table[@id='jobs']/tbody/tr[" + counter + ']'));
                            var isPresent = await jobContainer.length;
                            if (isPresent) {
                                try {
                                    var job = jobMaker.create();
                                    var run = "default";

                                    while (run != "completed") {   

                                        job.JOB_TYPE = jobType;

                                        var dateElement = await driver.findElement(By.xpath("//table[@id='jobs']/tbody/tr[" + counter + "]/td[3]//span"));
                                        job.ASSIGNMENT_START_DATE = await dateElement.getText();

                                        var titleElement = await driver.findElement(By.xpath("//table[@id='jobs']/tbody/tr[" + counter + "]/th//span/a"));
                                        job.JOB_TITLE = await titleElement.getText();

                                        var url = await titleElement.getAttribute("href");

                                        await driverjobdetails.get(url);
                                        await driverjobdetails.sleep(1000);
                                        try {

                                            var jobdetailspage = await driverjobdetails.findElements(By.xpath("//div[@class='editablesection']"));
                                            var isDetailPage = await jobdetailspage.length;
                                            if (isDetailPage) {

                                                var idElement = await driverjobdetails.findElement(By.xpath("//span[@id='requisitionDescriptionInterface.reqContestNumberValue.row1']"));
                                                job.JDTID_UNIQUE_NUMBER = await idElement.getText();

                                                var applyURL = "https://conduent.taleo.net/careersection/jobdetail.ftl?job=" + job.JDTID_UNIQUE_NUMBER + "&lang=en";
                                                job.JOB_APPLY_URL = applyURL;

                                                var categoryElement = await driverjobdetails.findElement(By.xpath("//span[@id='requisitionDescriptionInterface.ID1627.row1']"));
                                                job.JOB_CATEGORY = await categoryElement.getText();

                                                var descElement = await driverjobdetails.findElement(By.xpath("//div[@id='requisitionDescriptionInterface.ID1538.row1']"));
                                                var desc = await descElement.getAttribute("outerHTML");                                                                                                                              
                                                desc = desc.replace(/<div class="mastercontentpanel3">/g, '<div>');
                                                desc = desc.replace(/<tr><td vAlign="top" width="840"><p style="MARGIN-TOP: 0px; MARGIN-BOTTOM: 0px">&nbsp;<\/p><\/td><\/tr>/g, '');
                                                desc = desc.replace(/(<span class="blockpanel"><span class="">&nbsp;<\/span><\/span>)/g, '');
                                                desc = desc.replace(/<p><br \/>              <\/p><br \/>/g, '<br />');
                                                desc = desc.replace(/<\/p>/g, '</p><br/>');
                                                desc = desc.replace(/<br \/><br \/>/g, '<br />');
                                                desc = desc.replace('Primary Location', '<b>Primary Location:</b>');
                                                desc = desc.replace('Organization', '<b>Organization:</b>');
                                                desc = desc.replace('>Travel', '><b>Travel:</b>');
                                                desc = desc.replace('Unposting Date', '<b>Unposting Date:</b>');
                                                desc = desc.replace(/<\/span>/g, '</span><br/>');
                                                desc = desc.replace(/Virtual\/work from home?/g, '<b>Virtual/work from home?</b>');
                                                desc = desc.replace(/>Job/g, '><b>Job</b>');

                                                var optionsTag = {
                                                    'add-remove-tags': ['p', 'h2', 'h1']
                                                };

                                                cleanHtml.clean(desc, optionsTag, function (html) {
                                                    desc = html;
                                                });

                                                var countryElement = await driverjobdetails.findElement(By.xpath("//span[@id='requisitionDescriptionInterface.ID1671.row1']"));
                                                var country = await countryElement.getText();                                                
                                                var state = country;                                                
                                                var city = country;

                                                if (country) {
                                                    var rex = /(\w*\s?\w*\s?\w*)-.*-.*/;
                                                    var rexPresent = rex.test(country);
                                                    var rex1 = /(.*)-.*/;
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
                                                    } else {
                                                        job.JOB_LOCATION_COUNTRY = country;
                                                    }
                                                    rex.lastIndex = 0;
                                                    rex1.lastIndex = 0;
                                                    rex2.lastIndex = 0;                                                   
                                                     
                                                }

                                                if (state) {
                                                    var stateRex = /.*-(.*)-.*/;
                                                    var stateRexPresent = stateRex.test(state);
                                                    var stateRex1 = /.*-(.*)/;
                                                    var stateRex1Present = stateRex1.test(state);
                                                    var stateRex2 = /.*:\s(.*)/;
                                                    var stateRex2Present = stateRex2.test(state);

                                                    if (stateRexPresent) {
                                                        var stateData1 = stateRex.exec(state);
                                                        job.JOB_LOCATION_STATE = stateData1[1];
                                                    } else if (stateRex1Present) {
                                                        var stateData2 = stateRex1.exec(state);
                                                        job.JOB_LOCATION_STATE = stateData2[1];
                                                    } else if (stateRex2Present) {
                                                        var stateData3 = stateRex2.exec(state);
                                                        job.JOB_LOCATION_STATE = stateData3[1];
                                                    } else {
                                                        job.JOB_LOCATION_STATE = state;
                                                    }
                                                    stateRex1.lastIndex = 0;
                                                    stateRex.lastIndex = 0;
                                                    stateRex2.lastIndex = 0;

                                                }

                                                if (city) {
                                                    var cityRex = /.*-.*-(.*)/;
                                                    var cityRexPresent = cityRex.test(city);
                                                    var cityRex1 = /.*-(.*)/;
                                                    var cityRex1Present = cityRex1.test(city);

                                                    if (cityRexPresent) {
                                                        var cityData1 = cityRex.exec(city);
                                                        job.JOB_LOCATION_CITY = cityData1[1];
                                                    } else if (cityRex1Present) {
                                                        var cityData2 = cityRex1.exec(city);
                                                        job.JOB_LOCATION_CITY = cityData2[1];
                                                    } else {
                                                        job.JOB_LOCATION_CITY = city;
                                                    }
                                                    cityRex.lastIndex = 0;
                                                    cityRex1.lastIndex = 0;                                                   

                                                }
                                                                                                                                                
                                                if (desc) {
                                                    job.TEXT = HtmlEscape(desc);
                                                }
                                                jobMaker.successful.add(job, botScheduleID);
                                            }                                            
                                            counter++;
                                            run = "completed";

                                        } catch (ex) {
                                            if (run == "default") {
                                                run = "retry 1";
                                            }
                                            else if (run == "retry 1") {
                                                run = "retry 2";
                                            }
                                            else {
                                                run = "completed";
                                                jobMaker.failed.add(job.JDTID_UNIQUE_NUMBER, ex.message);
                                                counter++;
                                            }
                                        }
                                    }

                                } catch (e) {
                                    service.bot.setProgress(botScheduleID, log.logType.activity, "Failed Job ");
                                    jobMaker.failed.add(job.JDTID_UNIQUE_NUMBER, e.message);
                                    counter++;
                                }
                            }
                        } while (isPresent);

                        try {
                            var nextContainer = await driver.findElements(By.xpath("//span[@class='pagerlinkoff']/a[@class='navigation-link-disabled' and @id='next']"));
                            var next = nextContainer.length;
                            if (!(next == 1)) {
                                var nextLink = await driver.findElement(By.xpath("//span[@class='pagerlink']/a[@id='next']"));
                                await nextLink.click();
                                await driver.sleep(5000);
                                loop = true;
                                pagenumber++;
                            }
                        } catch (e) {
                            var a = e.message;
                        }
                    } while (loop);

                    await driver.findElement(By.xpath("//div[@id='JOB_TYPE-content']/div[" + typeCounter + "]/a/label")).click();
                    await driver.sleep(4000);
                    typeCounter++;
                } catch (e) {
                    service.bot.setProgress(botScheduleID, log.logType.activity, "Pagination Issue");
                    await driver.findElement(By.xpath("//div[@id='JOB_TYPE-content']/div[" + typeCounter + "]/a/label")).click();
                    await driver.sleep(4000);
                    typeCounter++;
                }
            }



        } while(isJobTypePresent)        
                
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
    description = description.replace(/&nbsp;/g, '');
    description = description.replace(/\s\s+/g, ' ');
    description = description.replace(/\r?\n|\r/g, '');
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

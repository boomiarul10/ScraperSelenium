﻿var Promise = require('promise');
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

        await driver.get('https://career8.successfactors.com/career?company=OwensCorning&career_ns=job_listing_summary&navBarLevel=JOB_SEARCH');
        var loop;
        var atsJobCount = await driver.wait(until.elementLocated(By.xpath("//table[@class='searchFiltersLeftSection']//td[@class='jobSearchResults']//td[@class='resultsHeaderCounter']/div/span[@class='jobCount']")), 2000);
        var atscount = await atsJobCount.getText();
        var record = atscount.split("Jobs");
        jobMaker.setatsJobCount(parseInt(record[0].trim()));

        var perPageElement = await driver.findElement(By.xpath("//li[@class='per_page']//select/option[5]"));
        await perPageElement.click();
        await driver.sleep(3000);

        do {
            loop = false;
            var counter = 1;
            do {
                var jobContainer = await driver.findElements(By.xpath("//table[@class='searchFiltersLeftSection']//td[@class='jobSearchResults']//tr[@class='jobResultItem'][" + counter + "]//div[1]/a"));
                var isPresent = await jobContainer.length;
                if (isPresent) {
                    try {
                        var job = jobMaker.create();

                        job.COMPANY_URL = "https://career8.successfactors.com/careers?company=OwensCorning";
                        job.JOB_CONTACT_COMPANY = "Owens Corning";

                        var titleElement = await driver.findElement(By.xpath("//table[@class='searchFiltersLeftSection']//td[@class='jobSearchResults']//tr[@class='jobResultItem'][" + counter + "]//div[1]/a"));
                        job.JOB_TITLE = await titleElement.getText();
                        var idElement = await driver.findElement(By.xpath("//table[@class='searchFiltersLeftSection']//td[@class='jobSearchResults']//tr[@class='jobResultItem'][" + counter + "]//div[@class='noteSection']/div[1]/span[1]"));
                        job.JDTID_UNIQUE_NUMBER = await idElement.getText();
                        var dateElement = await driver.findElement(By.xpath("//table[@class='searchFiltersLeftSection']//td[@class='jobSearchResults']//tr[@class='jobResultItem'][" + counter + "]//div[@class='noteSection']/div[1]/span[2]"));
                        job.ASSIGNMENT_START_DATE = await dateElement.getText();

                        var typeElement = await driver.findElement(By.xpath("//table[@class='searchFiltersLeftSection']//td[@class='jobSearchResults']//tr[@class='jobResultItem'][" + counter + "]//div[@class='noteSection']/div[2]/span[2]"));
                        job.JOB_TYPE = await typeElement.getText();
                        if (job.JOB_TYPE.toLowerCase() == "hourly") {
                            job.JOB_CATEGORY = "Hourly Manufacturing";
                        } else {
                            var categoryElement = await driver.findElement(By.xpath("//table[@class='searchFiltersLeftSection']//td[@class='jobSearchResults']//tr[@class='jobResultItem'][" + counter + "]//div[@class='noteSection']/div[1]/span[3]"));
                            job.JOB_CATEGORY = await categoryElement.getText();
                        }


                        //
                        var cityElement = await driver.findElement(By.xpath("//table[@class='searchFiltersLeftSection']//td[@class='jobSearchResults']//tr[@class='jobResultItem'][" + counter + "]//div[@class='noteSection']/div[2]/span[2]"));
                        job.JOB_LOCATION_CITY = await cityElement.getText();
                        var stateElement = await driver.findElement(By.xpath("//table[@class='searchFiltersLeftSection']//td[@class='jobSearchResults']//tr[@class='jobResultItem'][" + counter + "]//div[@class='noteSection']/div[2]/span[1]"));
                        job.JOB_LOCATION_STATE = await stateElement.getText();

                        var url = undefined;
                        url = await titleElement.getAttribute("href");
                        job.JOB_APPLY_URL = "https://career8.successfactors.com/careers?company=OwensCorning&career_job_req_id=" + job.JDTID_UNIQUE_NUMBER + "&career_ns=job_listing&navBarLevel=JOB_SEARCH";

                        await driverjobdetails.get(url);

                        var countryElementData = await driverjobdetails.findElements(By.xpath('//*[@id="jobAppPageTitle"]/div[1]/div/b[6]'));
                        var isCountryPresent = await countryElementData.length;
                        if (isCountryPresent) {
                            var countryElement = await driverjobdetails.findElement(By.xpath('//*[@id="jobAppPageTitle"]/div[1]/div/b[6]'));
                            job.JOB_LOCATION_COUNTRY = await countryElement.getText();

                            if (job.JOB_LOCATION_COUNTRY) {
                                job.JOB_LOCATION_COUNTRY = job.JOB_LOCATION_COUNTRY.trim();
                                if (job.JOB_LOCATION_COUNTRY == "United States" || job.JOB_LOCATION_COUNTRY == "Canada"|| job.JOB_LOCATION_COUNTRY == "Mexico") {

                                    var JobDescription = await driverjobdetails.wait(until.elementLocated(By.xpath("//div[@class='content']/div[@class='joqReqDescription']")), 2000);
                                    var desc = await JobDescription.getAttribute("outerHTML");
                                    desc = desc.replace(/<table/g, "<font");
                                    desc = desc.replace(/<\/table/g, "<\font");
                                    desc = desc.replace(/<thead/g, "<font");
                                    desc = desc.replace(/<\/thead/g, "<\font");
                                    desc = desc.replace(/<tbody/g, "<font");
                                    desc = desc.replace(/<\/tbody/g, "<\font");
                                    desc = desc.replace(/<\/span><\/li>/g, "</span><span></span></li>");
                                    desc = desc.replace(/<o:p><\/o:p> <\/o:p>/g, " </o:p>");
                                    desc = desc.replace(/<o:p><\/o:p><\/o:p>/g, "</o:p>");

                                    if (desc) {
                                        job.TEXT = HtmlEscape(desc);
                                    }

                                    var cityElement = await driverjobdetails.findElement(By.xpath('//*[@id="jobAppPageTitle"]/div[1]/div/b[4]'));
                                    job.JOB_LOCATION_CITY = await cityElement.getText();
                                    if (job.JOB_LOCATION_CITY) {

                                        job.JOB_LOCATION_CITY = job.JOB_LOCATION_CITY.trim();

                                        var cityRex = /(\w+).*/;
                                        var cityRexPresent = cityRex.test(job.JOB_LOCATION_CITY);

                                        if (cityRexPresent) {
                                            var cityData1 = cityRex.exec(job.JOB_LOCATION_CITY);
                                            job.JOB_LOCATION_CITY = cityData1[1];
                                        } else {
                                            job.JOB_LOCATION_CITY = job.JOB_LOCATION_CITY;
                                        }
                                        cityRex.lastIndex = 0;                                        
                                    }

                                    var cityElementRaw = await driverjobdetails.findElement(By.xpath('//*[@id="jobAppPageTitle"]/div[1]/div/b[4]'));
                                    var cityRaw = await cityElementRaw.getText();
                                    if (cityRaw) {
                                        if (cityRaw.toLowerCase().includes("north carolina")) {
                                            job.JOB_LOCATION_CITY = "North Carolina";
                                        } else if (cityRaw.toLowerCase().includes("fort smith")) {
                                            job.JOB_LOCATION_CITY = "Fort Smith";
                                        } else if (cityRaw.toLowerCase().includes("oem columbus")) {
                                            job.JOB_LOCATION_CITY = "OEM Columbus";
                                        }
                                    }

                                    var city2 = undefined;
                                    var cityElement2Container = await driverjobdetails.findElements(By.xpath("//div[@class='joqReqDescription']/p[1]"));
                                    var cityElem2Data = cityElement2Container.length;
                                    if (cityElem2Data) {
                                        var cityElement2 = await driverjobdetails.findElement(By.xpath("//div[@class='joqReqDescription']/p[1]"));
                                        city2 = await cityElement2.getText();

                                        if (city2) {
                                            city2 = city2.replace(/.* I Granville.*/g, "Granville");

                                            var city2Rex = /Location: (.*),.*-.*/;
                                            var city2RexPresent = city2Rex.test(city2);

                                            if (city2RexPresent) {
                                                var cityData2 = city2Rex.exec(city2);
                                                city2 = cityData2[1];
                                                var city3Rex = /(.*),.*/;
                                                var city3RexPresent = city3Rex.test(city2);
                                                if (city3RexPresent) {
                                                    var cityData3 = city3Rex.exec(city2);
                                                    city2 = cityData3[1];
                                                }

                                                if (city2 != "") {
                                                    job.JOB_LOCATION_CITY = city2;
                                                }
                                            } 

                                            city2Rex.lastIndex = 0;

                                            
                                        }
                                    }

                                    var stateElement = await driverjobdetails.findElement(By.xpath('//*[@id="jobAppPageTitle"]/div[1]/div/b[5]'));
                                    job.JOB_LOCATION_STATE = await stateElement.getText();
                                    if (job.JOB_LOCATION_STATE) {
                                        job.JOB_LOCATION_STATE = job.JOB_LOCATION_STATE.trim();
                                    }


                                    var contactCountryElement = await driverjobdetails.findElement(By.xpath('//*[@id="jobAppPageTitle"]/div[1]/div/b[6]'));
                                    job.JOB_CONTACT_COUNTRY = await contactCountryElement.getText();
                                    if (job.JOB_CONTACT_COUNTRY) {
                                        job.JOB_CONTACT_COUNTRY = job.JOB_CONTACT_COUNTRY.trim();
                                    }


                                    jobMaker.successful.add(job, botScheduleID);
                                }
                            }                           
                        }                        
                        counter++;
                    } catch (e) {
                    }
                }
            } while (isPresent);

            try {
                var nextContainer = await driver.findElements(By.xpath(".//table[@class='searchFiltersLeftSection']//td[@class='jobSearchResults']//td[@class='resultsHeaderPaginator']//li[contains(@id, 'next')]/a[@title='Next Page']"));
                var next = nextContainer.length;
                if (next) {
                    var nextLink = await driver.findElement(By.xpath("//table[@class='searchFiltersLeftSection']//td[@class='jobSearchResults']//td[@class='resultsHeaderPaginator']//li[contains(@id, 'next')]/a[@title='Next Page']"));
                    await nextLink.click();

                    var jobElement = await driver.wait(until.elementLocated(By.xpath(".//table[@class='searchFiltersLeftSection']//td[@class='jobSearchResults']//tr[@class='jobResultItem']")), 2000);
                    var isTitle = await jobElement.getText();
                    if (isTitle) {
                        loop = true;
                    }
                }
            } catch (e) {

            }
        } while (loop);
        driver.quit();
        driverjobdetails.quit();
        snippet(configuration, jobMaker.atsJobCount, jobMaker.failedJobs.length, jobMaker, onsuccess, onfailure);
    } catch (e) {
        driver.quit();
        driverjobdetails.quit();
        var output = package.service.bot.createBotErrorOutput(configuration.scheduleid, jobMaker.jobs.length, jobMaker.atsJobCount, jobMaker.failedJobs.length, err);
        onfailure(output);
    }
}

function HtmlEscape(description) {
    description = he.encode(description, { 'useNamedReferences': true, 'decimal': true, 'allowUnsafeSymbols': true });
    description = description.replace(/&#9;/g, ' ');
    description = description.replace(/&nbsp;/g, ' ');
    description = description.replace(/\s\s+/g, ' ');
    description = description.replace(/\r?\n|\r/g, '');
    description = description.replace(/&mldr+/g, '&hellip');
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
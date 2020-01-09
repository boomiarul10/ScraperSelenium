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

        await driver.get('https://chj.tbe.taleo.net/dispatcher/servlet/DispatcherServlet?org=TRM&act=redirectCws&cws=43');
        var loop;
        var atsJobCount = await driver.wait(until.elementLocated(By.xpath("//table[@role='presentation']/tbody//tr[td[contains(.,'open job(s)')]]")), 4000);
        var atscount = await atsJobCount.getText();
        var record = atscount.split("total of");
        jobMaker.setatsJobCount(parseInt(record[1].split("open job(s)").shift().trim()));

        var categoryElement = await driver.findElement(By.xpath("//select[@name='location']"));
        var optionArray = await categoryElement.findElements(By.tagName('option'));

        for (var i = 2; i <= optionArray.length; i++) {
            await driver.findElement(By.xpath("//select[@name='location']/Option[1]")).click();
            var option = await driver.findElement(By.xpath("//select[@name='location']/Option[" + i + "]"));
            var category = await option.getAttribute('text');
            await option.click();
            var submitElement = await driver.findElement(By.xpath("//input[@name='tbe_cws_submit']"));
            await submitElement.click();

            var pagenumber = 1;
            do {
                loop = false;
                var counter = 2;
                do {
                    var jobContainer = await driver.findElements(By.xpath("//table[@id='cws-search-results']//tr[" + counter + "]"));
                    var isPresent = await jobContainer.length;
                    if (isPresent) {
                        try {
                            var job = jobMaker.create();

                            var titleElement = await driver.findElement(By.xpath("//table[@id='cws-search-results']//tr[" + counter + "]/td[1]//a"));
                            job.JOB_TITLE = await titleElement.getText();

                            var url = await titleElement.getAttribute("href");

                            await driverjobdetails.get(url);

                            var categoryElement = await driverjobdetails.findElement(By.xpath("//table[@role='presentation']//tr[td[contains(text(), 'TMP Category:')]]/td[2]/b"));
                            job.JOB_CATEGORY = await categoryElement.getText();

                            job.JOB_LOCATION_COUNTRY = "US";

                            var cityElement = await driverjobdetails.findElement(By.xpath("//table[@role='presentation']//tr[td[contains(text(), 'Location:')]]/td[2]/b"));
                            var city = await cityElement.getText();

                            if (city) {
                                var cityRex = /(.*),.*/;
                                var cityRexPresent = cityRex.test(city);

                                if (cityRexPresent) {
                                    var cityData1 = cityRex.exec(city);
                                    job.JOB_LOCATION_CITY = cityData1[1].trim();
                                } else {
                                    job.JOB_LOCATION_CITY = city.trim();
                                }
                                cityRex.lastIndex = 0;

                            }

                            if (city) {
                                var stateRex = /.*,(.*)/;
                                var stateRexPresent = stateRex.test(city);

                                if (stateRexPresent) {
                                    var stateData1 = stateRex.exec(city);
                                    job.JOB_LOCATION_STATE = stateData1[1].trim();
                                } else {
                                    job.JOB_LOCATION_STATE = city.trim();
                                }
                                stateRex.lastIndex = 0;

                            }

                            var url = await driverjobdetails.findElement(By.xpath("//form[@name='apply']"));
                            job.JOB_APPLY_URL = await url.getAttribute("action");

                            if (job.JOB_APPLY_URL) {
                                if (job.JOB_APPLY_URL.includes("rid=")) {
                                    job.JDTID_UNIQUE_NUMBER = job.JOB_APPLY_URL.split("rid=")[1];
                                }
                            }

                            if (job.JOB_LOCATION_STATE) {
                                job.JOB_LOCATION_COUNTRY = job.JOB_LOCATION_STATE == "Italy" ? "Italy" : job.JOB_LOCATION_COUNTRY;
                                job.JOB_LOCATION_STATE = (job.JOB_LOCATION_STATE == "United States" || job.JOB_LOCATION_STATE == "Italy") ? "" : job.JOB_LOCATION_STATE;
                            }

                            if (job.JOB_LOCATION_CITY) {
                                job.JOB_LOCATION_CITY = job.JOB_LOCATION_CITY == "United States" ? "" : job.JOB_LOCATION_CITY;
                            }

                            var locCounter = 1;
                            var newLocation = "";

                            do {
                                var locationsElement = await driverjobdetails.findElements(By.xpath("//table[@role='presentation']//tr[td/b[text()]][" + locCounter + "]"));
                                var locations = await locationsElement.length;
                                if (locations) {
                                    var titleElemData = await driverjobdetails.findElements(By.xpath("//table[@role='presentation']//tr[td/b[text()]][" + locCounter + "]/td[contains(text(), 'Title')]"));
                                    var titleElemPresnt = await titleElemData.length;

                                    if (!titleElemPresnt) {

                                        var locationElem = await driverjobdetails.findElement(By.xpath("//table[@role='presentation']//tr[td/b[text()]][" + locCounter + "]//b"));
                                        var location = await locationElem.getText();

                                        if (location) {
                                            location = location.trim();
                                        }

                                        if (location != "") {
                                            if (newLocation == "") {
                                                newLocation = location;
                                            } else {
                                                newLocation = newLocation + ";" + location;
                                            }
                                        }
                                    } else {
                                        locations = 0;
                                    }
                                }
                                locCounter++;

                            } while (locations)

                            if (newLocation) {
                                job.TRAVEL = ";" + newLocation + ";";
                            }

                            job.JOB_TYPE = "Experienced";

                            var JobDescription = await driverjobdetails.findElement(By.xpath("//table[@role='presentation']/tbody"));
                            var descFull = await JobDescription.getAttribute("outerHTML");
                            var JobDescriptionFirst = await driverjobdetails.findElement(By.xpath("//table[@role='presentation']/tbody//tr[td/h1[text()='Description']]"));
                            var desc1 = await JobDescriptionFirst.getAttribute("outerHTML");
                            var JobDescriptionSecond = await driverjobdetails.findElement(By.xpath("//table[@role='presentation']/tbody//tr[td/a[text()='Back to Search Results']]"));
                            var desc2 = await JobDescriptionSecond.getAttribute("outerHTML");
                            var description = desc1 + descFull.split(desc1)[1];
                            job.TEXT = description.split(desc2)[0];

                            if (job.TEXT) {
                                job.TEXT = HtmlEscape(job.TEXT);
                            }

                            if (job.JOB_APPLY_URL) {
                                job.JOB_APPLY_URL = job.JOB_APPLY_URL.replace("apply", "requisition");
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

                    var frstCountData = await driver.findElement(By.xpath("//table[@role='presentation']/tbody//tr//td[contains(.,'of')]/b[1]"));
                    var frstCount = await frstCountData.getText();
                    var scndCountData = await driver.findElement(By.xpath("//table[@role='presentation']/tbody//tr//td[contains(.,'of')]/b[2]"));
                    var scndCount = await scndCountData.getText();
                    if (frstCount) {
                        frstCount = frstCount.split("-")[1].trim();
                        if (scndCount) {
                            scndCount = scndCount.trim();
                            if (frstCount != scndCount) {
                                var nextContainer = await driver.findElements(By.xpath("//table[@role='presentation']//input[@title='Next Page']"));
                                var next = nextContainer.length;
                                if (next) {
                                    var nextLink = await driver.findElement(By.xpath("//table[@role='presentation']//input[@title='Next Page'][1]"));
                                    await nextLink.click();
                                    loop = true;
                                    pagenumber++;
                                }
                            }
                        }
                    }
                } catch (e) {

                }
            } while (loop);

            await driver.findElement(By.xpath("//a[@title='New Search']")).click();
        }

        driver.quit();
        driverjobdetails.quit();
        await snippet(configuration, jobMaker.atsJobCount, jobMaker.failedJobs.length, jobMaker, onsuccess, onfailure);
    } catch (e) {
        driver.quit();
        driverjobdetails.quit();
        var output = package.service.bot.createBotErrorOutput(configuration.scheduleid, jobMaker.jobs.length, jobMaker.atsJobCount, jobMaker.failedJobs.length, e);
        onfailure(output);
    }
}

function HtmlEscape(description) {
    description = he.encode(description, { 'useNamedReferences': true, 'decimal': true, 'allowUnsafeSymbols': true });
    description = description.replace(/&#9;/g, ' ');
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

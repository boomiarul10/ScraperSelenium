var Promise = require('promise');
var package = global.createPackage();
var he = require('he');
var service = package.service;
var resource = package.resource;
var log = resource.constants.log;
var selenium = package.scrape.selenium();
var jobMaker = package.resource.download.variable("job");
jobMaker.setAlertCount(3);
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

        await driver.get('http://www.resumeware.net/petsmart_rw/petsmart_web/jobs.cfm?page=careerslist');
        var loop;
        var atsJobCount = await driver.findElement(By.xpath('//*[@id="main"]/table[1]/tbody/tr[1]/td/b[1]'));
        var atscount = await atsJobCount.getText();
        jobMaker.setatsJobCount(parseInt(atscount));
        await driver.findElement(By.xpath('//*[@class="prodName2"]/a[contains(text(),"view all")]')).click();
        var counter = 3;
        var checkElement = await driver.findElements(By.xpath('//*[@id="main"]/table[1]/tbody/tr'));
        var testValue = await checkElement.length;
        var jobCount = testValue - 1;
        do {
            var jobContainer = await driver.findElements(By.xpath('//*[@id="main"]/table[1]/tbody/tr[' + counter + ']'));
            var isPresent = await jobContainer.length;
            if (counter <= jobCount) {
                if (isPresent) {
                    try {
                        var job = jobMaker.create();

                        var titleElement = await driver.findElement(By.xpath('//*[@id="main"]/table[1]/tbody/tr[' + counter + ']/td[1]/a/b'));
                        job.JOB_TITLE = await titleElement.getText();
                        job.JOB_CONTACT_COMPANY = "PetSmart";
                        var locationElement = await driver.findElement(By.xpath('//*[@id="main"]/table[1]/tbody/tr[' + counter + ']/td[2]'));
                        var location = await locationElement.getText();
                        var categoryElement = await driver.findElement(By.xpath('//*[@id="main"]/table[1]/tbody/tr[' + counter + ']/td[3]'));
                        job.JOB_CATEGORY = await categoryElement.getText();

                        if (location) {
                            var loc = location.split("-");
                            if (loc.length >= 2) {
                                job.JOB_LOCATION_COUNTRY = loc[0];
                            }
                        }

                        var urlElement = await driver.findElement(By.xpath('//*[@id="main"]/table[1]/tbody/tr[' + counter + ']/td[1]/a'));
                        var id = await urlElement.getAttribute("href");
                        job.JOB_APPLY_URL = id;
                        await driverjobdetails.get(id);

                        var jobdetailspage = await driverjobdetails.findElements(By.xpath("//*[@id='main']/table[1]/tbody/tr[7]"));
                        var isDetailPage = await jobdetailspage.length;
                        if (isDetailPage) {
                            var locationValueElement = await driverjobdetails.findElement(By.xpath('//*[@id="main"]/table[1]/tbody/tr[3]/td[2]'));
                            var locationValue = await locationValueElement.getText();
                            var loc = locationValue.split("-");
                            job.JOB_LOCATION_STATE = loc[0];
                            job.JOB_LOCATION_CITY = loc[1];
                            job.JOB_INDUSTRY = "Corporate";

                            var locValue = job.JOB_LOCATION_CITY + "," + job.JOB_LOCATION_STATE;
                            job.JOB_CONTACT_ADDRESS = AddressSearch(locValue.trim());
                            var idElement = await driverjobdetails.findElement(By.xpath('//*[@id="main"]/table[1]/tbody/tr[4]/td[2]'));
                            job.JDTID_UNIQUE_NUMBER = await idElement.getText();

                            var element = await driverjobdetails.findElement(By.xpath('//*[@id="main"]//td/a[contains(text(),"Submit Resume")]'));
                            var requiredDetails = await element.getAttribute("outerHTML");
                            var requiredDetail = requiredDetails.replace("Experience/Education", "<b>Experience/Education:</b> <br><br>");
                            var desc;

                            var detailspage = await driverjobdetails.findElements(By.xpath("//*[@id='reqDetails']/tbody/tr/td[2]"));
                            var isDesc = await detailspage.length;
                            if (isDesc) {
                                var JobDescription = await driverjobdetails.findElement(By.xpath("//*[@id='reqDetails']/tbody/tr/td[2]"));
                                desc = await JobDescription.getAttribute("innerHTML");
                            }
                            else {
                                var JobDescription = await driverjobdetails.findElement(By.xpath("//*[@id='main']/table[1]/tbody/tr[7]/td[2]"));
                                desc = await JobDescription.getAttribute("innerHTML");
                            }
                            if (desc) {
                                var jobDesc = "Job Responsibilities<br>" + desc + "<br>";
                                var description = jobDesc + requiredDetail;
                                job.TEXT = HtmlEscape(description);
                                jobMaker.successful.add(job, botScheduleID);
                            }
                        }
                    } catch (e) {
                        jobMaker.failed.add(job.JDTID_UNIQUE_NUMBER, e.message);
                        counter++;
                    }
                }
            }
            counter++;
        } while (isPresent);

        driver.quit();
        driverjobdetails.quit();
        snippet(configuration, jobMaker.atsJobCount, jobMaker.failedJobs.length, jobMaker, onsuccess, onfailure);
    } catch (e) {
        driver.quit();
        driverjobdetails.quit();
        var output = package.service.bot.createBotErrorOutput(configuration.scheduleid, jobMaker.jobs.length, jobMaker.atsJobCount, jobMaker.failedJobs.length, e);
        onfailure(output);
    }
}

function AddressSearch(locValue) {
    var address;
    switch (locValue) {
        case "Burlington,ON":
            address = "4475 North Service Rd Burlington ON L7L4X7";
            break;
        case "Groveport,OH":
            address = "6499 Adeladie Court Groveport, OH 43125";
            break;
        case "Ennis,TX":
            address = "2880 S. Oak Grove Road Ennis Tx 75119";
            break;
        case "Gahanna,OH":
            address = "1015 Taylor road Gahanna OH 43230";
            break;
        case "Hagerstown,MD":
            address = "16522 S. Huntersgreen Parkway Hagerstown MD 21740";
            break;
        case "Bethel,PA":
            address = "21 Martha Drive Bethel PA 19507";
            break;
        case "Ottawa,IL":
            address = "910 East Stevenson Road Ottawa IL 61350";
            break;
        case "Newnan,GA":
            address = "570 International Park Newnan GA 30265";
            break;
        case "MaCarran,NV":
            address = "1200 Venice Drive MaCarran NV 89434";
            break;
        default:
            address = "Address not available"
            break;
    }
    return address;
}

function HtmlEscape(description) {
    description = he.encode(description, { 'useNamedReferences': true, 'decimal': true, 'allowUnsafeSymbols': true });
    description = description.replace(/&#9;/g, ' ');
    description = description.replace(/&nbsp;/g, '');
    description = description.replace(/\s\s+/g, ' ');
    description = description.replace(/\r?\n|\r/g, '');
    return description;
}

var snippet = async (configuration, atsJobCount, failedJobCount, jobs, onsuccess, onfailure) => {
    var values = await service.bot.setProgress(botScheduleID, log.logType.activity, log.activity.snippet.download + "feedgenerator");
    var snippet = package.resource.download.snippet("feedgenerator");
    var input = snippet.createInput(configuration, jobs);
    try {
        var jobcount = await snippet.execute(input);
        var output = package.service.bot.createBotOutput(configuration.scheduleid, jobcount, jobMaker.atsJobCount, jobMaker.failedJobs.length);
        onsuccess(output);
    }
    catch (e) {
        var output = package.service.bot.createBotErrorOutput(configuration.scheduleid, jobMaker.jobs.length, jobMaker.atsJobCount, jobMaker.failedJobs.length, e);
        onfailure(output);
    }
}
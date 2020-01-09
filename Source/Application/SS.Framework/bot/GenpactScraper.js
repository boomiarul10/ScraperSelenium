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

        await driver.get('https://genpact.taleo.net/careersection/sgy_external_career_section/moresearch.ftl?lang=en&portal=44100025334');

        var jobCountElement = await driver.findElement(By.xpath('//*[@class="subtitle"][contains(text(),"Search Results")]'));
        var atsCount = await jobCountElement.getText();
        var jobCount = atsCount.split("(");
        var atsJobCount = jobCount[1].split("jobs");
        jobMaker.setatsJobCount(parseInt(atsJobCount[0].trim()));

        var loop;
        do {
            loop = false;
            var counter = 1;
            do {
                var jobContainer = await driver.findElements(By.xpath('//*[@id="requisitionListInterface.listRequisition"]/tbody/tr[' + counter + ']//span[@class="titlelink"]/a'));
                var isPresent = await jobContainer.length;
                if (isPresent) {
                    try {
                        var job = jobMaker.create();
                        var titleElement = await driver.findElement(By.xpath('//*[@id="requisitionListInterface.listRequisition"]/tbody/tr[' + counter + ']//span[@class="titlelink"]/a'));
                        job.JOB_TITLE = await titleElement.getText();

                        var jobIdElement = await driver.findElement(By.xpath('//*[@id="requisitionListInterface.listRequisition"]/tbody/tr[' + counter + ']//span[contains(@id,"requisitionListInterface.reqContestNumberValue.row")]'));
                        var id = await jobIdElement.getText();
                        job.JDTID_UNIQUE_NUMBER = id.replace("Requisition ID:", "").trim();
                        var jobDetailURL = "https://genpact.taleo.net/careersection/sgy_external_career_section/jobdetail.ftl?job=" + job.JDTID_UNIQUE_NUMBER;
                        await driverjobdetails.get(jobDetailURL);
                        var jobdetailsreqpage = await driverjobdetails.findElements(By.xpath('//*[@id="requisitionDescriptionInterface.ID1540.row1"]'));
                        var isreqPage = await jobdetailsreqpage.length;
                        if (isreqPage) {
                            var categoryElement = await driverjobdetails.findElement(By.xpath('//*[@id="requisitionDescriptionInterface.ID1607.row1"]'));
                            job.JOB_CATEGORY = await categoryElement.getText();
                            job.JOB_APPLY_URL = "https://genpact.taleo.net/careersection/sgy_external_career_section/jobapply.ftl?job=" + job.JDTID_UNIQUE_NUMBER
                            var locationElement = await driverjobdetails.findElement(By.xpath('//*[@id="requisitionDescriptionInterface.ID1651.row1"]'));
                            var location = await locationElement.getText();

                            var descriptionElement = await driverjobdetails.findElement(By.xpath('//*[@id="requisitionDescriptionInterface.ID3431.row.row1"]/td[1]/div'));
                            var desc = await descriptionElement.getAttribute("outerHTML");

                            var descriptionRemovedTag;
                            var optionsTag = {
                                'add-remove-tags': ['h2', 'span']
                            };

                            cleanHtml.clean(desc, optionsTag, function (html) {
                                descriptionRemovedTag = html;
                            });

                            if (location != null) {
                                var loc = location.split("-");
                                if (loc.length == 2) {
                                    job.JOB_LOCATION_CITY = loc[1];
                                    job.JOB_LOCATION_COUNTRY = CustomCountry(loc[0]);
                                }
                                else if (loc.length == 3) {
                                    job.JOB_LOCATION_COUNTRY = CustomCountry(loc[0]);
                                    job.JOB_LOCATION_CITY = loc[2];
                                }
                                else {
                                    job.JOB_LOCATION_COUNTRY = CustomCountry(loc[0]);
                                }
                            }

                            job.TEXT = HtmlEscape(descriptionRemovedTag);
                            jobMaker.successful.add(job, botScheduleID);
                        }
                        counter = counter + 2;
                    } catch (e) {
                        jobMaker.failed.add(job.JDTID_UNIQUE_NUMBER, e.message);
                        counter = counter + 2;
                    }
                }
            } while (isPresent);
            try {
                var e = await driver.findElements(By.xpath('//*[@id="requisitionListInterface.pagerDivID4513.panel.Next"]/span[@class="pagerlink"]/a'));
                if (e.length == 1) {
                    var nextPage = await driver.findElement(By.xpath('//*[@id="requisitionListInterface.pagerDivID4513.panel.Next"]/span[@class="pagerlink"]/a'));
                    await nextPage.click();
                    loop = true;
                }
            } catch (e) {
                var ex = e.message;
            }
        } while (loop);

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

function CustomCountry(countryValue) {
    return countryValue = countryValue.replace("U.S", "US").replace("U.S.", "US").replace("United States", "US").replace("Americas", "US")
        .replace("United States (USA)", "US").replace("Europe", "EU").replace("Belgium(BLG)", "BE").replace("France(FRC)", "FR")
        .replace("Germany(GER)", "DE").replace("Hungary(HUN)", "HU").replace("India(IND)", "IN").replace("Luxembourg(LUX)", "LU")
        .replace("Morocco(MOR)", "MA").replace("Netherlands(NET)", "NL").replace("Philippines(PHI)", "Philipines").replace("Poland(POL)", "PL")
        .replace("Romania(ROM)", "RO").replace("Spain(SPN)", "ES").replace("Switzerland(SWT)", "CH").replace("China(CHI)", "China");
}

function HtmlEscape(description) {
    description = he.encode(description, { 'useNamedReferences': true, 'decimal': true, 'allowUnsafeSymbols': true });
    description = description.replace(/&#9;/g, ' ');
    description = description.replace(/\s\s+/g, ' ');
    description = description.replace(/\r?\n|\r/g, '');
    description = description.replace(/&#x9;/g, '');
    description = description.replace(/&ensp;+/g, "");
    description = description.replace(/&mldr;+/g, "&hellip;");
    description = description.replace(/&#xfffd;+/g, "");
    description = description.replace(/&nbsp;/g, ' ')
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

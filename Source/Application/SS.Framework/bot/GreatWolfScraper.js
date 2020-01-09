var Promise = require('promise');
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

        await driver.get('https://workforcenow.adp.com/jobs/apply/posting.html?client=GWLNF#');
        await driver.sleep(2000);
        var searchelement =await driver.wait(until.elementLocated(By.xpath('//table//span[@id="RecJobSearch.JobSearchShowAllJobPostings_LABEL"]')),20000);
        await searchelement.click();

        var recordCountElem = await driver.findElement(By.xpath("//*[@id='JobSearchCountMessageDiv']"));
        var recordCount = await recordCountElem.getText();
        if (recordCount) {
            var jobsCount = recordCount.split("jobs").shift().trim();
            jobMaker.setatsJobCount(parseInt(jobsCount));
        }
        
        

        var rowLengthElem = await driver.findElements(By.xpath("//table//div[@id='RecJobSearch_Jobs_content']//div[starts-with(@id, 'RecJobSearch_Jobs_row')]"));
        var rowLength = await rowLengthElem.length;

        for (i = 1; i <= rowLength; i++) {
            var colLengthElem = await driver.findElements(By.xpath("//table//div[@id='RecJobSearch_Jobs_content']//div[starts-with(@id, 'RecJobSearch_Jobs_row')][" + i + "]/div"));
            var colLength = await colLengthElem.length;
            for (j = 1; j <= colLength; j++) {
                
                    var titleElem = await driver.wait(until.elementLocated(By.xpath('//table//div[@id="RecJobSearch_Jobs_content"]//div[starts-with(@id,"RecJobSearch_Jobs_row")][' + i + ']/div[' + j + ']')), 20000);
                    await titleElem.click();
                    var job = jobMaker.create();
                    await driver.sleep(3000);

                    try {
                    var id = await driver.findElement(By.xpath('//*[@id="RecJobDetails_RecJobDetailSection.RequisitionId.Value"]/span'));
                    job.JDTID_UNIQUE_NUMBER = await id.getText();
                    var jobtitle = await driver.wait(until.elementLocated(By.xpath('//div[@id="RecJobDetails_RecJobDetailSection.JobName.node"]/div[2]//span[@id="RecJobDetails_RecJobDetailSection.JobName.Value"]/span')), 30000);
                    job.JOB_TITLE = await jobtitle.getText();
                    var location = await driver.wait(until.elementLocated(By.xpath('//*[@id="RecJobDetails_RecJobDetailSection.Locations.root"]')), 20000);
                    var locationvalue = await location.getText();
                    if (locationvalue) {
                        var loc = locationvalue.split(",");
                        job.JOB_LOCATION_CITY = loc[0];
                        job.JOB_LOCATION_STATE = loc[1];
                    }

                    var jobtype = await driver.findElement(By.xpath('//*[@id="RecJobDetails_RecJobDetailSection.EmploymentType.Value"]/span'));
                    job.JOB_TYPE = await jobtype.getText();
                    var cat = await driver.findElement(By.xpath('//*[@id="RecJobDetails_RecJobDetailSection.JobClass.Value"]/span'));
                    job.JOB_CATEGORY = await cat.getText();
                    var jobdesc = await driver.findElement(By.xpath('//*[@id="RecJobDetails_RecJobDetailSection.Description.node"]'));
                    var description = await jobdesc.getAttribute("innerHTML");
                    job.JOB_APPLY_URL = "https://workforcenow.adp.com/jobs/apply/posting.html?client=GWLNF#";
                    job.TEXT = HtmlEscape(description);
                    jobMaker.successful.add(job);
                } catch (e) {
                    jobMaker.failed.add(job.JDTID_UNIQUE_NUMBER, e.message);
                    counter++;
                }
                var gobackoption = await driver.findElement(By.xpath('//span[@id="RecJobDetails.Back_ICON"]'));
                await driver.sleep(1000);
                await gobackoption.click();
                await driver.sleep(1000);
            }
        }
        await driver.quit();
        snippet(configuration, jobMaker.atsJobCount, jobMaker.failedJobs.length, jobMaker, onsuccess, onfailure);
    } catch (e) {
        await driver.quit();
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
    description = description.replace(/ZeroWidthSpace;/g, '#8203;');
    description = description.replace(/mldr/g, 'hellip;'); 
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
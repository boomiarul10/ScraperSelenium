var Promise = require('promise');
var package = global.createPackage();
var he = require('he');
//var cleanHtml = require('clean-html');
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

        await driver.get('https://sjobs.brassring.com/TGWebHost/home.aspx?partnerid=25539&siteid=5310');
        await driver.sleep(5000);
        var dataa = await driver.getPageSource();
        await driver.findElement(By.xpath('//*[@id="searchControls_BUTTON_2"]/span[1]')).click();
        await driver.sleep(5000);
        //  await driver.findElement(By.xpath("//button[@aria-describedby='ctl00_MainContent_PrimarySearchButtonDesc' and @id='ctl00_MainContent_submit2']")).click();

        var atsJobCount = await driver.wait(until.elementLocated(By.xpath('//*[@id="mainJobListContainer"]/div/div[1]/div[1]/h2')), 4000);
        var atscount = await atsJobCount.getText();
        var record = atscount.split("results");
        jobMaker.setatsJobCount(parseInt(record[0].trim()));
        var nxtcount = 1;
        while (nxtcount == 1) {          
            var nextElement = await driver.findElements(By.xpath('//*[@id="mainJobListContainer"]/div/div[3]/a'));
            var nxtelmtlen = nextElement.length;
            if (nxtelmtlen == 1) {
                await driver.findElement(By.xpath('//*[@id="mainJobListContainer"]/div/div[3]/a')).click();
                await driver.sleep(2000);
            }
            else {
                nxtcount = 0;
            }
        }

        var loop;
        var pagenumber = 1;
       // do {
          //  loop = false;
            var counter = 1;

            do {

                var jobContainer = await driver.findElements(By.xpath("//*[@id='mainJobListContainer']/div/div[2]/ul/li[" + counter + "]"));
                var isPresent = await jobContainer.length;
                if (isPresent) {
                    try {
                        var job = jobMaker.create();
                        var run = "default";

                        while (run != "completed") {

                            var titleElement = await driver.findElement(By.xpath("//*[@id='mainJobListContainer']/div/div[2]/ul/li[" + counter + "]/div//span/a"));
                            job.JOB_TITLE = await titleElement.getText();

                            var contactCompanyElement = await driver.findElement(By.xpath("//*[@id='mainJobListContainer']/div/div[2]/ul/li[" + counter + "]/div/div[2]"));
                            job.JOB_CONTACT_COMPANY = await contactCompanyElement.getText();

                            var cityElement = await driver.findElement(By.xpath("//*[@id='mainJobListContainer']/div/div[2]/ul/li[" + counter + "]/div/div[3]"));
                            job.JOB_LOCATION_CITY = await cityElement.getText();

                            var stateElement = await driver.findElement(By.xpath("//*[@id='mainJobListContainer']/div/div[2]/ul/li[" + counter + "]/div/div[4]"));
                            job.JOB_LOCATION_STATE = await stateElement.getText();


                            var urlID = undefined;
                            var idElement = await driver.findElement(By.xpath("//*[@id='mainJobListContainer']/div/div[2]/ul/li[" + counter + "]/div//span/a"));
                           // job.JDTID_UNIQUE_NUMBER = await idElement.getText();
                            urlID = await idElement.getAttribute("href");
                            var titleurl = urlID;
                            if (urlID) {
                                urlID = urlID.split("&jobid=").pop().split("&").shift();
                                job.JOB_APPLY_URL = "https://sjobs.brassring.com/TGWebHost/jobdetails.aspx?partnerid=25539&siteid=5310&jobid=" + urlID;
                            }


                            await driverjobdetails.get(titleurl);

                            try {

                                var jobdetailspage = await driverjobdetails.findElements(By.xpath("//*[@id='content']/div[1]/div[5]/div[3]/div[2]/div[1]/div/div[5]"));
                                var isDetailPage = await jobdetailspage.length;
                                if (isDetailPage) {

                                    //var jobTypeElementData = await driverjobdetails.findElements(By.xpath("//span[@id='Regular/Temp']"));
                                    //var isJobTypePresent = await jobTypeElementData.length;
                                    //if (isJobTypePresent) {
                                    //    var typeElement = await driverjobdetails.findElement(By.xpath("//span[@id='Regular/Temp']"));
                                    //    job.JOB_TYPE = await typeElement.getText();

                                    var categoryElement = await driverjobdetails.findElement(By.xpath("//*[@id='content']/div[1]/div[5]/div[3]/div[2]/div[1]/div/div[8]/p[2]"));
                                    job.JOB_CATEGORY = await categoryElement.getText();

                                    var jobidElement = await driverjobdetails.findElement(By.xpath("//*[@id='content']/div[1]/div[5]/div[3]/div[2]/div[1]/div/div[7]/p[2]"));
                                    job.JDTID_UNIQUE_NUMBER = await jobidElement.getText();

                                    var timeElement = await driverjobdetails.findElement(By.xpath("//*[@id='content']/div[1]/div[5]/div[3]/div[2]/div[1]/div/div[9]/p[2]"));
                                    job.SALARYTIME = await timeElement.getText();

                                    var travelElement = await driverjobdetails.findElement(By.xpath("//*[@id='content']/div[1]/div[5]/div[3]/div[2]/div[1]/div/div[10]/p[2]"));
                                    var travel = await travelElement.getText();

                                    var clearanceElement = await driverjobdetails.findElement(By.xpath("//*[@id='content']/div[1]/div[5]/div[3]/div[2]/div[1]/div/div[11]/p[2]"));
                                    var clearance = await clearanceElement.getText();

                                    

                                    var jobdescElement = await driverjobdetails.findElement(By.xpath("//*[@id='content']/div[1]/div[5]/div[3]/div[2]/div[1]/div/div[5]"));
                                    var jobdesc = await jobdescElement.getAttribute("outerHTML");

                                    var desc1 = "<b>Travel Percentage Required</b> " + travel + "<br>";
                                    var desc2 = "<b>Clearance Required?</b> " + clearance + "<br>";

                                    //var descElement2 = await driverjobdetails.findElement(By.xpath("//table[@id='tblJobDetail']//tr[11]"));
                                    //var desc2 = await descElement2.getAttribute("outerHTML");

                                    //var descElement3 = await driverjobdetails.findElement(By.xpath("//table[@id='tblJobDetail']//tr[12]"));
                                    //var desc3 = await descElement3.getAttribute("outerHTML");

                                    //var descElement4 = await driverjobdetails.findElement(By.xpath("//table[@id='tblJobDetail']//tr[13]"));
                                    //var desc4 = await descElement4.getAttribute("outerHTML");
                                    var jobqualElement = await driverjobdetails.findElements(By.xpath("//*[@id='content']/div[1]/div[5]/div[3]/div[2]/div[1]/div/div[6]"));
                                    var quallen = await jobqualElement.length;
                                    if (quallen) {
                                        var qualElem = await driverjobdetails.findElement(By.xpath("//*[@id='content']/div[1]/div[5]/div[3]/div[2]/div[1]/div/div[6]"));
                                        var qualifications = await qualElem.getAttribute("outerHTML");
                                    }

                                    var desc = jobdesc + qualifications + desc1 + desc2;
                                    desc = desc.replace(/<\/tr>/g, '</tr><br>');

                                    if (desc) {
                                        job.TEXT = HtmlEscape(desc);
                                    }
                                
                                    desc = undefined;
                                  
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
                        jobMaker.failed.add(job.JDTID_UNIQUE_NUMBER, e.message);
                        counter++;
                    }
                }
            } while (isPresent);

            //try {
            //    var nextContainer = await driver.findElements(By.xpath('//a[@id="yui-pg0-0-next-link"]'));
            //    var next = nextContainer.length;
            //    if (next == 1) {
            //        var nextLink = await driver.findElement(By.xpath('//a[@id="yui-pg0-0-next-link"]'));
            //        await nextLink.click();
            //        await driver.sleep(5000);
            //        loop = true;
            //        pagenumber++;
            //    }
            //} catch (e) {
            //    var a = e.message;
            //}
       //   } while (loop);

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

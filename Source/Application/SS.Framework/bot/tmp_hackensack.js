var Promise = require('promise');
var package = global.createPackage();

var selenium = package.scrape.selenium();
var jobMaker = package.resource.download.variable("job");

exports.execute = (configuration) => {
return new Promise((onsuccess, onfailure) => {
try {
    var result = core(configuration, onsuccess, onfailure);
} catch (e) {
    onfailure(e);
}
});
}

var core = (configuration, onsuccess, onfailure) => {

var By = selenium.By;
var until = selenium.until;
var async = require("async");
var driver = selenium.createDriver("chrome");

var jobs = new Array();
var jobCount;
var locationCount;

function GetCategoryCount(optionArray) {
    categoryCount = new Array();
    for (var i = 2; i <= optionArray.length; i++) {
        categoryCount.push(i);
    }
}

driver.get('https://careers-hackensackuhn.icims.com/jobs');
driver.switchTo().frame("icims_content_iframe");
driver.findElement(By.xpath('//form[@id="searchForm"]/div/div[2]/div[2]/select[@name="searchCategory"]')).then(jobcategoryelement => {
jobcategoryelement.findElements(By.tagName('option')).then(optionArray => {
if (optionArray.length > 1) {
    GetCategoryCount(optionArray);
    async.eachSeries(categoryCount, function (value, thecallback) {
        driver.findElement(By.xpath('//*[@name="searchCategory"]/Option['+value+']')).then(option => {
            option.getAttribute('text').then(optionValue => {
                var categoryValue = optionValue;
                option.click().then(() => {
                    driver.findElement(By.xpath('//input[@id="jsb_form_submit_i"]')).then(searchelement => {
                        searchelement.click().then(() => {
                            driver.findElements(By.xpath('//table[@class="iCIMS_JobsTable iCIMS_Table"]/tbody')).then(e => {
                                return !!e.length;
                            }).then(data => {
        if (data == true) {
            new Promise((onsuccess, onfailure) => {
                try {
                    forEachTag(driver, By, until, jobs, async, thecallback, categoryValue);
                } catch (e) {
                    onfailure(e);
                }
            }).then(() => {
                thecallback();
            });
                                                    }
        else {
            driver.findElement(By.xpath('//*[@class="iCIMS_Anchor_Nav"]')).then(searchELement => {
                searchELement.click().then(() => {
                    thecallback();
                });
                                                        });
                                                    }
    });
                                            });
});
});
});
});
});
}
});
})
.then(() => {
driver.quit();
snippet(configuration, jobMaker, onsuccess, onfailure);
}, err => {
driver.quit();
onfailure(err);
});
}

function GetCount(jobList) {
jobCount = new Array();
for (var i = 1; i <= jobList.length; i++) {
jobCount.push(i);
}
}

var forEachTag = (driver, By, until, jobs, async, thecallback, categoryValue) => {
driver.findElements(By.xpath('//table[@class="iCIMS_JobsTable iCIMS_Table"]/tbody/tr')).then(jobList => {
GetCount(jobList);
async.eachSeries(jobCount, function (prime, callback) {
var job = jobMaker.create();
if(prime >=2)
{
driver.switchTo().frame("icims_content_iframe");
}
driver.findElement(By.xpath('//table[@class="iCIMS_JobsTable iCIMS_Table"]/tbody/tr[' + prime + ']/td/a')).then(titleElement => {
if (titleElement != null) {
titleElement.getText().then(title => {
driver.findElement(By.xpath('//table[@class="iCIMS_JobsTable iCIMS_Table"]/tbody/tr[' + prime + ']/td/a')).then(urlElement => {
urlElement.getAttribute("href").then(url => {
titleElement.click().then(() => {
driver.findElement(By.xpath("//div[@class='iCIMS_JobContent']/div[2]/div[@class='iCIMS_Expandable_Container']")).then(descriptionElement => {
descriptionElement.getAttribute("innerHTML").then(description => {
driver.findElement(By.xpath("//div[@class='iCIMS_JobContent']/div[3]")).then(qualificationElement => {
qualificationElement.getAttribute("innerHTML").then(qualification => {
driver.findElement(By.xpath("//div[@class='iCIMS_JobHeaderTable iCIMS_Table']/div[1]/dl[1]/dd")).then(jobIDElement => {
jobIDElement.getText().then(id => {
driver.findElement(By.xpath("//div[@class='iCIMS_JobHeaderTable iCIMS_Table']/div[3]/dl[2]/dd")).then(industryElement => {
industryElement.getText().then(industry => {
driver.findElement(By.xpath("//div[@class='iCIMS_JobHeaderTable iCIMS_Table']/div[2]/dl[1]/dd")).then(typeElement => {
typeElement.getText().then(type => {
driver.findElement(By.xpath("//div[@class='iCIMS_JobHeaderTable iCIMS_Table']/div[1]/dl[2]/dd")).then(element => {
element.getText().then(status => {
driver.findElement(By.xpath("//div[@class='iCIMS_JobHeaderTable iCIMS_Table']/div[2]/dl[2]/dd")).then(element => {
element.getText().then(salary => {
driver.findElement(By.xpath("//div[@class='iCIMS_JobHeaderTable iCIMS_Table']/div[5]/dl[1]/dd")).then(element => {
element.getText().then(travel => {
driver.navigate().back().then(() => {
job.JOB_TITLE = title;
job.JDTID_UNIQUE_NUMBER = id;
job.JOB_TYPE= type;
job.TEXT = description;
job.JOB_CATEGORY = categoryValue;
job.JOB_INDUSTRY = industry;
job.JOB_APPLY_URL = url;
job.QUALIFICATIONS = qualification;
job.JOB_STATUS= status;
job.JOB_SALARY= salary;
job.TRAVEL= travel;
jobMaker.successful.add(job);
callback(false);
}).catch(e => { });
}).catch(e => { });
}).catch(e => { });
}).catch(e => { });
}).catch(e => { });
}).catch(e => { });
}).catch(e=>{});
}).catch(e => { });
}).catch(e => { });
}).catch(e => { });
}).catch(e => { });
}).catch(e => { });
}).catch(e => { });
}).catch(e => { });
}).catch(e => { });//quali closing
}).catch(e => { });
}).catch(e => { });
}).catch(e => { });
}).catch(e => { });
}).catch(e => { });
}).catch(e => { });
}
});
}, function (err) {
if (err) { throw err; }
});
}).then(() => {
driver.switchTo().frame("icims_content_iframe");
driver.findElements(By.xpath('//a[@target="_self"]/img[@alt="Next page of results"]')).then(e => {
if (e.length == 1) {
driver.findElement(By.xpath('//*[@target="_self"]/img[@alt="Next page of results"]')).then(nextPage => {
nextPage.click().then(() => {
forEachTag(driver, By, until, jobs, async, thecallback,categoryValue);
});
});
}
else {
driver.findElement(By.xpath('//*[@class="iCIMS_Anchor_Nav"]')).then(searchELement => {
searchELement.click().then(() => {
var x = 1;
thecallback();
});
});
}
});
});
}



var snippet = (configuration, jobs, onsuccess, onfailure) => {

var snippet = package.resource.download.snippet("writeObjectToFile");
var input = snippet.createInput(configuration, jobs);
snippet
.execute(input)
.then(jobcount => {
var output = package.service.bot.createBotOutput(configuration.scheduleid, jobcount);
onsuccess(output);
})
.catch(err => {
onfailure(err);
});
}


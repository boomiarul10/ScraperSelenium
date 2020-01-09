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
    var driver = selenium.createDriver("phantomjs");

    var jobs = new Array();
    var jobCount;
    var locationCount;

    function GetLocationCount(optionArray) {
        locationCount = new Array();
        for (var i = 2; i <= optionArray.length; i++) {
            locationCount.push(i);
        }
    }

    driver.get('http://careers.peopleclick.com/careerscp/client_wakemed/external/search.do?functionName=getSearchCriteria');
    //driver.wait(1000);
    driver.findElement(By.xpath('//*[@id="com.peopleclick.cp.formdata.JPM_LOCATION"]')).then(locationElement => {
        locationElement.findElements(By.tagName('option')).then(optionArray => {
            if (optionArray.length > 1) {
                GetLocationCount(optionArray);
                async.eachSeries(locationCount, function (value, thecallback) {
                    driver.findElement(By.xpath('//*[@id="com.peopleclick.cp.formdata.JPM_LOCATION"]/Option[' + value + ']')).then(option => {
                        option.getAttribute('text').then(optionValue => {
                            option.click().then(() => {
                                var removeOption = value - 1;
                                driver.findElement(By.xpath('//*[@id="com.peopleclick.cp.formdata.JPM_LOCATION"]/Option[' + removeOption + ']')).then(optionAll => {
                                    optionAll.click().then(() => {
                                        driver.findElement(By.xpath('//input[@id="searchButton"]')).then(searchelement => {
                                            searchelement.click().then(() => {
                                                driver.findElements(By.xpath('//table[@id="searchResultsTable"]/tbody')).then(e => {
                                                    return !!e.length;
                                                }).then(data => {
                                                    if (data == true) {
                                                        new Promise((onsuccess, onfailure) => {
                                                            try {
                                                                forEachTag(driver, By, until, jobs, async, thecallback);
                                                            } catch (e) {
                                                                onfailure(e);
                                                            }
                                                        }).then(() => {
                                                            thecallback();
                                                        });
                                                    }
                                                    else {
                                                        driver.findElement(By.xpath('//span/a[@id="searchCriteriaLink"]')).then(searchELement => {
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
    for (var i = 2; i <= jobList.length; i++) {
        jobCount.push(i);
    }
}

var forEachTag = (driver, By, until, jobs, async, thecallback) => {
    driver.findElements(By.xpath('//table[@id="searchResultsTable"]/tbody/tr')).then(jobList => {
        GetCount(jobList);
        async.eachSeries(jobCount, function (prime, callback) {
            var job = jobMaker.create();
            driver
                .findElement(By.xpath('//table[@id="searchResultsTable"]/tbody/tr[' + prime + ']/td/a'))
                .then(titleElement => {
                    if (titleElement != null) {
                        titleElement.getText().then(title => {
                            driver.findElement(By.xpath('//table[@id="searchResultsTable"]/tbody/tr[' + prime + ']/td[@class="pc-rtg-tableItem"][2]')).then(jobIDElement => {
                                jobIDElement.getText().then(id => {
                                    driver.findElement(By.xpath('//table[@id="searchResultsTable"]/tbody/tr[' + prime + ']/td[@class="pc-rtg-tableItem"][4]')).then(dateElement => {
                                        dateElement.getText().then(date => {
                                            driver.findElement(By.xpath('//table[@id="searchResultsTable"]/tbody/tr[' + prime + ']/td/a')).then(urlElement => {
                                                urlElement.getAttribute("href").then(url => {
                                                    titleElement.click().then(() => {
                                                        driver.findElements(By.xpath("//div[@id='pc-rtg-main']/form/table[3]/tbody/tr/td")).then(elements => {
                                                            if (elements.length > 0) {
                                                                driver.findElement(By.xpath("//div[@id='pc-rtg-main']/form/table[3]/tbody/tr/td")).then(descriptionElement => {
                                                                    descriptionElement.getAttribute("innerHTML").then(description => {
                                                                        driver.findElement(By.xpath("//*[@id='pc-rtg-main']/form/table[1]/tbody/tr[2]/td[1]/font/span")).then(categoryElement => {
                                                                            categoryElement.getText().then(category => {
                                                                                driver.findElement(By.xpath("//*[@id='pc-rtg-main']/form/table[1]/tbody/tr[1]/td[2]/font/span")).then(element => {
                                                                                    element.getText().then(contactcompany => {
                                                                                        driver.findElement(By.xpath("//*[@id='pc-rtg-main']/form/table[1]/tbody/tr[3]/td[1]/font/span")).then(element => {
                                                                                            element.getText().then(salary => {
                                                                                                driver.findElement(By.xpath("//*[@id='pc-rtg-main']/form/table[1]/tbody/tr[3]/td[2]/font/span")).then(element => {
                                                                                                    element.getText().then(status => {
                                                                                                        driver.findElement(By.xpath("//*[@id='pc-rtg-main']/form/table[1]/tbody/tr[2]/td[2]/font/span")).then(element => {
                                                                                                            element.getText().then(industry => {
                                                                                                                driver.findElement(By.xpath('//*[@id="searchResultLink"]')).then(element => {
                                                                                                                    element.click().then(() => {
                                                                                                                        job.title = title;
                                                                                                                        job.id = id;
                                                                                                                        job.description = description;
                                                                                                                        job.posteddate = date;
                                                                                                                        job.category = category;
                                                                                                                        job.contactcompany = contactcompany;
                                                                                                                        job.salary = salary;
                                                                                                                        job.status = status;
                                                                                                                        job.industry = industry;
                                                                                                                        job.applyurl = url;
                                                                                                                        jobMaker.successful.add(job);
                                                                                                                        callback(false);
                                                                                                                    }).catch(e => { });
                                                                                                                }).catch(e => { });
                                                                                                            }).catch(e => { });
                                                                                                        }).catch(e => { });
                                                                                                    }).catch(e => { });
                                                                                                }).catch(e => { });
                                                                                            }).catch(e => { });
                                                                                        }).catch(e => { });
                                                                                    }).catch(e => { });
                                                                                });
                                                                            }).catch(e => { });
                                                                        }).catch(e => { });
                                                                    }).catch(e => { });
                                                                }).catch(e => { });
                                                            }
                                                            else {
                                                                driver.findElement(By.xpath('//*[@id="searchResultLink"]')).then(element => {
                                                                    element.click().then(() => {
                                                                        callback();
                                                                    });
                                                                });
                                                            }
                                                        }).catch(e => { });
                                                    }).catch(e => { });
                                                }).catch(e => { });
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
        driver.findElements(By.xpath('//input[@value=">"]')).then(e => {
            if (e.length == 2) {
                driver.findElement(By.xpath('//input[@value=">"]')).then(nextElement => {
                    nextElement.click().then(() => {
                        forEachTag(driver, By, until, jobs, async, thecallback);
                    });
                });
            }
            else {
                driver.findElement(By.xpath('//span/a[@id="searchCriteriaLink"]')).then(searchELement => {
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

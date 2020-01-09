angular.module('ka.app.metricsController', ['nvd3']).controller('metricsController',
    ['applicationService', '$scope', '$route', '$http', '$routeParams', '$interval',
        function (applicationService, $scope, $route, $http, $routeParams, $interval) {

            $scope.display = false;
            $scope.statusData = undefined;
            $scope.executionProgressDetails = [];
            $scope.selectedCurentExecutionProgress = [];
            $scope.executionDetails = [];
            $scope.selectedexecutionDetails = [];
            $scope.executionVarianceDetails = [];

            $scope.pagination = {
                currentPage: 1
            };



            $scope.pageChanged = function (currentPage) {
                $scope.executionDetailscurrentPage = currentPage;
            };

            //$scope.currentPage = 1;
            $scope.itemsPerPage = 10;
            $scope.executionDetailscurrentPage = 1;
            $scope.executionDetailsitemsPerPage = 10;
            $scope.selectedCurrentExecutionStatus = null;
            $scope.lastExecutionStatus = null;
            $scope.maxPageDisplay = 5;


            Init();
            function GetCurrentExecution() {
                $http.get(applicationService.serviceUrl + 'executionprogress').then(function successCallback(response) {
                    var x = 0;
                    var y = 0;
                    $scope.executionProgressDetails = [];
                    $scope.executionProgressDetails = response.data;
                    clickexec();
                    $scope.inProgressStatus = null;
                    $scope.queued = null;
                    for (var i = 0; i < $scope.executionProgressDetails.length; i++) {
                        if ($scope.executionProgressDetails[i].scrapestatus == 4) {
                            x++;
                            $scope.inProgressStatus = x;
                        } else if ($scope.executionProgressDetails[i].scrapestatus == 2) {
                            y++;
                            $scope.queued = y;
                        }
                    }
                    var tp = function (key, y, e, graph) {
                        return '<p>' + (y * 100 / total).toFixed(3) + '%</p>';
                    };

                    if ($scope.selectedCurrentExecutionStatus == null)
                        $scope.selectedCurentExecutionProgress = response.data;
                    else
                        clickexec();

                    function clickexec() {
                        if ($scope.selectedCurrentExecutionStatus == 'in progress') {
                            $scope.selectedCurentExecutionProgress = undefined;
                            $scope.selectedCurentExecutionProgress = [];
                            $scope.statusData = 4;
                            for (var i = 0; i < $scope.executionProgressDetails.length; i++) {
                                if ($scope.executionProgressDetails[i].scrapestatus == $scope.statusData) {
                                    $scope.selectedCurentExecutionProgress.push($scope.executionProgressDetails[i]);
                                }
                            }
                        }
                        else if ($scope.selectedCurrentExecutionStatus == "queued") {
                            $scope.statusData = 2;
                            $scope.selectedCurentExecutionProgress = [];
                            for (var i = 0; i < $scope.executionProgressDetails.length; i++) {
                                if ($scope.executionProgressDetails[i].scrapestatus == $scope.statusData) {
                                    $scope.selectedCurentExecutionProgress.push($scope.executionProgressDetails[i]);
                                }
                            }
                        }
                        else {
                            $scope.selectedCurentExecutionProgress = $scope.executionProgressDetails;
                        }
                    }

                    $scope.options = {
                        chart: {
                            pie: {
                                dispatch: {
                                    chartClick: function (e) {
                                    },
                                    elementClick: function (e) {
                                        if ($scope.selectedCurrentExecutionStatus == null)
                                            $scope.selectedCurrentExecutionStatus = e.data.key.toLowerCase();
                                        else if ($scope.selectedCurrentExecutionStatus == e.data.key.toLowerCase())
                                            $scope.selectedCurrentExecutionStatus = null;
                                        else
                                            $scope.selectedCurrentExecutionStatus = e.data.key.toLowerCase();
                                        clickexec();
                                    },
                                    elementDblClick: function (e) {
                                    },
                                    elementMouseover: function (e) {
                                    },
                                    elementMouseout: function (e) {
                                    }
                                }
                            },
                            type: 'pieChart',
                            height: 400,
                            x: function (d) { return d.key; },
                            y: function (d) { return d.y; },
                            showLabels: true,
                            duration: 500,
                            labelThreshold: 0.01,
                            showLegend: false,
                            labelSunbeamLayout: true,
                            tooltipContent: tp
                        }
                    };

                    $scope.data1 = [
                        {
                            key: "In Progress",
                            y: $scope.inProgressStatus
                        },
                        {
                            key: "Queued",
                            y: $scope.queued
                        }
                    ];

                }, function errorCallback(response) {
                    console.log(response);
                });
            }

            function GetExecutionStatus() {
                $http.get(applicationService.serviceUrl + 'executionstatus').then(function successCallback(response) {
                    var x = 0;
                    var y = 0;
                    $scope.executionDetails = response.data;
                    if ($scope.lastExecutionStatus == null)
                        $scope.selectedexecutionDetails = response.data;
                    else
                        getSelectedStatusList();

                    function getSelectedStatusList() {
                        if ($scope.lastExecutionStatus == 'successful') {
                            $scope.selectedexecutionDetails = [];
                            $scope.statusData = 1;
                            for (var i = 0; i < $scope.executionDetails.length; i++) {
                                if ($scope.executionDetails[i].scrapestatus == $scope.statusData) {
                                    $scope.selectedexecutionDetails.push($scope.executionDetails[i]);
                                }
                            }
                        }
                        else {
                            $scope.statusData = 3;
                            $scope.selectedexecutionDetails = [];
                            for (var i = 0; i < $scope.executionDetails.length; i++) {
                                if ($scope.executionDetails[i].scrapestatus == $scope.statusData) {
                                    $scope.selectedexecutionDetails.push($scope.executionDetails[i]);
                                }
                            }
                        }
                    }
                    $scope.failedStatus = null;
                    $scope.successfulStatus = null;
                    for (var i = 0; i < $scope.executionDetails.length; i++) {
                        if ($scope.executionDetails[i].scrapestatus == 1) {
                            x++;
                            $scope.successfulStatus = x;
                        } else if ($scope.executionDetails[i].scrapestatus == 3) {
                            y++;
                            $scope.failedStatus = y;
                        }
                    }

                    var tp = function (key, y, e, graph) {
                        return '<p>' + (y * 100 / total).toFixed(3) + '%</p>';
                    };

                    $scope.options1 = {
                        chart: {
                            pie: {
                                dispatch: {
                                    chartClick: function (e) {
                                    },
                                    elementClick: function (e) {
                                        if ($scope.lastExecutionStatus == null)
                                            $scope.lastExecutionStatus = e.data.key.toLowerCase();
                                        else if ($scope.lastExecutionStatus == e.data.key.toLowerCase())
                                            $scope.lastExecutionStatus = null;
                                        else
                                            $scope.lastExecutionStatus = e.data.key.toLowerCase();
                                        getSelectedStatusList();
                                    },
                                    elementDblClick: function (e) {
                                    },
                                    elementMouseover: function (e) {
                                    },
                                    elementMouseout: function (e) {
                                    }
                                }
                            },
                            type: 'pieChart',
                            height: 400,
                            x: function (d) { return d.key; },
                            y: function (d) { return d.y; },
                            showLabels: true,
                            duration: 500,
                            labelThreshold: 0.01,
                            showLegend: false,
                            labelSunbeamLayout: true,
                            tooltipContent: tp,
                            color: ['Green', 'red']
                        }
                    };
                    $scope.data = [
                        {
                            key: "Successful",
                            y: $scope.successfulStatus
                        },
                        {
                            key: "Failed",
                            y: $scope.failedStatus
                        }
                    ];

                }, function errorCallback(response) {
                    console.log(response);
                });
            }

            function GetBotVariance() {
                $http.get(applicationService.serviceUrl + 'variance').then(function successCallback(response) {
                    var x = 0;
                    var y = 0;
                    var z = 0;
                    $scope.executionVarianceDetails = response.data;
                    $scope.belowTenVariance = null;
                    $scope.tenToTwentyVariance = null;
                    $scope.aboveTwentyVariance = null;
                    for (var i = 0; i < $scope.executionVarianceDetails.length; i++) {
                        if (parseInt($scope.executionVarianceDetails[i].jobvariance) < 10) {
                            x++;
                            $scope.belowTenVariance = x;
                        } else if (parseInt($scope.executionVarianceDetails[i].jobvariance) > 10 && parseInt($scope.executionVarianceDetails[i].jobvariance) < 20) {
                            y++;
                            $scope.tenToTwentyVariance = y;
                        } else if (parseInt($scope.executionVarianceDetails[i].jobvariance) > 20) {
                            z++;
                            $scope.aboveTwentyVariance = z;
                        }
                    }

                    var tp = function (key, y, e, graph) {
                        return '<p>' + (y * 100 / total).toFixed(3) + '%</p>';
                    };

                    $scope.options2 = {
                        chart: {
                            type: 'pieChart',
                            height: 500,
                            x: function (d) { return d.key; },
                            y: function (d) { return d.y; },
                            showLabels: true,
                            duration: 500,
                            labelThreshold: 0.01,
                            labelSunbeamLayout: true,
                            legend: {
                                margin: {
                                    top: 5,
                                    right: 35,
                                    bottom: 5,
                                    left: 0
                                }
                            },
                            color: ['Green', 'red', 'orange'],
                            tooltipContent: tp
                        }
                    };

                    $scope.data2 = [
                        {
                            key: "Below 10% Variance",
                            y: $scope.belowTenVariance
                        },
                        {
                            key: "Above 20% Variance",
                            y: $scope.aboveTwentyVariance
                        },
                        {
                            key: "Between 10-20% Variance",
                            y: $scope.tenToTwentyVariance
                        }
                    ];

                }, function errorCallback(response) {
                    console.log(response);
                });
            }

            function Init() {
                //GetBotVariance();
                GetCurrentExecution();
                GetExecutionStatus();
                Timer = $interval(function () {
                    GetCurrentExecution();
                    GetExecutionStatus();
                }, 15000);

                $http.get(applicationService.serviceUrl + 'serverexecdetails').then(function successCallback(response) {
                    var x = 0;
                    var y = 0;
                    $scope.executionServerDetails = [];
                    $scope.executionServerDetails = response.data;
                    $scope.inProgressStatus = null;
                    $scope.notStartedStatus = null;
                    for (var i = 0; i < $scope.executionServerDetails.length; i++) {

                        var key = $scope.executionServerDetails[i].servername;

                        //for()

                        //$scop

                        //if ($scope.executionServerDetails[i].endtime == 4) {
                        //    x++;
                        //    $scope.inProgressStatus = x;
                        //} else if ($scope.executionServerDetails[i].scrapestatus == 2) {
                        //    y++;
                        //    $scope.notStartedStatus = y;
                        //}
                    }

                    var tp = function (key, y, e, graph) {
                        return '<p>' + (y * 100 / total).toFixed(3) + '%</p>';
                    };

                    $scope.options5 = {
                        chart: {
                            type: 'cumulativeLineChart',
                            height: 450,
                            margin: {
                                top: 20,
                                right: 20,
                                bottom: 60,
                                left: 65
                            },
                            x: function (d) { return d[0]; },
                            y: function (d) { return d[1] / 100; },
                            average: function (d) { return d.mean / 100; },

                            color: d3.scale.category10().range(),
                            duration: 300,
                            useInteractiveGuideline: true,
                            clipVoronoi: false,

                            xAxis: {
                                axisLabel: 'X Axis',
                                tickFormat: function (d) {
                                    return d3.time.format('%m/%d/%y')(new Date(d))
                                },
                                showMaxMin: false,
                                staggerLabels: true
                            },

                            yAxis: {
                                axisLabel: 'Y Axis',
                                tickFormat: function (d) {
                                    return d3.format(',.1%')(d);
                                },
                                axisLabelDistance: 20
                            }
                        }
                    };

                    //$scope.data3 = [];

                    //angular.forEach(data.data, function (prod) {
                    //    $scope.data.push({
                    //        key: prod.ID,
                    //        y: prod.STOCK
                    //    });
                    //});

                    $scope.data3 = [
                        {
                            key: "B2ML17569",
                            values: [[1083297600000, 28], [1085976000000, 4], [1085976000000, 8]],
                            mean: 250
                        },
                        {
                            key: "B2ML17569-1",
                            values: [[1081297600000, 17], [1085976000000, 6], [1085976000000, 8]],
                            mean: 250
                        }
                    ];

                }, function errorCallback(response) {
                    console.log(response);
                });


            };




            $scope.data8 = [
                {
                    key: "One",
                    y: 5
                },
                {
                    key: "Two",
                    y: 2
                },
                {
                    key: "Three",
                    y: 9
                },
                {
                    key: "Four",
                    y: 7
                },
                {
                    key: "Five",
                    y: 4
                },
                {
                    key: "Six",
                    y: 3
                },
                {
                    key: "Seven",
                    y: .5
                }
            ];


            //$scope.clientDetails = {};

            //if ($routeParams.clientID) {
            //    GetClientDetails($routeParams.clientID);
            //}

            //function GetClientDetails(id) {
            //    $http.get(applicationService.serviceUrl + 'clients/' + $routeParams.clientID).then(function successCallback(response) {
            //        $scope.clientDetails = response.data;
            //    }, function errorCallback(response) {
            //        console.log(response);
            //    });
            //};

            //$scope.updateClient = function (clientData) {
            //    //init TODO
            //    if (clientData.isconcurrent === undefined) {
            //        clientData.isconcurrent = false;
            //    }
            //    if (clientData.active === undefined) {
            //        clientData.active = false;
            //    }
            //    //TODO
            //    $http({
            //        url: applicationService.serviceUrl + 'clients/' + clientData.id,
            //        method: 'PATCH',
            //        data: JSON.stringify(clientData)
            //    }).then(function successCallback(response) {
            //        swal({
            //            title: "Client Details updated successfully",
            //            confirmButtonColor: "#2a9fd6",
            //        })
            //    }, function errorCallback(response) {
            //        swal({
            //            title: "Error!!",
            //            confirmButtonColor: "#2a9fd6",
            //        })
            //    });
            //};

            //$scope.reset = function () {
            //    GetClientDetails($routeParams.clientID);
            //}
        }]);

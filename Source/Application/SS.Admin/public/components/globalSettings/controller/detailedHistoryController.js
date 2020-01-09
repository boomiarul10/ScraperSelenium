angular.module('ka.app.detailedHistoryController', ['ui.bootstrap', 'ui.grid', 'ui.grid.edit', 'ui.grid.resizeColumns', 'ngAnimate', 'ngRoute']).controller('detailedHistoryController',
    ['applicationService', '$scope', '$http', '$routeParams', '$interval',
        function (applicationService, $scope, $http, $routeParams, $interval) {

            $scope.botExecutions = new Array();
            $scope.botDetails = new Array();
            $scope.botDetaillogs = new Array();
            $scope.clientID = $routeParams.clientID;
            $scope.trigger = {};
            $scope.loading = false;
            var Timer = null;

            var types = ['success', 'info', 'warning', 'danger'];
            $scope.gridOptions = {
                enableCellEditOnFocus: false, enableCellEdit: false, enableSorting: false, enableFiltering: true, enableHorizontalScrollbar: 0, enableVerticalScrollbar: 2, enableColumnResizing: false
            };

            $scope.gridOptions.columnDefs = [
                { name: 'id', width: 50, field: 'id', enableFiltering: false, enableColumnMenu: false },
                { name: 'Bot Name', field: 'execBotConfig.name', enableColumnMenu: false, enableFiltering: true },
                { name: 'Started At', field: 'created_at', type: 'date', cellFilter: 'date:\'MM/dd/yyyy hh:mm:ss a\'', enableFiltering: true, enableColumnMenu: false },
                { name: 'Ended At', field: 'updated_at', type: 'date', cellFilter: 'date:\'MM/dd/yyyy hh:mm:ss a\'', enableFiltering: true, enableColumnMenu: false },
                { name: 'Extracted Records', field: 'jobcount', enableColumnMenu: false, enableFiltering: false },
                { name: 'Failed Job Count', field: 'failedjobcount', enableColumnMenu: false, enableFiltering: false },
                { name: "Status", field: 'botexecutionstatusid', cellTemplate: '<span ng-show={{row.entity.botexecutionstatusid=="1"}}>Completed</span><span ng-show={{row.entity.botexecutionstatusid=="2"}}>Not Started</span><span ng-show={{row.entity.botexecutionstatusid=="3"}}>Failed</span><span ng-show={{row.entity.botexecutionstatusid=="4"}}>In Progress</span>', enableColumnMenu: false, enableFiltering: false },
                { field: 'id', name: 'Go To Logs', cellTemplate: '<a href="setting/detailedhistorylogs/{{row.entity.id}}"> Go To Logs </a>', width: 200, enableColumnMenu: false, enableFiltering: false }
            ];

            function Init() {
                $('#progressdiv').show();
                $scope.loading = true;
                $http.get(applicationService.serviceUrl + 'executionhistory').then(function successCallback(response) {
                    $scope.botExecutions = response.data;
                    $scope.gridOptions.data = $scope.botExecutions;
                    $scope.loading = false;
                    $('#progressdiv').hide();
                }, function errorCallback(response) {
                    console.log(response);
                    $scope.loading = false;
                    $('#progressdiv').hide();
                });
            }

            Init();


            if ($routeParams.botexecId) {
                $('#progressdiv').show();
                GetSchduleBotExecution($routeParams.botexecId);

                Timer = $interval(function () {
                    if ($routeParams.botexecId) {
                        $('#progressdiv').show();
                        GetSchduleBotExecution($routeParams.botexecId);
                    }
                }, 5000);
            }

            function GetSchduleBotExecution(id) {
                var timer = null;
                $http.get(applicationService.serviceUrl + 'executionhistorydetail/' + id).then(function successCallback(response) {
                    $scope.botDetails = response.data;
                    
                    if (response.data.atsjobcount === 0) {
                        $scope.botDetails.currentProgress = 0;
                    } else if(response.data.jobcount != null && response.data.failedjobcount != null ) {
                        $scope.botDetails.currentProgress = (parseInt(response.data.jobcount) + parseInt(response.data.failedjobcount)) * 100 / parseInt(response.data.atsjobcount);
                    }

                    if ($scope.botDetails.botexecutionstatusid != 4) {
                        if (angular.isDefined(Timer)) {
                            $interval.cancel(Timer);
                            Timer = undefined;
                        }
                    }
                    $('#progressdiv').hide();
                }, function errorCallback(response) {
                    $('#progressdiv').hide();
                    console.log(response);
                });

                $http.get(applicationService.serviceUrl + 'botexecutionhistorylogs/' + id).then(function successCallback(response) {
                    $scope.botDetaillogs = response.data;
                    $('#progressdiv').hide();
                }, function errorCallback(response) {
                    console.log(response);
                    $('#progressdiv').hide();
                });
            }


        }]);
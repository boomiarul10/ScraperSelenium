angular.module('ka.app.historyController', ['ui.bootstrap', 'ngAnimate', 'ngRoute']).controller('historyController',
    ['applicationService', '$scope', '$http', '$routeParams', '$interval',
        function (applicationService, $scope, $http, $routeParams, $interval) {

            $scope.scheduleExecutions = new Array();
            $scope.botDetails = new Array();
            $scope.clientID = $routeParams.clientID;
            $scope.trigger = {};
            $scope.botData = {};

            $scope.gridOptions = {
                enableCellEditOnFocus: false, enableSorting: false, enableFiltering: true, enableHorizontalScrollbar: 2, enableVerticalScrollbar: 2
            };

            $scope.gridOptions.columnDefs = [
                { name: 'id', width: 50, field: 'botexecutionid', enableFiltering: false },
                { name: 'Bot Name', field: 'botname' },
                { name: 'Started At', field: 'createddate', type: 'date', cellFilter: 'date:\'MM/dd/yyyy hh:mm:ss a\'', enableFiltering: false },
                { name: 'Ended At', field: 'updateddate', type: 'date', cellFilter: 'date:\'MM/dd/yyyy hh:mm:ss a\'', enableFiltering: false },
                { name: 'Extracted Records', field: 'jobcount' },
                { name: 'Failed Job Count', field: 'failedjobcount' },
                { name: "Status", field: 'created_at', enableFiltering: false }, //Todo
                { field: 'id', name: 'Go To Logs', cellTemplate: ' <a href="/bothistorylogs/{{row.entity.botexecutionid}}"> Go To Logs </a>', width: 200, enableColumnMenu: false, enableFiltering: false }
            ];

            Init();

            function Init() {
                if ($routeParams.clientID) {
                    GetScheduleHistory($routeParams.clientID);
                    GetActiveBotsDetail($routeParams.clientID);
                }
            }

            function GetActiveBotsDetail(id) {
                $http.get(applicationService.serviceUrl + 'botlist/' + $routeParams.clientID).then(function successCallback(response) {
                    $scope.botData = response.data;

                }, function errorCallback(response) {
                    console.log(response);
                });
            }

            function GetScheduleHistory(id) {
                $('#progressdiv').show();
                $http.get(applicationService.serviceUrl + 'execution/' + id).then(function successCallback(response) {
                    $scope.scheduleExecutions = response.data;
                    $('#progressdiv').hide();
                }, function errorCallback(response) {
                    $('#progressdiv').hide();
                    console.log(response);
                });
            }

            if ($routeParams.scheduleExecutionId) {
                GetScheduleBotExecution($routeParams.scheduleExecutionId);
            }

            function GetScheduleBotExecution(id) {
                $('#progressdiv').show();
                $http.get(applicationService.serviceUrl + 'scheduleexecution/' + id).then(function successCallback(response) {
                    $scope.botDetails = response.data;
                    $('#progressdiv').hide();
                }, function errorCallback(response) {
                    $('#progressdiv').hide();
                    console.log(response);
                });
            }
                       

            $scope.TriggerExecution = function () {
                $scope.trigger = { "userdetailid": 3 };
                //Todo
                $http({
                    url: applicationService.serviceUrl + 'scheduleExecution/' + $scope.clientID,
                    method: 'POST',
                    data: JSON.stringify($scope.trigger)
                }).then(function successCallback(response) {
                    GetScheduleHistory($scope.clientID);
					swal({
                        title: "Trigger Created successfully",
                        confirmButtonColor: "#2a9fd6",
                    })

                }, function errorCallback(response) {
                    GetScheduleHistory($scope.clientID);
                    swal({
                        title: "Error!!",
                        confirmButtonColor: "#2a9fd6",
                    })
                });
            }


        }]);
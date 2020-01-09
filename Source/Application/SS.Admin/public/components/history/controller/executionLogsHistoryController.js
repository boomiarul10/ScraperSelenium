angular.module('ka.app.executionLogsHistoryController', ['ui.bootstrap', 'ngAnimate', 'ngRoute']).controller('executionLogsHistoryController',
    ['applicationService', '$scope', '$http', '$routeParams', '$interval',
        function (applicationService, $scope, $http, $routeParams, $interval) {


            $scope.botExecDetails = new Array();
            $scope.botDetaillogs = new Array();
            var Timer = null;

            if ($routeParams.botexecId) {
                $('#progressdiv').show();
                GetBotExecution($routeParams.botexecId);

                Timer = $interval(function () {
                    if ($routeParams.botexecId) {
                        GetBotExecution($routeParams.botexecId);
                    }
                }, 5000);
            }
            

            function GetBotExecution(id) {

                $http.get(applicationService.serviceUrl + 'executionhistorydetail/' + id).then(function successCallback(response) {
                    $scope.botExecDetails = response.data;
                    if (response.data.atsjobcount === 0) {
                        $scope.botExecDetails.currentProgress = 0;
                    } else if(response.data.jobcount != null && response.data.failedjobcount != null ) {
                        $scope.botExecDetails.currentProgress = (parseInt(response.data.jobcount) + parseInt(response.data.failedjobcount)) * 100 / parseInt(response.data.atsjobcount);
                    }
                    if ($scope.botExecDetails.botexecutionstatusid == 3 || $scope.botExecDetails.botexecutionstatusid == 1) {
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
                    $scope.loading = false;
                }, function errorCallback(response) {
                    console.log(response);
                    $('#progressdiv').hide();
                    $scope.loading = false;
                });
            }

        }]);
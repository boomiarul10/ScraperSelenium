angular.module('ka.app.executionDetailsController', []).controller('executionDetailsController',
    ['applicationService', '$scope', '$route', '$http', '$routeParams', '$interval',
    function (applicationService, $scope, $route, $http, $routeParams, $interval) {
        
        $scope.executionProgress = {};
        $scope.currentPage = 1;
        $scope.itemsPerPage = 10;
        Init();
        
        function Init() {
            GetExecDetails();
            Timer = $interval(function () {
                GetExecDetails();
            }, 10000);
        }
        
        function GetExecDetails() {
            $http.get(applicationService.serviceUrl + 'executionprogress').then(function successCallback(response) {
                $scope.executionProgress = response.data;
            }, function errorCallback(response) {
                console.log(response);
            });
        };
        
        $scope.StopExecution = function (executionId) {
            $http.get(applicationService.serviceUrl + 'stopbotexecution/' + executionId).then(function successCallback(response) {
                swal({
                    title: "Stop Action Triggered. Process will terminate Soon!",
                    confirmButtonColor: "#2a9fd6",
                })
            }, function errorCallback(response) {
                console.log(response);
            });
        }
    }]);
angular.module('ka.app.variableController', ['ui.bootstrap', 'ngAnimate', 'ngRoute', 'ui.ace']).controller('variableController',
    ['applicationService', '$scope', '$http', '$location', '$routeParams', '$modal', '$modalInstance', 'editId',
        function (applicationService, $scope, $http, $location, $routeParams, $modal, $modalInstance, editId) {
            
            $scope.id = editId;
            if (editId) {
                GetVariableByID(editId);
            }
            $scope.closeVar = function () {
                $modalInstance.close();
            }


            $scope.aceLoaded = function (_editor) {
                _editor.$blockScrolling = Infinity
            };

            function GetVariableByID(variable) {

                $http.get(applicationService.serviceUrl + 'variabletype/' + variable).then(function successCallback(response) {
                    $scope.selectedVariable = response.data;
                }, function errorCallback(response) {
                    console.log(response);
                    });
            };
        }]);

angular.module('ka.app.snippetController', ['ui.bootstrap', 'ngAnimate', 'ngRoute', 'ui.ace']).controller('snippetController',
    ['applicationService', '$scope', '$http', '$location', '$routeParams', '$modal', '$modalInstance', 'editId',
        function (applicationService, $scope, $http, $location, $routeParams, $modal, $modalInstance, editId) {
            
            $scope.id = editId;
            if (editId) {
                GetSnippetByID(editId);
            }
            $scope.closeSnippet = function () {
                $modalInstance.close();
            }


            $scope.aceLoaded = function (_editor) {
                _editor.$blockScrolling = Infinity;
            };

            
            function GetSnippetByID(snippet) {

                $http.get(applicationService.serviceUrl + 'snippet/' + snippet).then(function successCallback(response) {
                    $scope.selectedSnippet = response.data;
                }, function errorCallback(response) {
                    console.log(response);
                    });
            };
        }]);

angular.module('ka.app.clientcontroller', []).controller('clientController',
    ['applicationService', '$scope', '$route', '$http', '$routeParams', 
        function (applicationService, $scope, $route, $http, $routeParams) {

            $scope.clientDetails = {};

            if ($routeParams.clientID) {
                GetClientDetails($routeParams.clientID);
            }

            function GetClientDetails(id) {
                $http.get(applicationService.serviceUrl + 'clients/' + $routeParams.clientID).then(function successCallback(response) {
                    $scope.clientDetails = response.data;
                }, function errorCallback(response) {
                    console.log(response);
                });
            };

            $scope.updateClient = function (clientData) {
                //init TODO
                if (clientData.isconcurrent === undefined) {
                    clientData.isconcurrent = false;
                }
                if (clientData.active === undefined) {
                    clientData.active = false;
                }
                //TODO
                $http({
                    url: applicationService.serviceUrl + 'clients/' + clientData.id,
                    method: 'PATCH',
                    data: JSON.stringify(clientData)
                }).then(function successCallback(response) {
					swal({
                        title: "Client Details updated successfully",
                        confirmButtonColor: "#2a9fd6",
                            })
                }, function errorCallback(response) {
                    swal({
                        title: "Error!!",
                        confirmButtonColor: "#2a9fd6",
                    })
                });
            };

            $scope.reset = function () {
                GetClientDetails($routeParams.clientID);
            }
        }]);
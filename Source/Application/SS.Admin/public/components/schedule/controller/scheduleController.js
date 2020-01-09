angular.module( 'ka.app.scheduleController', [] ).controller( 'scheduleController',
    ['applicationService', '$scope', '$http', '$location', '$routeParams',
	function ( applicationService, $scope, $http, $location, $routeParams ) {
		
		$scope.schedules = new Array( );
		GetScheduleDetails( $routeParams.clientID );
		
		$scope.AddNewSchedule = function () {
			$scope.schedules.push( {
				time: "12:00"
			} );
		};
		
		function GetScheduleDetails( clientID ) {
            $('#progressdiv').show();
			$http.get( applicationService.serviceUrl + 'schedule/' + clientID ).then( function successCallback( response ) {
                $scope.schedules = response.data;
                $('#progressdiv').hide();
            }, function errorCallback(response) {
                $('#progressdiv').hide();
				console.log( response );
			} );

		};
		
		$scope.RemoveSchedule = function ( scheduleInfo ) {
			DeleteSchedule( scheduleInfo );
		};
		
		function DeleteSchedule( schedule ) {
			var index = $scope.schedules.indexOf( schedule );
			if ( index === -1 ) {
				swal( "No Schedules Present" );
			}
			else {
				$scope.schedules.splice( index, 1 );
				return true;
			}
		}
		
		$scope.SaveSchedules = function () {
			AddUniqueSchedules( GetUniqueSchedule( ) );
		};
		
		
		
        function AddUniqueSchedules(times) {
            $('#progressdiv').show();
			$http( {
				url: applicationService.serviceUrl + 'schedules/' + $routeParams.clientID,
				method: 'POST',
				data: JSON.stringify( times )
			} ).then( function successCallback( response ) {
                GetScheduleDetails($routeParams.clientID);
                $('#progressdiv').hide();
				swal({
                        title: "Schedule Created successfully",
                        confirmButtonColor: "#2a9fd6",
                    })

			}, function errorCallback( response ) {
                GetScheduleDetails($routeParams.clientID);
                $('#progressdiv').hide();
				swal({
                        title: "Error!!",
                        confirmButtonColor: "#2a9fd6",
                    })
			} );
		};
		
		function GetUniqueSchedule() {
			uniqueNames = new Array( );
			for ( var i = 0; i < $scope.schedules.length; i++ ) {
				var min = $scope.schedules[i].cron_expression.split( ':' )[1];
				var hr = $scope.schedules[i].cron_expression.split( ':' )[0];
				var schedule = "0 " + min + " " + hr + " 1/1 * ? *";
				if ( $.inArray( schedule, uniqueNames ) === -1 ) {
					uniqueNames.push( schedule );
				}
			};
			return uniqueNames;
		};
		
		
		$scope.Reset = function () {
			GetScheduleDetails( $routeParams.clientID );
		};

	}] );

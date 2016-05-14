app.directive('stopItem', function(){
  return {
    scope:{
      item: '='
    },
    templateUrl: '/app/directives/stop-item/stop-item.html',
    controller: function($scope, Stop){
      $scope.getPrice = function(item){
        var rtn = '';
        for(var i =0;i<item.price;i++)
          rtn+='$';
        return rtn;
      };
      $scope.getType = function(){
        if ($scope.item.type==='bar')
          return 'local_bar';
        else if ($scope.item.type === 'restaurant')
          return 'restaurant';
        else if ($scope.item.type === 'entertainment')
          return 'sentiment_very_satisfied';
      };
      $scope.getName = function(){
        return $scope.item.name.slice(0,17);
      };
      $scope.getDistance = function(){
        return ($scope.item.distance * 0.000621371).toPrecision(1);
      };
      $scope.getCurrent = Stop.getCurrent;
      $scope.setCurrent = function(stop){
        Stop.setCurrent(stop);

        Stop.setShownStops(stop);

      };

    }
  };
});

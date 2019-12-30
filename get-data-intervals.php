<?php
  include "query.php";
  
  $db = open_db();
  
  if ($db == null) {
    echo "Can't open database";
    exit;
  }
  
  $data_query = 
     "select 
        min(dated) as minTime, max(dated) as maxTime,
        greatest(max(maxTemperature), max(avgTemperature)) as maxTemperature,
        least(min(minTemperature), min(avgTemperature)) as minTemperature,
        max(precipDaily) as maxPrecipDaily,
        max(snowDepth) as maxSnowDepth
      from WeatherDataDaily;";
  
  $station_query = 
     "select
        min(lon) as minLon, max(lon) as maxLon,
        min(lat) as minLat, max(lat) as maxLat
      from stations;";
  
  $data_query_result = doquery($db, $data_query);
  
  $station_query_result = doquery($db, $station_query);
  
  $ret = json_encode([
    "weatherData" => 
      $data_query_result->fetch(PDO::FETCH_ASSOC),
    "stationData" => 
      $station_query_result->fetch(PDO::FETCH_ASSOC)
  ]);

  print($ret);
?>

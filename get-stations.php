<?php 
  include "query.php";
  
  $db = open_db();
  
  if ($db == null) {
    echo "Can't open database";
    exit;
  }
  
  $query = "
    select stations.* 
    from stations left join (
      select stationId, count(id) as cnt
      from WeatherDataDaily
      group by stationId
    ) as wd on wd.stationId = stations.id
    where wd.cnt > 100;";
  
  $query_data = doquery($db, $query);
  
  while ($station = $query_data->fetch(PDO::FETCH_ASSOC)) {
    print json_encode($station) . "\n";
  }
?>

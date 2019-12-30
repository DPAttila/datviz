<?php
  include "query.php";
  $db = open_db();

  if ($db == null) {
    echo "Can't open database";
  }

  $date = $_GET['date'];
  $query = "select * from WeatherDataDaily where dated = :date";

  $query_data = doquery($db, $query, array(
	'date' => $date
  ));

  $ret_json = "[";
  while ($data_row = $query_data->fetch(PDO::FETCH_ASSOC)) {
    $ret_json .= json_encode($data_row) . ",";
  }
  if (strlen($ret_json) > 1)
    $ret_json = substr($ret_json, 0, -1);

  $ret_json .= "]";

  echo $ret_json;
?>
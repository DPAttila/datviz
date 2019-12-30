<?php
exit;
  include "query.php";

  function fahrenheit_to_celsius($t) {
    if ($t == "NULL") return "NULL";
    return  ($t - 32) * (5.0/9.0);
  }

  function miles_to_metres($v) {
    if ($v == "NULL") return "NULL";
    return $v * 1609.344;
  }

  function mph_to_mps($v) {
    if ($v == "NULL") return "NULL";
    return $v * 0.44704;
  }

  function hundred_feet_to_metres($d) {
    if ($d == "NULL") return "NULL";
    return $d * 30.48;
  }

  function inches_to_metres($d) {
    if ($d == "NULL") return "NULL";
    return $d * 0.0254;
  }

  $db = open_db();

  if ($db == null) {
    echo "Can't open database";
    exit;
  }

  /// empty the table
  doquery($db, "truncate stations;");

  $station_dir = 'weather-data/stations';
  $files = array_slice(scandir($station_dir), 2);

  foreach ($files as $file) {
    echo $file . "\n";

    $data_file = fopen($station_dir . '/'. $file, "r") or return_err_msg("Can't open file");

    /// first two lines don't contain actual data
    fgets($data_file);
    fgets($data_file);

    while (!feof($data_file)) {
      $line = fgets($data_file);

  //     echo $line . "\n";

      $station = preg_split("/(\s)+/", substr($line, 44));

      array_unshift($station, trim(substr($line, 13, 31))); /// name
      array_unshift($station, substr($line, 0, 7));         /// index

      if (!isset($station[2])) {
        echo "error";
        var_dump($station);
      } else {
        doquery($db, "insert into stations (id, name, country, lat, lon, ele) values('$station[0]', '$station[1]', '$station[2]', '$station[3]', '$station[4]', '$station[5]')");
      }
    }

    fclose($data_file);
  }

  doquery($db, "DELETE FROM `stations` WHERE `stations`.`id` = 0");

  $data_dir = 'weather-data/data';
  $files = array_slice(scandir($data_dir), 2);

  doquery($db, "truncate WeatherData");

  foreach ($files as $file) {
    echo $file . "\n";

    $data_file = fopen($data_dir . '/' . $file, "r") or return_err_msg("Can't open file");

    $query_base =
      "insert into WeatherData (stationId, date, windDirection, windSpeed, " .
      "windGust, cloudCeiling, skyCover, lowCloudType, middleCloudType, " .
      "highCloudType, visibility, manualObservation1, manualObservation2, " .
      "manualObservation3, manualObservation4, autoObservation1, autoObservation2, " .
      "autoObservation3, autoObservation4, pastWeather, temperature, dewPoint, " .
      "seaLevelPressure, altimeter, stationLevelPressure, maxTemperature, " .
      "minTemperature, precip1H, precip6H, precip24H, precip12H, snowDepth, " .
      "precipTrace1H, precipTrace6H, precipTrace12H, precipTrace24H" .
      ") values ";
    $insert_query = $query_base;
    $c = 0;

    /// first line doesn't contain actual data
    fgets($data_file);

    while (!feof($data_file)) {
      $line = fgets($data_file);

      if ($line[126] == "T") $precipTrace1 = "true";
      else $precipTrace1 = "false";

      if ($line[132] == "T") $precipTrace6 = "true";
      else $precipTrace6 = "false";

      if ($line[138] == "T") $precipTrace24 = "true";
      else $precipTrace24 = "false";

      if ($line[144] == "T") $precipTrace12 = "true";
      else $precipTrace12 = "false";

      $weather =
        preg_split("/(\s)+/", substr($line, 0, 100) . str_replace("T", " ", substr($line, 100, 48)));

      array_splice($weather, 1, 1);
      for ($i = 0; $i < count($weather); $i++) {
        if (strpos($weather[$i], "*") !== false)
          $weather[$i] = "NULL";
      }

      if (sizeof($weather) != 33)
        echo sizeof($weather) . " at line " . c . "\n";

      $weather[1] =
        '"' . substr($weather[1], 0, 4) . '-' . substr($weather[1], 4, 2) .
        '-' . substr($weather[1], 6, 2) . ' ' . substr($weather[1], 8, 2) .
        ":" . substr($weather[1], 10, 2) . '"';

      if ($weather[6] != "NULL")
        $weather[6] = '"' . $weather[6] . '"';

      $weather[5] = hundred_feet_to_metres($weather[5]);

      $weather[3] = mph_to_mps($weather[3]);
      $weather[4] = mph_to_mps($weather[4]);

      $weather[10] = miles_to_metres($weather[10]);

      $weather[23] = inches_to_metres($weather[23]);
      $weather[27] = inches_to_metres($weather[27]);
      $weather[28] = inches_to_metres($weather[28]);
      $weather[29] = inches_to_metres($weather[29]);
      $weather[30] = inches_to_metres($weather[30]);
      $weather[31] = inches_to_metres($weather[31]);

      $weather[20] = fahrenheit_to_celsius($weather[20]);
      $weather[21] = fahrenheit_to_celsius($weather[21]);
      $weather[25] = fahrenheit_to_celsius($weather[25]);
      $weather[26] = fahrenheit_to_celsius($weather[26]);

      $insert_query .=
        "(" . implode(", ", $weather) . $precipTrace1 . ", " . $precipTrace6 . ", " .
        $precipTrace12 . ", " . $precipTrace24 . "), ";

      if ($c%10000 == 0) {
        $insert_query = substr($insert_query, 0, -2) . ";";
        echo $c . "\n";
        $res = doquery($db, $insert_query);
  //        echo $insert_query;
        $insert_query = $query_base;
      }
      $c++;
    }

    fclose($data_file);
  }
  /*
  $q = doquery($db, "show columns from WeatherData");
  while ($line = $q->fetch(PDO::FETCH_ASSOC)) {
    echo $line["Field"] . "\t" . $line["Type"] . "\n";
  }
  */
?>

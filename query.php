<?php
  function return_err_msg($msg) {
    echo json_encode(array('succes' => false, 'msg' => $msg));
  }

  function doquery($db, $query, $params = array()) {
    try {
      if (count($params) == 0) {
        $result = $db->query($query);
      } else {
        $result = $db->prepare($query);
        $result->execute($params);
      }
    } catch (PDOException $err) {
      $result = false;
      echo "Failed to do query: " . $err->getMessage() . "\n";
    }

    return($result);
  }

  function qrow($db, $query, $params = null) {
    return doquery($db, $query, $params)->fetch(PDO::FETCH_ASSOC);
  }

  function open_db() {
    try {
      return new PDO("mysql:host=localhost;dbname=", "", "", array(
  PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
));
    } catch (PDOException $err) {
      return_err_msg("Failed to get DB handle: ", $err->getMessage() . "\n");
      return null;
    }
  }
?>

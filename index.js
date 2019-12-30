var scene1, scene2;
var camera, camera2;
var renderer;

splitScreen = false;

const earthRadius = 3;

/// Camera view angle latitudes and longitudes (in degrees)
/// They are set when the station data is retrieved from the server
cameraLat = 0, minCameraLat = 0, maxCameraLat = 0;
cameraLon = 0, minCameraLon = 0, maxCameraLon = 0;

/// Camera distance from the center of the globe
/// (1.0 is at sea level)
cameraDist = 1.06;
const minCameraDist = 1.01, maxCameraDist = 1.30;

/// number of points that are processed by the Delaunay triangulation
loadedPoints = 0;

showEdges = true;

var edgesMesh1, surfaceMesh1, edgesMesh2, surfaceMesh2;
usingBufferGeometry = false;

stations = {};
stationIndices = [];

dailyData1 = null;
dailyData2 = null;

scaleCanvas2D = document.getElementById("canvas2d");
ctx2D = scaleCanvas2D.getContext('2d');

/// used for drag in case of touchscreen devices
var touchLastX, touchLastY;

delaunayData = {
  "drawTriangles": [], 
  "polarPointList": [],
  "triangles": [],
  "points": [],
  "historyGraph": [],
  "adjacencyGraph": []
};
triangles = [];

var canvasDragged = false;

var vertexColorMaterial = new THREE.MeshBasicMaterial({
  vertexColors: THREE.VertexColors,
});

var lineMaterial = new THREE.LineBasicMaterial({
  color: 0x00ff0f,
  transparent: true,
  linewidth: 3
});

var stationNoDataMaterial = new THREE.MeshBasicMaterial({
  color: 0xaaaaaa
});

var stationHasDataMaterial = new THREE.MeshBasicMaterial({
  color: 0x0aaa0a
});

var weatherShaderMaterial = new THREE.ShaderMaterial({
  vertexColors: THREE.VertexColors,
  vertexShader: $("#vertex-shader").html(),
  fragmentShader: $("#fragment-shader").html(),
});

const precipScale = [
  {"q": 0.000, "c": [0, 0, 0]},
  {"q": 0.001, "c": [0, .4, 0]},
  {"q": 0.500, "c": [1, 1, 0]},
  {"q": 1.000, "c": [1, 0, 0]},
  {"q": 10.00, "c": [1, 0, 0]}
];

const tempScale = [
  {"q": -100, "c": [1, 0, 1]},
  {"q": -30 , "c": [1, 0, 1]},
  {"q": -15 , "c": [0, 0, 1]}, 
  {"q":  0 , "c": [0, 1, 1]},
  {"q":  15  , "c": [0, 1, 0]}, 
  {"q":  30 , "c": [1, 1, 0]}, 
  {"q":  45 , "c": [1, 0, 0]},
  {"q": 100 , "c": [1, 0, 0]}
];

const snowScale = [
  {"q": 0.000, "c": [0, 0, 0]},
  {"q": 0.001, "c": [0.2, 0.2, 0.2]},
  {"q": 0.500, "c": [1, 1, 1]},
  {"q": 1.000, "c": [0, 1, 1]},
  {"q": 10.00, "c": [0, 1, 1]}
];

$("#start-button").on("click", function() {
  if ($("#info").is(":visible")) {
    $("#info").hide();
  }
});

$("#help-button").on("click", function() {
  $("#info").toggle();
});

$("#info-button1").on("click", function() {
  $("#info-text1").toggle();
  $("#info-button1").toggleClass("drop-down-active");
});

$("#info-button2").on("click", function() {
  $("#info-text2").toggle();
  $("#info-button2").toggleClass("drop-down-active");
});

function initThree() {
  let width = window.innerWidth;
  let height = window.innerHeight;
  
  scene1 = new THREE.Scene();
  scene2 = new THREE.Scene();
  
  camera = new THREE.PerspectiveCamera(75, width / height, 0.001, 1000);
  
//   camera = new THREE.OrthographicCamera( 0, 500, 500, 0, 1, 1000 );
  camera.position.set(0, 0, 5);
  camera.lookAt(0, 0, 0);
  
  renderer = new THREE.WebGLRenderer({"antialias": true});
  renderer.setSize(width, height);
  
  $(window).on("resize", function() {
    let width = window.innerWidth;
    let height = window.innerHeight;
    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  });
  
  renderer.domElement.id = "3d-canvas";

  document.body.append(renderer.domElement);

  $("#3d-canvas").on("mousedown", function(e) {
    if (!$("#info").is(":visible"))
      canvasDragged = true;
  }).on("touchstart", function(e) {
    if (!$("#info").is(":visible")) {
      canvasDragged = true;
      touchLastX = e.originalEvent.touches ? e.originalEvent.touches[0].pageX : e.pageX;
      touchLastY = e.originalEvent.touches ? e.originalEvent.touches[0].pageY : e.pageY;
    }
  }).on("mousemove", function(e) {
    if (!$("#info").is(":visible") && canvasDragged) {
      cameraLon -= e.originalEvent.movementX / 100.0 / (2 - cameraDist);
      cameraLat += e.originalEvent.movementY / 100.0 / (2 -cameraDist);
      
      if (cameraLon < minCameraLon)
        cameraLon = minCameraLon;
      else if (cameraLon > maxCameraLon)
        cameraLon = maxCameraLon;
      if (cameraLat < minCameraLat)
        cameraLat = minCameraLat;
      else if (cameraLat > maxCameraLat)
        cameraLat = maxCameraLat;
      
      setCameraPos();
    }
  }).on("touchmove", function (e) {
    if (!$("#info").is(":visible") && canvasDragged) {
      let currentX = e.originalEvent.touches ? e.originalEvent.touches[0].pageX : e.pageX;
      let currentY = e.originalEvent.touches ? e.originalEvent.touches[0].pageY : e.pageY;
//       if (dx != undefiend && dy != undefined) {
      cameraLon -= (currentX - touchLastX) / 100.0;
      cameraLat += (currentY - touchLastY) / 100.0;
//       }
      touchLastX = currentX;
      touchLastY = currentY;
      
      if (cameraLon < minCameraLon)
        cameraLon = minCameraLon;
      else if (cameraLon > maxCameraLon)
        cameraLon = maxCameraLon;
      if (cameraLat < minCameraLat)
        cameraLat = minCameraLat;
      else if (cameraLat > maxCameraLat)
        cameraLat = maxCameraLat;
      
      setCameraPos();
    }
  }).on("mouseup touchend", function(e) {
    if (!$("#info").is(":visible"))
      canvasDragged = false;
  });
  
  $(window).on("wheel", function(e) {
    if (!$("#info").is(":visible")) {
      if (e.originalEvent.deltaY > 0 && cameraDist < maxCameraDist)
        cameraDist += 0.005;
      else if (cameraDist > minCameraDist)
        cameraDist -= 0.005;
      
      setCameraPos();
    }
  });
}

function polarToDescartes(lon, lat, ele, r) {
  return {
    "x": Math.sin(lon) * Math.sin(lat) * (r + ele),
    "z": Math.cos(lon) * Math.sin(lat) * (r + ele),
    "y": - Math.cos(lat) * (r + ele)
  };
}

function generateCanvas2DScale(val) {
  let scale;
  let min, max;
  
  if (val == "temp") {
    scale = tempScale;
    min = scale[1].q;
    max = scale[scale.length-2].q;
    $("#scale-desc").html("Hőmérséklet skála &#8451;-ban:");
  } else if (val == "snow") {
    scale = snowScale;
    min = scale[1].q;
    max = scale[scale.length-2].q;
    $("#scale-desc").html("Hómélység skála centiméterben:");
  } else if (val == "precip") {
    scale = precipScale;
    min = scale[1].q;
    max = scale[scale.length-2].q;
    $("#scale-desc").html("Csapadékmennyiség skála centiméterben:");
  }
  
  let gradient = ctx2D.createLinearGradient(0, 30, 0, 370);
  
  for (let i = 1; i < scale.length-1; i++) {
    console.log((scale[i].q - min) / (max - min));
    console.log("rgb(" + scale[i].c[0] * 256 + ", " + scale[i].c[1] * 256 + ", " + scale[i].c[2] * 256 + ")" );
    gradient.addColorStop(
      (scale[i].q - min) / (max - min),
      "rgb(" + scale[i].c[0] * 256 + ", " + scale[i].c[1] * 256 + ", " + scale[i].c[2] * 256 + ")" 
    );
  }
  
  ctx2D.fillStyle = "black";
  ctx2D.fillRect(0, 0, 100, 400);
  
  ctx2D.fillStyle = gradient;
  ctx2D.fillRect(0, 0, 100, 400);
  
  ctx2D.font = "30px Arial";
  ctx2D.textAlign = "center";
  ctx2D.fillStyle = "black";
  
  if (val == "temp") {
    for (let i = 1; i < scale.length-1; i++) {
      ctx2D.fillText(
        scale[i].q.toString(),
        50,
        (scale[i].q - min) / (max - min) * 370 + 25
      );
    }
  } else {
    for (let i = 1; i < scale.length-1; i++) {
      ctx2D.fillText(
        (scale[i].q * 100).toString(),
        50,
        (scale[i].q - min) / (max - min) * 370 + 25
      );
    }
  }
}

function quantityToColor(q, colors) {
  q = Number(q);
  for (let i = 0; i < colors.length-1; i++) {
    if (q >= colors[0].q && q < colors[i+1].q) {
      let ratio = (q - colors[i].q) / (colors[i+1].q - colors[i].q);
      return {
        "r": colors[i].c[0] * (1 - ratio) + colors[i+1].c[0] * ratio, 
        "g": colors[i].c[1] * (1 - ratio) + colors[i+1].c[1] * ratio, 
        "b": colors[i].c[2] * (1 - ratio) + colors[i+1].c[2] * ratio
      };
    }
  }
  
  console.log("error in color conversion: " + q);
  return {"r": 0, "g": 0, "b": 0};
}

function addStation(json, id) {
  let station = {};
 
  station.country = json.country;
  station.id = json.id;
  station.jsId = id;
  
  station.polarPos = {
    "lon": json.lon / 180.0 * Math.PI, 
    "lat": json.lat / 180.0 * Math.PI,
    "ele": json.ele,
    "id": id
  };
  
  station.descartesPos = polarToDescartes(
    station.polarPos.lon,
    station.polarPos.lat,
    0,
    earthRadius
  );
  
  let geometry = new THREE.SphereGeometry(0.001);
  
  let material = stationNoDataMaterial;
  
  station.mesh1 = new THREE.Mesh(geometry, material);
  station.mesh2 = new THREE.Mesh(geometry, material);
  
  station.mesh1.position.set(
    station.descartesPos.x, 
    station.descartesPos.y, 
    station.descartesPos.z
  );
  
  station.mesh2.position.set(
    station.descartesPos.x, 
    station.descartesPos.y, 
    station.descartesPos.z
  );
  
  station.draw = false;
  
  station.setDraw = function(draw) {
    station.draw = draw;
    
    if (!draw) {
      scene1.remove(station.mesh1);
      scene2.remove(station.mesh2);
    } else {
      scene1.add(station.mesh1);
      scene2.add(station.mesh2);
    }
  };
  
  stations[station.id] = station;
}

function setCameraPos() {
  const pos = polarToDescartes(
    cameraLon / 180.0 * Math.PI,
    cameraLat / 180.0 * Math.PI,
    0,
    earthRadius * cameraDist
  );
  
  camera.position.set(pos.x, pos.y, pos.z);
  camera.lookAt(0, 0, 0);
}

function initCheckboxes() {
  edgesCheckbox = $("#edges-checkbox");
  edgesCheckbox.on("click", function() {
    showEdges = edgesCheckbox.prop("checked");
  });
  
  splitScreenCheckbox = $("#vertical-split-checkbox");
  splitScreenCheckbox.prop("checked", false);
  splitScreenCheckbox.on("click", function() {
    splitScreen = splitScreenCheckbox.prop("checked");
    
    if (splitScreen) {
      $("#h-menu").removeClass("horizontal-menu");
      $("#h-menu").addClass("horizontal-menu-split-screen");
      timeRange2.show();
      timePicker2.show();
    } else {
      $("#h-menu").removeClass("horizontal-menu-split-screen");
      $("#h-menu").addClass("horizontal-menu");
      timeRange2.hide();
      timePicker2.hide();
    }
    
    timeUpdated(1);
    timeUpdated(2);
  });
}

function drawDailyData(mesh, data) {
  if (mesh != null && data != null && usingBufferGeometry) {
    let colorArray = mesh.geometry.attributes.color.array;
    let hasDataArray = mesh.geometry.attributes.hasData.array;
    
    if (mesh.name == "surface-mesh1")
      var stationMeshIndex = "mesh1";
    else
      var stationMeshIndex = "mesh2";
    
    for (let i = 0; i < stationIndices.length; i++) {
      stations[stationIndices[i]][stationMeshIndex].material = stationNoDataMaterial;
      stations[stationIndices[i]][stationMeshIndex].scale.set(1, 1, 1);
      
      colorArray[i*3  ] = 0.1;
      colorArray[i*3+1] = 0.1;
      colorArray[i*3+2] = 0.1;
      
      hasDataArray[i] = 0.0;
    }
    
    const view = $('input[name="view"]:checked').val();
    
    for (let i = 0; i < data.length; i++) {
      if (stations[data[i].stationId] != undefined) {
        let station = stations[data[i].stationId];
        station[stationMeshIndex].material = stationHasDataMaterial;
        station[stationMeshIndex].scale.set(1, 1, 1);

        hasDataArray[station.jsId] = 1.1;
        
        if (view == "temp" && data[i].avgTemperature != null) {
          let tempColor = quantityToColor(
            data[i].avgTemperature,
            tempScale
          );
          colorArray[station.jsId*3  ] += tempColor.r;
          colorArray[station.jsId*3+1] += tempColor.g;
          colorArray[station.jsId*3+2] += tempColor.b;
        } else if (view == "precip") {
          let precipColor = quantityToColor(
            data[i].precipDaily,
            precipScale
          );
          colorArray[station.jsId*3  ] += precipColor.r;
          colorArray[station.jsId*3+1] += precipColor.g;
          colorArray[station.jsId*3+2] += precipColor.b;
        } else if (view == "snow" && data[i].snowDepth != null) {
          let snowColor = quantityToColor(
            data[i].snowDepth,
            snowScale
          );
          colorArray[station.jsId*3  ] += snowColor.r;
          colorArray[station.jsId*3+1] += snowColor.g;
          colorArray[station.jsId*3+2] += snowColor.b;
        }
      }
    }
    
    mesh.geometry.attributes.color.needsUpdate = true;
    mesh.geometry.attributes.hasData.needsUpdate = true;
  }
}

function animate() {
  requestAnimationFrame(animate);
  if (showEdges && lineMaterial.opacity < 1) {
    lineMaterial.opacity += 0.01;
    lineMaterial.needsUpdate = true;
  } else if (!showEdges && lineMaterial.opacity > 0) {
    lineMaterial.opacity -= 0.01;
    lineMaterial.needsUpdate = true;
  }
  
  if (loadedPoints < stationIndices.length) {
    stations[stationIndices[loadedPoints]].setDraw(true);
    
    if (surfaceMesh1 != undefined) {
      surfaceMesh1.geometry.dispose();
      scene1.remove(surfaceMesh1);
      surfaceMesh2.geometry.dispose();
      scene2.remove(surfaceMesh2);
    }
    
    if (edgesMesh1 != undefined) {
      edgesMesh1.geometry.dispose();
      scene1.remove(edgesMesh1);
      edgesMesh2.geometry.dispose();
      scene2.remove(edgesMesh2);
    }
    
    delaunayData = delaunay(
      delaunayData, 
      stations[stationIndices[loadedPoints]].polarPos
    );
    loadedPoints++;
    
    triangles = delaunayData.drawTriangles;
    
    let meshGeometry = new THREE.Geometry();
    let grayColor = new THREE.Color(0.1, 0.1, 0.1);
    
    for (let i = 0; i < loadedPoints; i++) {
      let v = new THREE.Vector3(
        stations[stationIndices[i]].descartesPos.x, 
        stations[stationIndices[i]].descartesPos.y, 
        stations[stationIndices[i]].descartesPos.z
      );
      
      meshGeometry.vertices.push(v);
      
      meshGeometry.colors[i] = grayColor; 
    }
    
    for (let i = 0; i < triangles.length; i++) {
      let face = new THREE.Face3(
        triangles[i].p1.id,
        triangles[i].p2.id,
        triangles[i].p3.id 
      );
      face.vertexColors[0] = meshGeometry.colors[triangles[i].p1.id];
      face.vertexColors[1] = meshGeometry.colors[triangles[i].p2.id];
      face.vertexColors[2] = meshGeometry.colors[triangles[i].p3.id];

      meshGeometry.faces.push(face);
    }
    
    meshGeometry.computeFaceNormals();
    meshGeometry.computeVertexNormals();
    
    surfaceMesh1 = new THREE.Mesh(meshGeometry, weatherShaderMaterial);
    surfaceMesh1.name = "surface-mesh1";
    
    surfaceMesh2 = new THREE.Mesh(meshGeometry, weatherShaderMaterial);
    surfaceMesh2.name = "surface-mesh2";
    
    scene1.add(surfaceMesh1);
    scene2.add(surfaceMesh2);
    
    let edgesGeometry = new THREE.EdgesGeometry(meshGeometry, 0.0);
    
    edgesMesh1 = new THREE.LineSegments(edgesGeometry, lineMaterial);
    edgesMesh1.name = "edges-mesh1";
    
    edgesMesh2 = new THREE.LineSegments(edgesGeometry, lineMaterial);
    edgesMesh2.name = "edges-mesh2";
    
    if (showEdges) {
      scene1.add(edgesMesh1);
      scene2.add(edgesMesh2);
    }
  } else if (!usingBufferGeometry) {
    usingBufferGeometry = true;
    if (showEdges) {
      showEdges = false;
      edgesCheckbox.prop('checked', false);
    }
    
    surfaceMesh1.geometry.dispose();
    surfaceMesh2.geometry.dispose();
    
    scene1.remove(surfaceMesh1);
    scene2.remove(surfaceMesh2);
    
    let vertices1 = [], vertices2 = [];
    let colors1 = [], colors2 = [];
    let hasData1 = [], hasData2 = [];
    
    for (let i = 0; i < loadedPoints; i++) {
      vertices1[i*3  ] = stations[stationIndices[i]].descartesPos.x;
      vertices1[i*3+1] = stations[stationIndices[i]].descartesPos.y;
      vertices1[i*3+2] = stations[stationIndices[i]].descartesPos.z;
      
      vertices2[i*3  ] = stations[stationIndices[i]].descartesPos.x;
      vertices2[i*3+1] = stations[stationIndices[i]].descartesPos.y;
      vertices2[i*3+2] = stations[stationIndices[i]].descartesPos.z;
      
      colors1[i*3  ] = 0;
      colors1[i*3+1] = 0;
      colors1[i*3+2] = 0;
      
      colors2[i*3  ] = 0;
      colors2[i*3+1] = 0;
      colors2[i*3+2] = 0;
      
      hasData1[i] = 0;
      hasData2[i] = 0;
    }
    
    let indices1 = [], indices2 = [];
    
    for (let i = 0; i < triangles.length; i++) {
      indices1[i*3  ] = triangles[i].p1.id;
      indices1[i*3+1] = triangles[i].p2.id;
      indices1[i*3+2] = triangles[i].p3.id;

      indices2[i*3  ] = triangles[i].p1.id;
      indices2[i*3+1] = triangles[i].p2.id;
      indices2[i*3+2] = triangles[i].p3.id;
    }
    
    function generateSurfaceMesh(vertices, colors, hasData, indices) {
      let geometry = new THREE.BufferGeometry();
      
      geometry.setAttribute(
        'position',
        new THREE.BufferAttribute(new Float32Array(vertices), 3)
      );
      
      geometry.setAttribute(
        'color',
        new THREE.BufferAttribute(new Float32Array(colors), 3)
      );
      
      geometry.setAttribute(
        'hasData',
        new THREE.BufferAttribute(new Float32Array(hasData), 1)
      );
      
      geometry.setIndex(indices);

      return new THREE.Mesh(geometry, weatherShaderMaterial);
    }
    
    surfaceMesh1 = 
      generateSurfaceMesh(vertices1, colors1, hasData1, indices1);
    surfaceMesh2 = 
      generateSurfaceMesh(vertices2, colors2, hasData2, indices2);
    
    surfaceMesh1.name = "surface-mesh1";
    surfaceMesh2.name = "surface-mesh2";
    
    scene1.add(surfaceMesh1);
    scene2.add(surfaceMesh2);
    
    $("#time-range1").trigger("input");
    $("#time-range2").trigger("input");
  }
  
  if (splitScreen) {
    const width = window.innerWidth;
    const height = window.innerHeight;

    renderer.setScissor(0, 0, width / 2, height);
    renderer.setScissorTest(true);    
    renderer.render(scene1, camera);

    renderer.setScissor(width / 2, 0, width / 2, height);
    renderer.setScissorTest(true);
    renderer.render(scene2, camera);
  } else { 
    renderer.setViewport(0, 0, window.innerWidth, window.innerHeight);
    renderer.setScissorTest(false);
    renderer.render(scene1, camera);
  }
}

function timeUpdated(ind) {
  timeRange1.prop('disabled', true);
  timeRange2.prop('disabled', true);
  timePicker1.prop('disabled', true);
  timePicker2.prop('disabled', true);

  let date;
  if (ind == 1) {
    date = timePicker1.prop('value');
    timeRange1.prop(
      'value',
      Math.floor((new Date(date) - minDate) / (60*60*24*1000)) 
    );
  }
  else {
    date = timePicker2.prop('value');
    timeRange2.prop(
      'value',
      Math.floor((new Date(date) - minDate) / (60*60*24*1000)) 
    );
  }
  $.get(
    "get-data-on-day.php", 
    {"date": date},
    function(response) {
      if (ind == 1) {
        dailyData1 = $.parseJSON(response);
        drawDailyData(surfaceMesh1, dailyData1);
      } else {
        dailyData2 = $.parseJSON(response);
        drawDailyData(surfaceMesh2, dailyData2);
      }
      
      timeRange1.prop('disabled', false);
      timeRange2.prop('disabled', false);
      timePicker1.prop('disabled', false);
      timePicker2.prop('disabled', false);
    }
  );
}

$.get("get-data-intervals.php", function(response) {
  initThree();
  initCheckboxes();

  const json = $.parseJSON(response);
  
  minDate = Date.parse(json.weatherData.minTime);
  maxDate = Date.parse(json.weatherData.maxTime);

  minCameraLon = Number(json.stationData.minLon) - 0.1;
  maxCameraLon = Number(json.stationData.maxLon) + 0.1;
  minCameraLat = Number(json.stationData.minLat) - 0.1;
  maxCameraLat = Number(json.stationData.maxLat) + 0.1;
  
  cameraLon = (minCameraLon + maxCameraLon) / 2.0;
  cameraLat = (minCameraLat + maxCameraLat) / 2.0;
  
  setCameraPos();
  
  maxTemperature = Number(json.weatherData.maxTemperature);
  minTemperature = Number(json.weatherData.minTemperature);
  maxPrecipDaily = Number(json.weatherData.maxPrecipDaily);
  maxSnowDepth = Number(json.weatherData.maxSnowDepth);
  
  $('input:radio[name="view"]').change(function () {
    this.blur();
    
    generateCanvas2DScale(this.value);
    
    drawDailyData(surfaceMesh1, dailyData1);
    drawDailyData(surfaceMesh2, dailyData2);
  });
  
  $('input:radio[name="view"][value="temp"]').prop("checked", true).trigger("change");
  
  timeRange1 = $("#time-range1");
  timePicker1 = $("#datepicker1");
  
  timeRange2 = $('<input type="range" class="slider" id="time-range2">');
  timePicker2 = $('<input type="date" id="datepicker2"></input>');
  
  timeRange1.after(timeRange2);
  timePicker1.after(timePicker2);
  
  timeRange2.hide();
  timePicker2.hide();
  
  const maxVal = Math.floor((maxDate - minDate) / (60*60*24*1000));
  const dateStringMin = 
    (new Date(minDate)).toISOString().substr(0, 10);
  const dateStringMax = 
    (new Date(maxDate)).toISOString().substr(0, 10);
    
  timeRange1.prop('min', 0);
  timeRange1.prop('max', maxVal);
  
  timeRange2.prop('min', 0);
  timeRange2.prop('max', maxVal);

  timePicker1.prop('min', dateStringMin);
  timePicker1.prop('max', dateStringMax);
  timePicker1.prop('value', "1990-08-17");
  
  timePicker2.prop('min', dateStringMin);
  timePicker2.prop('max', dateStringMax);
  timePicker2.prop('value', "1990-08-17");
  
  timeUpdated(1);
  timeUpdated(2);
  
  timeRange1.on("input", function() {
    timePicker1.prop(
      'value', 
      (new Date(minDate + timeRange1.prop('value') * (60*60*24*1000))).toISOString().substr(0, 10)
    );
    timeUpdated(1);
  });
  timeRange2.on("input", function() {
    timePicker2.prop(
      'value', 
      (new Date(minDate + timeRange2.prop('value') * (60*60*24*1000))).toISOString().substr(0, 10)
    );
    timeUpdated(2)
  });
  
  timePicker1.on("input", function() {timeUpdated(1);});
  timePicker2.on("input", function() {timeUpdated(2);});
  
  document.addEventListener('keydown', function(event) {
    if (
      timeRange1.prop('disabled') == false &&
      timeRange2.prop('disabled') == false
    ) {
      const left = event.code == "ArrowLeft";
      const right = event.code == "ArrowRight";

      if (left != right) {
        const time1 = Number(timeRange1.prop('value'));
        const time2 = Number(timeRange2.prop('value'));
      
        if (left) {
          if (time1 > timeRange1.prop('min') + 1) {
            timeRange1.prop('value', time1 - 1);
            timeRange1.trigger('input');
          }
          if (time2 > timeRange1.prop('min') + 1) {
            timeRange2.prop('value', time2 - 1);
            timeRange2.trigger('input');
          }
        } else {
          if (time1 < timeRange1.prop('max') - 1) {
            timeRange1.prop('value', time1 + 1);
            timeRange1.trigger('input');
          }
          if (time2 < timeRange2.prop('max') - 1) {
            timeRange2.prop('value', time2 + 1);
            timeRange2.trigger('input');
          }
        }
      }
    }
  }, false);
  
  $.get("get-stations.php", function(response) {
    let i = 0;
    $.each(response.split("\n"), function() {
      if (this != "")
        addStation($.parseJSON(this), i++);
    });
    
    stationIndices = Object.keys(stations);
    
    animate();
  });
});

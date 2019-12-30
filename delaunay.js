/// constructs a set of triangles based on a set of points
/// see https://www.ti.inf.ethz.ch/ew/Lehre/CG13/lecture/Chapter%206.pdf
/// see https://www.ti.inf.ethz.ch/ew/Lehre/CG13/lecture/Chapter%207.pdf
/// Note that this is a two dimensional delaunay triangulation,
/// so we are using the Equirectangular projection to get 2 dimensional
/// coordinates for the polar points
function delaunay(delaunayData, polarPoint) {
  var triangles = delaunayData.triangles;
  var points = delaunayData.points;
  
  /// this is a directed graph, each node is a triangle
  /// triangle A has triangle B as it's outneighbour if it contains it
  /// (meaning that triangle A was destroyed and replaced with a set
  /// of triangles includig B)
  /// all nodes in this graph will have either 0, 2 or 3 outneighbours
  /// triangles that have 0 outneighbours are the active triangles
  var historyGraph = delaunayData.historyGraph;
  
  /// this is an undirected graph, each node is a triangle
  /// triangles sharing an (geometrical) edge are considered 
  /// adjacent and are connected by an edge in the graph
  /// edges to inactive triangles should be removed from the graph
  var adjacencyGraph = delaunayData.adjacencyGraph;
  
  var polarPointList = delaunayData.polarPointList;
  
  if (points.length == 0) {
    /// "far out" points
    /// triangle 0 (needed for the history graph)
    points.push(
      {"x": -1000, "y": -1000}, 
      {"x":  20000, "y": -1000}, 
      {"x":  -1000,  "y":  20000}
    );
    triangles.push(newTriangle(
      points[0], 
      points[1], 
      points[2], 
      0
    ));

    /// no triangle contains triangle 0 and no triangle is adjacent to it
    historyGraph.push([]);
    adjacencyGraph.push([]);
  }
  
  polarPointList.push(polarPoint);
  
  var cameraLat = 44, minCameraLat = 39, maxCameraLat = 50;
  var cameraLon = 26, minCameraLon = 20, maxCameraLon = 31;
  
  /// gets a position for the point from polar coordinates 
  /// using a basic map projection
  let point = {
    "x": (10000 * (polarPoint.lon - minCameraLon / 180.0 * Math.PI) * Math.cos(polarPoint.lat - minCameraLat / 180.0 * Math.PI)),
    "y": (10000 * (polarPoint.lat - minCameraLat / 180.0 * Math.PI)),
    "id": points.length - 3
  };
  points.push(point);
  
  /// finds the triangle that contains the point, traversing the history graph
  let currentTriangle = triangles[0];
  while (historyGraph[currentTriangle.id].length != 0) {
    let b = true;
    for (let j = 0; j < historyGraph[currentTriangle.id].length; j++) {
      if (contains(triangles[historyGraph[currentTriangle.id][j]], point)) {
        currentTriangle = triangles[historyGraph[currentTriangle.id][j]];
        b = false;
        break;
      }
    }
    
    if (b == true) {
      console.log("no triangle found");
      console.log(point);
      console.log(currentTriangle);
      break;
    }
  }
  
  /// makes three new triangles from currentTriangle and the point that it contains
  let newTriangles = [
    newTriangle(point, currentTriangle.p1, currentTriangle.p2, triangles.length    ),
    newTriangle(point, currentTriangle.p2, currentTriangle.p3, triangles.length + 1),
    newTriangle(point, currentTriangle.p3, currentTriangle.p1, triangles.length + 2)
  ];
  
  const historyGraphSize = historyGraph.length;
  
  /// inserts the edges in the adjacency graph for the new triangles
  /// each new triangle will be adjacent to the others and 
  /// one of the old ones
  for (let j = 0; j <3; j++) {
    triangles.push(newTriangles[j]);
    historyGraph[currentTriangle.id].push(newTriangles[j].id);
    historyGraph.push([]);
    adjacencyGraph.push([]);
    
    /// the other two new triangles
    adjacencyGraph[newTriangles[j].id].push({
      "id": historyGraphSize + (j+1) % 3,
      "edge": {"p1": point, "p2": currentTriangle["p" + (1 + (j+1)%3).toString()]}
    });
    adjacencyGraph[newTriangles[j].id].push({
      "id": historyGraphSize + (j+2) % 3,
      "edge": {"p1": point, "p2": currentTriangle["p" + (j + 1).toString()]}
    });
    
    let oldEdge = {
      "p1": currentTriangle["p" + (1 + (j+1)%3).toString()], 
      "p2": currentTriangle["p" + (j + 1).toString()]
    };

    /// searches the old triangle that the new one is adjacent to
    /// and updates the adjacency graph
    /// also removes the edge between the destroyed triangle and old triangle found
    let b = false;
    
    for (var k = 0; k < adjacencyGraph[currentTriangle.id].length; k++) {
      const oldTriangleIndex = adjacencyGraph[currentTriangle.id][k].id;
      if (
        historyGraph[oldTriangleIndex].length == 0 && 
        hasEdge(triangles[oldTriangleIndex], oldEdge)
      ) {
        /// removes the current triangle from the adjacencies of the old triangle
        let index = -1;
        for (let l = 0; l < adjacencyGraph[oldTriangleIndex].length; l++)
          if (adjacencyGraph[oldTriangleIndex][l].id == currentTriangle.id)
            index = l;
        adjacencyGraph[oldTriangleIndex].splice(index, 1);
        
        /// adds the old triangle to the adjacencies of the new triangle
        adjacencyGraph[newTriangles[j].id].push({"id": oldTriangleIndex, "edge": oldEdge});
        
        /// adds the new triangle to the adjacencies of the old triangle
        adjacencyGraph[oldTriangleIndex].push({"id": newTriangles[j].id, "edge": oldEdge});
    
        b = true;
        break;
      }
    }
    if (!b) console.log("neighbour not found!");
  }
  
  /// Checks the triangles in the list and flips them if needed
  /// note that an edge is also provided
  let triangleFlipList = [];

  /// adds the new triangles
  for (let j = 0; j <3; j++) {
    /// the no. 2 neighbour of each new triangle will be the old triangle
    if (adjacencyGraph[newTriangles[j].id].length > 2) {
      triangleFlipList.push({
        "triangle1": newTriangles[j], 
        "triangle2": triangles[adjacencyGraph[newTriangles[j].id][2].id]
      });
    }
  }
  
  while (triangleFlipList.length != 0) {
    let triangle1 = triangleFlipList[0].triangle1;
    let triangle2 = triangleFlipList[0].triangle2;
    
    let b = null, c = null;
    for (var j = 0; j < adjacencyGraph[triangle1.id].length; j++) {
      if (adjacencyGraph[triangle1.id][j].id == triangle2.id) {
        b = adjacencyGraph[triangle1.id][j].edge.p1;
        c = adjacencyGraph[triangle1.id][j].edge.p2;
        break;
      } 
    }
    
    if (b == null || c == null)
      console.log("bug");

    if (triangle1.p1 != b && triangle1.p1 != c) a = triangle1.p1;
    else if (triangle1.p2 != b && triangle1.p2 != c) a = triangle1.p2;
    else if (triangle1.p3 != b && triangle1.p3 != c) a = triangle1.p3;
    
    if (triangle2.p1 != b && triangle2.p1 != c) d = triangle2.p1;
    else if (triangle2.p2 != b && triangle2.p2 != c) d = triangle2.p2;
    else if (triangle2.p3 != b && triangle2.p3 != c) d = triangle2.p3;
    
    if (
      isConvex(a, b, c, d) && 
      violatesCircumcircleProperty(a, triangle2)
    ) {
      let flippedTriangle1 = newTriangle(a, b, d, triangles.length);
      let flippedTriangle2 = newTriangle(a, c, d, triangles.length+1);
      
      triangles.push(flippedTriangle1);
      triangles.push(flippedTriangle2);
      
      historyGraph[triangle1.id].push(flippedTriangle1.id);
      historyGraph[triangle2.id].push(flippedTriangle1.id);
      historyGraph.push([]);
      
      historyGraph[triangle1.id].push(flippedTriangle2.id);
      historyGraph[triangle2.id].push(flippedTriangle2.id);
      historyGraph.push([]);
      
      /// flippedTriangle1 is adjacent to flippedTriangle2
      adjacencyGraph.push([
        {"id": flippedTriangle2.id, "edge": {"p1": a, "p2": d}}
      ]);
      
      /// flippedTriangle2 is adjacent to flippedTriangle1
      adjacencyGraph.push([
        {"id": flippedTriangle1.id, "edge": {"p1": a, "p2": d}},
      ]);
      
      for (let j = 0; j < adjacencyGraph[triangle1.id].length; j++) {
        if (historyGraph[adjacencyGraph[triangle1.id][j].id].length == 0) {
          if (
            hasPoint(triangles[adjacencyGraph[triangle1.id][j].id], a) &&
            hasPoint(triangles[adjacencyGraph[triangle1.id][j].id], b)
          ) {
            let abNeighbour = adjacencyGraph[triangle1.id][j].id;
            adjacencyGraph[flippedTriangle1.id].push(
              {"id": abNeighbour, "edge": {"p1": a, "p2": b}}
            );
            
            let index = -1;
            for (let l = 0; l < adjacencyGraph[abNeighbour].length; l++)
              if (adjacencyGraph[abNeighbour][l].id == triangle1.id)
                index = l;
            adjacencyGraph[abNeighbour].splice(index, 1);
            
            adjacencyGraph[abNeighbour].push(
              {"id": flippedTriangle1.id, "edge": {"p1": a, "p2": b}}
            );
          } else if (
            hasPoint(triangles[adjacencyGraph[triangle1.id][j].id], a) &&
            hasPoint(triangles[adjacencyGraph[triangle1.id][j].id], c)
          ) {
            let acNeighbour = adjacencyGraph[triangle1.id][j].id;
            adjacencyGraph[flippedTriangle2.id].push(
              {"id": acNeighbour, "edge": {"p1": a, "p2": c}}
            );
            
            let index = -1;
            for (let l = 0; l < adjacencyGraph[acNeighbour].length; l++)
              if (adjacencyGraph[acNeighbour][l].id == triangle1.id)
                index = l;
            adjacencyGraph[acNeighbour].splice(index, 1);
            
            adjacencyGraph[acNeighbour].push(
              {"id": flippedTriangle2.id, "edge": {"p1": a, "p2": c}}
            );
          }
        } 
      }
      
      for (let j = 0; j < adjacencyGraph[triangle2.id].length; j++) {
        if (historyGraph[adjacencyGraph[triangle2.id][j].id].length == 0) {
          if (
            hasPoint(triangles[adjacencyGraph[triangle2.id][j].id], d) &&
            hasPoint(triangles[adjacencyGraph[triangle2.id][j].id], b)
          ) {
            let bdNeighbour = adjacencyGraph[triangle2.id][j].id;
            
            adjacencyGraph[flippedTriangle1.id].push(
              {"id": bdNeighbour, "edge": {"p1": b, "p2": d}}
            );
            triangleFlipList.push({"triangle1": flippedTriangle1, "triangle2": triangles[bdNeighbour]});
            
            let index = -1;
            for (let l = 0; l < adjacencyGraph[bdNeighbour].length; l++)
              if (adjacencyGraph[bdNeighbour][l].id == triangle2.id)
                index = l;
            adjacencyGraph[bdNeighbour].splice(index, 1);
            
            adjacencyGraph[bdNeighbour].push(
              {"id": flippedTriangle1.id, "edge": {"p1": d, "p2": b}}
            );
          } else if (
              hasPoint(triangles[adjacencyGraph[triangle2.id][j].id], d) &&
              hasPoint(triangles[adjacencyGraph[triangle2.id][j].id], c)
          ) {
            cdNeighbour = adjacencyGraph[triangle2.id][j].id;
            
            adjacencyGraph[flippedTriangle2.id].push(
              {"id": cdNeighbour, "edge": {"p1": c, "p2": d}}
            );
            triangleFlipList.push({"triangle1": flippedTriangle2, "triangle2": triangles[cdNeighbour]});
            
            let index = -1;
            for (let l = 0; l < adjacencyGraph[cdNeighbour].length; l++)
              if (adjacencyGraph[cdNeighbour][l].id == triangle2.id)
                index = l;
            adjacencyGraph[cdNeighbour].splice(index, 1);
            
            adjacencyGraph[cdNeighbour].push(
              {"id": flippedTriangle2.id, "edge": {"p1": c, "p2": d}}
            );
          }
        }
      }
    }
    triangleFlipList.shift();
  }
  
  
  retList = [];
  
  for (let i = 0; i < triangles.length; i++) {
    if (
      historyGraph[i].length == 0 &&
      triangles[i].isBorder == false
    ) {
      if (ccw(triangles[i])) {
        retList.push(newTriangle(
          polarPointList[triangles[i].p1.id],
          polarPointList[triangles[i].p2.id],
          polarPointList[triangles[i].p3.id],
          i
        ));
        
      } else {
        retList.push(newTriangle(
          polarPointList[triangles[i].p1.id],
          polarPointList[triangles[i].p3.id],
          polarPointList[triangles[i].p2.id],
          i
        ));
      }
    }
  }
  
  return {
    "drawTriangles": retList,
    "polarPointList": polarPointList,
    "triangles": triangles,
    "points": points,
    "historyGraph": historyGraph,
    "adjacencyGraph": adjacencyGraph
  };
}

function newTriangle(p1, p2, p3, id) {
  let isBorder = false;
  if (p1.id == undefined || p2.id == undefined || p3.id == undefined)
    isBorder = true;
  return {
    "p1": p1,
    "p2": p2,
    "p3": p3,
    "id": id,
    "isBorder": isBorder
  };
}

function pyth2(p1, p2) {
  return (p1.x - p2.x) * (p1.x - p2.x) + (p1.y - p2.y) * (p1.y - p2.y);
}

function contains(triangle, point) {
  const p0x = triangle.p1.x;
  const p0y = triangle.p1.y;
  const p1x = triangle.p2.x;
  const p1y = triangle.p2.y;
  const p2x = triangle.p3.x;
  const p2y = triangle.p3.y;
  const px = point.x;
  const py = point.y;
  
  const area = 0.5 *(-p1y*p2x + p0y*(-p1x + p2x) + p0x*(p1y - p2y) + p1x*p2y);
  
  const s = 1/(2*area)*(p0y*p2x - p0x*p2y + (p2y - p0y)*px + (p0x - p2x)*py);
  const t = 1/(2*area)*(p0x*p1y - p0y*p1x + (p0y - p1y)*px + (p1x - p0x)*py);
  
  return (s >= 0 && t >= 0 && 1-s-t >= 0);
}

function violatesCircumcircleProperty(point, triangle) {
  const d = 2 * (
    triangle.p1.x * (triangle.p2.y - triangle.p3.y) +
    triangle.p2.x * (triangle.p3.y - triangle.p1.y) +
    triangle.p3.x * (triangle.p1.y - triangle.p2.y)
  );
  
  const ax2 = triangle.p1.x * triangle.p1.x;
  const ay2 = triangle.p1.y * triangle.p1.y;
  
  const bx2 = triangle.p2.x * triangle.p2.x;
  const by2 = triangle.p2.y * triangle.p2.y;
  
  const cx2 = triangle.p3.x * triangle.p3.x;
  const cy2 = triangle.p3.y * triangle.p3.y;
  
  const ux = (
    (ax2 + ay2) * (triangle.p2.y - triangle.p3.y) +
    (bx2 + by2) * (triangle.p3.y - triangle.p1.y) +
    (cx2 + cy2) * (triangle.p1.y - triangle.p2.y)
  ) / d;
    
  const uy = (
    (ax2 + ay2) * (triangle.p3.x - triangle.p2.x) +
    (bx2 + by2) * (triangle.p1.x - triangle.p3.x) +
    (cx2 + cy2) * (triangle.p2.x - triangle.p1.x)
  ) / d;
  
  const r2 = 
    (triangle.p1.x - ux) * (triangle.p1.x - ux) +
    (triangle.p1.y - uy) * (triangle.p1.y - uy);
  
  const d2 = 
    (point.x - ux) * (point.x - ux) +
    (point.y - uy) * (point.y - uy);
    
  return d2 < r2;
}

/// returns true if the order of points in the triangle is counter-clockwise
function ccw(triangle) {
  let ret = 
    (triangle.p2.x - triangle.p1.x) * (triangle.p3.y - triangle.p1.y) -
    (triangle.p3.x - triangle.p1.x) * (triangle.p2.y - triangle.p1.y)
    > 0;
  
  return ret;
}

function hasPoint(triangle, point) {
  return (
    (triangle.p1.x == point.x && triangle.p1.y == point.y) ||
    (triangle.p2.x == point.x && triangle.p2.y == point.y) ||
    (triangle.p3.x == point.x && triangle.p3.y == point.y) 
  );
}

function hasEdge(triangle, edge) {
  return hasPoint(triangle, edge.p1) && hasPoint(triangle, edge.p2);
}

function isConvex(a, b, c, d) {
  const triangle1 = newTriangle(a, b, d);
  const triangle2 = newTriangle(a, c, d);
  
  if (contains(triangle1, c) || contains(triangle2, b))
    return false;
  else
    return true;
}

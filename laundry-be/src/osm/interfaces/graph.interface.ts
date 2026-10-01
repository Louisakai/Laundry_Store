export interface LatLng {
  lat: number;
  lng: number;
}

export interface GraphNode {
  id: number;
  lat: number;
  lng: number;
}

export interface GraphEdge {
  fromId: number;
  toId: number;
  weight: number;
}

export interface GraphData {
  adjacencyList: Map<number, { nodeId: number; weight: number }[]>;
  nodes: Map<number, GraphNode>;
}

export interface ShortestPathResult {
  path: LatLng[];
  distance: number;
  visitedNodes: number;
  executionTimeMs: number;
  algorithm: 'dijkstra';
}

export interface RouteLeg {
  fromIdx: number;
  toIdx: number;
  path: LatLng[];
  distance: number;
  source: 'dijkstra';
}

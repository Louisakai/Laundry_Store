import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { XMLParser } from 'fast-xml-parser';
import { GraphData, GraphNode, ShortestPathResult, LatLng } from './interfaces/graph.interface';

@Injectable()
export class OsmService implements OnModuleInit {
  private readonly logger = new Logger(OsmService.name);
  private graph: GraphData | null = null;
  private graphReady = false;
  private osmFilePath: string;

  constructor() {
    this.osmFilePath = path.join(__dirname, 'data', 'cantho.osm');
    const altPath = path.join(process.cwd(), 'src', 'osm', 'data', 'cantho.osm');
    if (fs.existsSync(altPath)) {
      this.osmFilePath = altPath;
    }
  }

  async onModuleInit() {
    await this.loadGraph();
  }

  isReady(): boolean {
    return this.graphReady;
  }

  private async loadGraph(): Promise<void> {
    try {
      if (!fs.existsSync(this.osmFilePath)) {
        this.logger.warn(`OSM file not found at ${this.osmFilePath}. Graph will not be available.`);
        return;
      }

      this.logger.log(`Loading OSM data from ${this.osmFilePath}...`);
      const xmlContent = fs.readFileSync(this.osmFilePath, 'utf-8');
      this.graph = this.buildGraph(xmlContent);
      this.graphReady = true;
      this.logger.log(`Graph loaded: ${this.graph.nodes.size} nodes`);
    } catch (err) {
      this.logger.error('Failed to load OSM graph', err);
    }
  }

  private buildGraph(xmlContent: string): GraphData {
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      isArray: (name) => name === 'node' || name === 'way' || name === 'nd' || name === 'tag',
    });

    const parsed = parser.parse(xmlContent);
    const osm = parsed.osm || {};

    const nodes = new Map<number, GraphNode>();
    const adjacencyList = new Map<number, { nodeId: number; weight: number }[]>();

    if (osm.node) {
      for (const n of osm.node) {
        const id = Number(n['@_id']);
        nodes.set(id, {
          id,
          lat: Number(n['@_lat']),
          lng: Number(n['@_lon']),
        });
      }
    }

    const ways = osm.way || [];
    let edgeCount = 0;

    for (const way of ways) {
      const tags = way.tag || [];
      const hasHighway = tags.some((t: any) => t['@_k'] === 'highway');
      if (!hasHighway) continue;

      const nds = way.nd || [];
      const nodeRefs: number[] = nds.map((nd: any) => Number(nd['@_ref']));

      for (let i = 0; i < nodeRefs.length - 1; i++) {
        const from = nodeRefs[i];
        const to = nodeRefs[i + 1];

        const fromNode = nodes.get(from);
        const toNode = nodes.get(to);
        if (!fromNode || !toNode) continue;

        const weight = this.haversine(fromNode.lat, fromNode.lng, toNode.lat, toNode.lng);

        if (!adjacencyList.has(from)) adjacencyList.set(from, []);
        if (!adjacencyList.has(to)) adjacencyList.set(to, []);
        adjacencyList.get(from)!.push({ nodeId: to, weight });
        adjacencyList.get(to)!.push({ nodeId: from, weight });
        edgeCount++;
      }
    }

    this.logger.log(`Graph built: ${nodes.size} nodes, ${edgeCount} edges`);
    return { adjacencyList, nodes };
  }

  private haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371;
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  private findNearestNode(lat: number, lng: number): GraphNode | null {
    const { nodes } = this.graph!;
    let nearest: GraphNode | null = null;
    let minDist = Infinity;

    for (const node of nodes.values()) {
      const dist = this.haversine(lat, lng, node.lat, node.lng);
      if (dist < minDist) {
        minDist = dist;
        nearest = node;
      }
    }

    return nearest;
  }

  findShortestPath(from: LatLng, to: LatLng): ShortestPathResult | null {
    if (!this.graphReady || !this.graph) return null;

    const startTime = Date.now();

    const fromNode = this.findNearestNode(from.lat, from.lng);
    const toNode = this.findNearestNode(to.lat, to.lng);

    if (!fromNode || !toNode) return null;

    const { adjacencyList, nodes } = this.graph;
    const startId = fromNode.id;
    const targetId = toNode.id;

    if (startId === targetId) {
      return {
        path: [from, to],
        distance: 0,
        visitedNodes: 0,
        executionTimeMs: Date.now() - startTime,
        algorithm: 'dijkstra',
      };
    }

    const distances = new Map<number, number>();
    const previous = new Map<number, number | null>();
    const visited = new Set<number>();
    const priorityQueue: { nodeId: number; dist: number }[] = [];

    distances.set(startId, 0);
    priorityQueue.push({ nodeId: startId, dist: 0 });

    while (priorityQueue.length > 0) {
      priorityQueue.sort((a, b) => a.dist - b.dist);
      const current = priorityQueue.shift()!;
      const currentId = current.nodeId;

      if (visited.has(currentId)) continue;
      visited.add(currentId);

      if (currentId === targetId) break;

      const neighbors = adjacencyList.get(currentId);
      if (!neighbors) continue;

      for (const neighbor of neighbors) {
        if (visited.has(neighbor.nodeId)) continue;

        const newDist = distances.get(currentId)! + neighbor.weight;

        if (!distances.has(neighbor.nodeId) || newDist < distances.get(neighbor.nodeId)!) {
          distances.set(neighbor.nodeId, newDist);
          previous.set(neighbor.nodeId, currentId);
          priorityQueue.push({ nodeId: neighbor.nodeId, dist: newDist });
        }
      }
    }

    if (!previous.has(targetId)) return null;

    const pathIds: number[] = [];
    let current: number | null = targetId;
    while (current !== null) {
      pathIds.unshift(current);
      current = previous.get(current) ?? null;
    }

    const path: LatLng[] = pathIds.map((id) => {
      const node = nodes.get(id)!;
      return { lat: node.lat, lng: node.lng };
    });

    path[0] = from;
    path[path.length - 1] = to;

    return {
      path,
      distance: Math.round(distances.get(targetId)! * 100) / 100,
      visitedNodes: visited.size,
      executionTimeMs: Date.now() - startTime,
      algorithm: 'dijkstra',
    };
  }

  getGraphStats(): { nodes: number; ready: boolean } {
    return {
      nodes: this.graph?.nodes.size ?? 0,
      ready: this.graphReady,
    };
  }
}

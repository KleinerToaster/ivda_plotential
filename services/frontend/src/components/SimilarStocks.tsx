import React, { useMemo, useState } from "react";
import {
  Box,
  Paper,
  ToggleButtonGroup,
  ToggleButton,
  Typography,
} from "@mui/material";
import Plot from "react-plotly.js";
import rawStockData from "../stock_data.json";
import sectorColorConfig from "../sectorColors.json";
import sectorOrderConfig from "../sectorOrder.json";

interface CombinedStock {
  isin: string;
  name: string;
  country: string;
  marketCapEUR: number;
  sectors: Record<string, number>;
  industryGroups: Record<string, number>;
  topIndustryGroup?: string | null;
  topIndustryGroupWeight?: number;
}

interface Node {
  id: string;
  label: string;
  isFocal: boolean;
  x: number;
  y: number;
}

interface Edge {
  source: string;
  target: string;
  weight: number;
}

// Seeded random number generator (mulberry32)
const seededRandom = (seed: number) => {
  return () => {
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const runLayout = (nodesIn: Node[], edges: Edge[], seed: number = 123, iterations = 500, coolingRate = 1.0): Node[] => {
  if (nodesIn.length === 0) return [];

  const nodes = nodesIn.map((n) => ({ ...n }));
  const rng = seededRandom(seed);

  nodes.forEach((n, i) => {
    if (n.x === 0 && n.y === 0 && !n.isFocal) {
      // Use seeded random for initial positions
      n.x = rng() * 0.2 - 0.1;
      n.y = rng() * 0.2 - 0.1;
    }
  });

  const idToIdx: Record<string, number> = {};
  nodes.forEach((n, i) => {
    idToIdx[n.id] = i;
  });

  const numNodes = nodes.length;
  // R's igraph FR algorithm scales with sqrt(n)
  const area = numNodes * numNodes;
  const k = Math.sqrt(area / numNodes);
  
  // Repulsive force constant
  const kRep = k * k;
  
  for (let iter = 0; iter < iterations; iter++) {
    // Temperature cooling schedule (like R's FR)
    const temp = Math.max(0.01, (1 - iter / iterations) * k * coolingRate);
    
    const forces: { fx: number; fy: number }[] = nodes.map(() => ({
      fx: 0,
      fy: 0,
    }));

    // Repulsive forces between all pairs
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[j].x - nodes[i].x;
        const dy = nodes[j].y - nodes[i].y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 0.001;
        const force = kRep / dist;
        const fx = (force * dx) / dist;
        const fy = (force * dy) / dist;
        forces[i].fx -= fx;
        forces[i].fy -= fy;
        forces[j].fx += fx;
        forces[j].fy += fy;
      }
    }

    // Attractive forces along edges
    // R's igraph uses edge weights to scale the spring force
    edges.forEach((e) => {
      const i = idToIdx[e.source];
      const j = idToIdx[e.target];
      const dx = nodes[j].x - nodes[i].x;
      const dy = nodes[j].y - nodes[i].y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 0.001;

      // Weight scales the attractive force (higher similarity = stronger pull)
      const force = (dist * dist / k) * e.weight;
      const fx = (force * dx) / dist;
      const fy = (force * dy) / dist;

      forces[i].fx += fx;
      forces[i].fy += fy;
      forces[j].fx -= fx;
      forces[j].fy -= fy;
    });

    // Update positions with temperature-based step size
    nodes.forEach((n, i) => {
      const disp = Math.sqrt(forces[i].fx * forces[i].fx + forces[i].fy * forces[i].fy) || 0.001;
      const damp = n.isFocal ? 0.05 : 1.0;  // Keep focal node more stable
      const delta = Math.min(disp, temp) / disp;
      n.x += forces[i].fx * delta * damp;
      n.y += forces[i].fy * delta * damp;
    });
  }

  let minX = Infinity,
    maxX = -Infinity,
    minY = Infinity,
    maxY = -Infinity;
  nodes.forEach((n) => {
    if (n.x < minX) minX = n.x;
    if (n.x > maxX) maxX = n.x;
    if (n.y < minY) minY = n.y;
    if (n.y > maxY) maxY = n.y;
  });
  const rangeX = maxX - minX || 1;
  const rangeY = maxY - minY || 1;

  nodes.forEach((n) => {
    n.x = ((n.x - minX) / rangeX) * 2 - 1;
    n.y = ((n.y - minY) / rangeY) * 2 - 1;
  });

  return nodes;
};

interface SimilarStocksProps {
  selectedStockIsin: string;
  onStockSelect: (isin: string) => void;
  featureType: "both" | "sectors" | "industryGroups";
  k: number;
  kPeer: number;
  iterations: number;
  coolingRate: number;
}

const SimilarStocks: React.FC<SimilarStocksProps> = ({ 
  selectedStockIsin, 
  onStockSelect,
  featureType,
  k,
  kPeer,
  iterations,
  coolingRate
}) => {
  const stocks = rawStockData as unknown as CombinedStock[];

  const sectorKeys = useMemo(() => {
    const set = new Set<string>();
    stocks.forEach((s) =>
      Object.keys(s.sectors || {}).forEach((k) => set.add(k))
    );
    return Array.from(set).sort();
  }, [stocks]);

  const igKeys = useMemo(() => {
    const set = new Set<string>();
    stocks.forEach((s) =>
      Object.keys(s.industryGroups || {}).forEach((k) => set.add(k))
    );
    return Array.from(set).sort();
  }, [stocks]);

  const featKeys = useMemo(
    () => [...sectorKeys, ...igKeys],
    [sectorKeys, igKeys]
  );

  const focal = selectedStockIsin || stocks[0]?.isin || "";
  const [viewMode, setViewMode] = useState<"network" | "barchart">("network");
  const [colorMode, setColorMode] = useState<"color" | "gray">("gray");

  const vecs = useMemo(() => {
    const map: Record<string, number[]> = {};
    stocks.forEach((s) => {
      const v: number[] = [];
      
      if (featureType === "both") {
        featKeys.forEach((key) => {
          const val =
            s.sectors[key] ??
            s.industryGroups[key] ??
            0;
          v.push(val);
        });
      } else if (featureType === "sectors") {
        sectorKeys.forEach((key) => {
          v.push(s.sectors[key] ?? 0);
        });
      } else if (featureType === "industryGroups") {
        igKeys.forEach((key) => {
          v.push(s.industryGroups[key] ?? 0);
        });
      }
      
      map[s.isin] = v;
    });
    return map;
  }, [stocks, featKeys, sectorKeys, igKeys, featureType]);

  const focalStock =
    stocks.find((s) => s.isin === focal) ?? stocks[0];

  const cosineSim = (a: number[], b: number[]): number => {
    let dot = 0;
    let na = 0;
    let nb = 0;
    for (let i = 0; i < a.length; i++) {
      const va = a[i] ?? 0;
      const vb = b[i] ?? 0;
      dot += va * vb;
      na += va * va;
      nb += vb * vb;
    }
    if (na === 0 || nb === 0) return 0;
    return dot / (Math.sqrt(na) * Math.sqrt(nb));
  };

  const nbrs = useMemo(() => {
    const fv = vecs[focal];
    if (!fv) return [];

    const sims: { stock: CombinedStock; sim: number }[] = [];

    stocks.forEach((s) => {
      if (s.isin === focal) return;
      const v = vecs[s.isin];
      if (!v) return;
      const sim = cosineSim(fv, v);
      if (!isNaN(sim)) {
        sims.push({ stock: s, sim });
      }
    });

    sims.sort((a, b) => b.sim - a.sim);

    return sims.slice(0, k);
  }, [focal, k, vecs, stocks]);

  const getDominantSector = (stock: CombinedStock): string => {
    const sectors = stock.sectors || {};
    let maxWeight = -1;
    let dominant = "";
    Object.entries(sectors).forEach(([sector, weight]) => {
      if (weight > maxWeight) {
        maxWeight = weight;
        dominant = sector;
      }
    });
    return dominant || "Unknown";
  };

  const { layoutNodes, layoutEdges } = useMemo(() => {
    if (!focalStock) return { layoutNodes: [] as Node[], layoutEdges: [] as Edge[] };

    const nodes: Node[] = [];
    const neighborIsins = nbrs.map(n => n.stock.isin);
    
    // Add focal node
    nodes.push({
      id: focalStock.isin,
      label: focalStock.isin,
      isFocal: true,
      x: 0,
      y: 0,
    });

    // Add all k neighbors
    // Create seed from sorted ISINs for reproducibility
    const nodeISINs = [focalStock.isin, ...nbrs.map((n) => n.stock.isin)].sort();
    const seedStr = nodeISINs.join("");
    let graphSeed = 123;
    for (let i = 0; i < seedStr.length; i++) {
      graphSeed = ((graphSeed << 5) - graphSeed + seedStr.charCodeAt(i)) | 0;
    }
    
    nbrs.forEach((n) => {
      nodes.push({
        id: n.stock.isin,
        label: n.stock.isin,
        isFocal: false,
        x: 0,
        y: 0,
      });
    });

    // Edge list: focal -> neighbors (star edges)
    const edgeMap = new Map<string, number>();
    
    nbrs.forEach((n) => {
      const key = [focalStock.isin, n.stock.isin].sort().join("|");
      edgeMap.set(key, n.sim);
    });

    // Peer-to-peer edges: for each neighbor, connect to its top k_peer peers
    if (kPeer > 0 && nbrs.length > 1) {
      nbrs.forEach((neighbor) => {
        const neighborVec = vecs[neighbor.stock.isin];
        if (!neighborVec) return;
        
        // Calculate similarity to all other neighbors
        const peerSims: { isin: string; sim: number }[] = [];
        nbrs.forEach((other) => {
          if (other.stock.isin === neighbor.stock.isin) return;
          const otherVec = vecs[other.stock.isin];
          if (!otherVec) return;
          const sim = cosineSim(neighborVec, otherVec);
          if (!isNaN(sim)) {
            peerSims.push({ isin: other.stock.isin, sim });
          }
        });
        
        // Sort by similarity and take top k_peer
        peerSims.sort((a, b) => b.sim - a.sim);
        const topPeers = peerSims.slice(0, Math.min(kPeer, peerSims.length));
        
        // Add edges to top peers
        topPeers.forEach((peer) => {
          const key = [neighbor.stock.isin, peer.isin].sort().join("|");
          const existing = edgeMap.get(key);
          // Keep max weight for deduplicated edges
          if (existing === undefined || peer.sim > existing) {
            edgeMap.set(key, peer.sim);
          }
        });
      });
    }

    // Convert edge map to edge list
    const edges: Edge[] = [];
    edgeMap.forEach((weight, key) => {
      const [source, target] = key.split("|");
      edges.push({ source, target, weight });
    });

    // Use Fruchterman-Reingold layout with deterministic seed
    const laidOut = runLayout(nodes, edges, graphSeed, iterations, coolingRate);
    return { layoutNodes: laidOut, layoutEdges: edges };
  }, [focalStock, nbrs, vecs, kPeer, iterations, coolingRate]);

  // Create a stable color mapping for ALL sectors in the dataset (not just current graph)
  // Ordered by average sector weight across all firms (highest to lowest)
  const allSectorColorMap = useMemo(() => {
    const orderedSectors = sectorOrderConfig.orderedSectors;
    const distinctColors = colorMode === "color" ? sectorColorConfig.palette : [
      "#404040", "#505050", "#606060", "#707070", "#808080",
      "#909090", "#a0a0a0", "#b0b0b0", "#c0c0c0", "#d0d0d0", "#e0e0e0"
    ];
    
    const map: Record<string, string> = {};
    orderedSectors.forEach((sector, i) => {
      map[sector] = distinctColors[i % distinctColors.length];
    });
    
    return map;
  }, [colorMode]);

  const allSectorsForLegend = useMemo(() => {
    // Show all sectors in the dataset, ordered by the predefined sector order
    return sectorOrderConfig.orderedSectors;
  }, []);

  const xs = layoutNodes.map((n) => n.x);
  const ys = layoutNodes.map((n) => n.y);
  const labels = layoutNodes.map((n) => {
    const stock = stocks.find((s) => s.isin === n.id);
    return stock?.name || n.label;
  });
  
  const colors = layoutNodes.map((n) => {
    if (n.isFocal) return colorMode === "color" ? "firebrick" : "#303030";
    const stock = stocks.find((s) => s.isin === n.id);
    if (!stock) return "grey";
    const sector = getDominantSector(stock);
    return allSectorColorMap[sector] || "grey";
  });
  
  const sizes = useMemo(() => {
    // Calculate sizes based on market cap of nodes in the graph only (matching R)
    const logMcaps = layoutNodes.map((n) => {
      const stock = stocks.find((s) => s.isin === n.id);
      if (!stock) return 0;
      return Math.log1p(stock.marketCapEUR || 0);
    });
    
    const minLog = Math.min(...logMcaps);
    const maxLog = Math.max(...logMcaps);
    const range = maxLog - minLog;
    
    return layoutNodes.map((n, i) => {
      const logMcap = logMcaps[i];
      // Scale to [6, 18] range like R
      const minSize = 6;
      const maxSize = 18;
      const size = range > 0 ? minSize + ((logMcap - minLog) / range) * (maxSize - minSize) : 10;
      // Ensure focal is at least 16
      return n.isFocal ? Math.max(size, 16) : size;
    });
  }, [layoutNodes, stocks]);

  const edgeTraces = layoutEdges
    .map((e) => {
      const src = layoutNodes.find((n) => n.id === e.source);
      const tgt = layoutNodes.find((n) => n.id === e.target);
      if (!src || !tgt) return null;
      
      const width = Math.max(0.5, e.weight * 1.5);

      return {
        x: [src.x, tgt.x],
        y: [src.y, tgt.y],
        mode: "lines",
        type: "scatter",
        line: { width, color: "rgba(150, 150, 150, 0.4)" },
        hovertemplate: `similarity = ${e.weight.toFixed(4)}<extra></extra>`,
        showlegend: false,
      } as any;
    })
    .filter(Boolean);

  // Create pie chart shapes for each node using filled polygons
  const pieTraces = useMemo(() => {
    const shapes: any[] = [];
    
    layoutNodes.forEach((node) => {
      const stock = stocks.find((s) => s.isin === node.id);
      if (!stock) return;

      const sectors = stock.sectors || {};
      const sectorEntries = Object.entries(sectors)
        .filter(([_, weight]) => weight > 0)
        .sort((a, b) => b[1] - a[1]);

      if (sectorEntries.length === 0) return;

      const total = sectorEntries.reduce((sum, [_, w]) => sum + w, 0);
      let currentAngle = -90; // Start from top
      const pieSize = 0.08; // Radius in data coordinates
      const centerX = node.x;
      const centerY = node.y;

      sectorEntries.forEach(([sectorName, weight]) => {
        const fraction = weight / total;
        const startAngle = currentAngle;
        const endAngle = currentAngle + fraction * 360;

        // Create filled polygon for pie slice using many points to approximate arc
        const numPoints = Math.max(3, Math.ceil(fraction * 50)); // More points for larger slices
        const points: { x: number; y: number }[] = [{ x: centerX, y: centerY }]; // Start at center

        for (let i = 0; i <= numPoints; i++) {
          const angle = (startAngle + (endAngle - startAngle) * i / numPoints) * Math.PI / 180;
          const x = centerX + pieSize * Math.cos(angle);
          const y = centerY + pieSize * Math.sin(angle);
          points.push({ x, y });
        }

        // Close the path back to center
        points.push({ x: centerX, y: centerY });

        // Create shape as filled polygon
        shapes.push({
          type: 'path',
          path: `M ${points.map(p => `${p.x},${p.y}`).join(' L ')} Z`,
          fillcolor: allSectorColorMap[sectorName] || '#cccccc',
          line: {
            color: '#ffffff',
            width: 0.5
          },
          opacity: 1,
          xref: 'x',
          yref: 'y',
          label: stock.name,
          hoverinfo: 'text',
          hovertext: stock.name
        });

        currentAngle = endAngle;
      });

      // Add circle border around the entire pie chart
      shapes.push({
        type: 'circle',
        xref: 'x',
        yref: 'y',
        x0: centerX - pieSize,
        y0: centerY - pieSize,
        x1: centerX + pieSize,
        y1: centerY + pieSize,
        line: {
          color: node.isFocal ? 'firebrick' : '#333333',
          width: node.isFocal ? 4 : 1.5
        },
        fillcolor: 'rgba(0,0,0,0)',
        label: stock.name,
        hoverinfo: 'text',
        hovertext: stock.name
      });
    });

    return shapes;
  }, [layoutNodes, stocks, allSectorColorMap, colorMode]);

  // Create legend traces for all sectors in the dataset
  const legendTraces = useMemo(() => {
    return allSectorsForLegend.map((sector) => ({
      x: [null],
      y: [null],
      mode: "markers",
      type: "scatter",
      name: sector,
      marker: {
        size: 10,
        color: allSectorColorMap[sector] || "grey",
        line: { width: 1.5, color: "#333333" },
      },
      showlegend: true,
    } as any));
  }, [allSectorsForLegend, allSectorColorMap]);

  return (
    <Box sx={{ mt: 2 }}>
      <Paper variant="outlined" sx={{ p: 1 }}>
        <Box sx={{ display: "flex", gap: 2, alignItems: "flex-start" }}>
          {/* Left column: buttons and legend */}
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {/* Toggle buttons */}
            <Box sx={{ display: "flex", gap: 1 }}>
              {/* Color mode toggle */}
              <ToggleButtonGroup
                exclusive
                size="small"
                value={colorMode}
                onChange={(_, val) => val && setColorMode(val as "color" | "gray")}
                orientation="vertical"
                sx={{ 
                  '& .MuiToggleButton-root': {
                    py: 0.4,
                    px: 1,
                    fontSize: "0.7rem",
                    lineHeight: 1.2,
                  }
                }}
              >
                <ToggleButton value="color">Color</ToggleButton>
                <ToggleButton value="gray">Grayscale</ToggleButton>
              </ToggleButtonGroup>

              {/* View mode toggle */}
              <ToggleButtonGroup
                exclusive
                size="small"
                value={viewMode}
                onChange={(_, val) => val && setViewMode(val as "network" | "barchart")}
                orientation="vertical"
                sx={{ 
                  '& .MuiToggleButton-root': {
                    py: 0.4,
                    px: 1,
                    fontSize: "0.7rem",
                    lineHeight: 1.2,
                  }
                }}
              >
                <ToggleButton value="network">Network View</ToggleButton>
                <ToggleButton value="barchart">Top 10 Sector Weights</ToggleButton>
              </ToggleButtonGroup>
            </Box>

            {/* Custom Legend */}
            <Box sx={{ p: 1, border: "1px solid rgba(0, 0, 0, 0.12)", borderRadius: 1 }}>
              <Typography variant="caption" sx={{ fontWeight: 600, display: "block", mb: 1 }}>
                Sectors
              </Typography>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                {allSectorsForLegend.map((sector) => (
                  <Box key={sector} sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                    <Box
                      sx={{
                        width: 16,
                        height: 16,
                        backgroundColor: allSectorColorMap[sector] || "grey",
                        border: "1.5px solid #333333",
                        borderRadius: 0.5,
                        flexShrink: 0,
                      }}
                    />
                    <Typography variant="caption" sx={{ fontSize: "0.7rem", lineHeight: 1.2 }}>
                      {sector}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Box>
          </Box>

          {/* Right column: Plot area */}
          <Box sx={{ flex: 1 }}>
        {viewMode === "network" ? (
          <Plot
          data={[...edgeTraces]}
          layout={
            {
              width: 600,
              height: 327,
              margin: { l: 10, r: 10, t: 20, b: 10 },
              xaxis: { visible: false, range: [-1.2, 1.2] },
              yaxis: { visible: false, range: [-1.2, 1.2], scaleanchor: "x", scaleratio: 1 },
              showlegend: false,
              shapes: pieTraces,
              hovermode: 'closest'
            } as any
          }
          config={{ displayModeBar: false, responsive: false } as any}
          style={{ width: "600px", height: "327px" }}
        />
        ) : (() => {
          const allSectors = sectorOrderConfig.orderedSectors;
          const top10 = nbrs.slice(0, 10);
          
          // Focal stock first, then top 10 neighbors
          const allStocks = [focalStock, ...top10.map(n => n.stock)];
          
          // Create y-axis labels with rank
          const yLabels = allStocks.map((stock, idx) => {
            if (idx === 0) {
              return `Focal: ${stock.name}`;
            } else {
              return `${idx}. ${stock.name}`;
            }
          });
          
          // Create one trace per sector (stacked bars)
          const plotData = allSectors.map((sector) => {
            return {
              x: allStocks.map((stock) => stock.sectors[sector] || 0),
              y: yLabels,
              type: "bar",
              orientation: "h",
              name: sector,
              marker: {
                color: allSectorColorMap[sector] || "grey",
              },
              hovertemplate: `<b>${sector}</b>: %{x:.2f}%<extra></extra>`,
            } as any;
          });
          
          return (
            <Plot
              data={plotData as any}
              layout={
                {
                  barmode: "stack",
                  height: 327,
                  margin: { l: 220, r: 20, t: 20, b: 60 },
                  xaxis: {
                    title: { text: "Weight (%)" },
                    range: [0, 100],
                  },
                  yaxis: {
                    autorange: "reversed",
                    side: "left",
                    tickfont: { size: 11 },
                    automargin: true,
                    ticksuffix: "  ",
                    tickprefix: "",
                  },
                  showlegend: false,
                } as any
              }
              config={{ displayModeBar: false, responsive: true } as any}
              style={{ width: "100%" }}
            />
          );
        })()}
          </Box>
        </Box>
      </Paper>
    </Box>
  );
};

export default SimilarStocks;

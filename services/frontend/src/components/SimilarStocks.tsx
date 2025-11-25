import React, { useMemo, useState } from "react";
import {
  Box,
  Typography,
  TextField,
  FormControl,
  MenuItem,
  Select,
  InputLabel,
  Paper,
} from "@mui/material";
import Plot from "react-plotly.js";
import rawStockData from "../stock_data.json";

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

const cosDist = (a: number[], b: number[]): number => {
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
  if (na === 0 || nb === 0) {
    return 1;
  }
  const sim = dot / (Math.sqrt(na) * Math.sqrt(nb));
  return 1 - sim;
};

const runLayout = (nodesIn: Node[], edges: Edge[], iterations = 250): Node[] => {
  if (nodesIn.length === 0) return [];

  const nodes = nodesIn.map((n) => ({ ...n }));

  nodes.forEach((n, i) => {
    if (n.x === 0 && n.y === 0 && !n.isFocal) {
      const angle = (2 * Math.PI * i) / Math.max(1, nodes.length);
      n.x = Math.cos(angle);
      n.y = Math.sin(angle);
    }
  });

  const idToIdx: Record<string, number> = {};
  nodes.forEach((n, i) => {
    idToIdx[n.id] = i;
  });

  const kRep = 0.05;
  const kSpring = 0.02;
  const baseLen = 0.3;
  const lenScale = 1.0;

  for (let iter = 0; iter < iterations; iter++) {
    const forces: { fx: number; fy: number }[] = nodes.map(() => ({
      fx: 0,
      fy: 0,
    }));

    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[j].x - nodes[i].x;
        const dy = nodes[j].y - nodes[i].y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 0.001;
        const force = kRep / (dist * dist);
        const fx = (force * dx) / dist;
        const fy = (force * dy) / dist;
        forces[i].fx -= fx;
        forces[i].fy -= fy;
        forces[j].fx += fx;
        forces[j].fy += fy;
      }
    }

    edges.forEach((e) => {
      const i = idToIdx[e.source];
      const j = idToIdx[e.target];
      const dx = nodes[j].x - nodes[i].x;
      const dy = nodes[j].y - nodes[i].y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 0.001;

      const desired = baseLen + lenScale * e.weight;
      const delta = dist - desired;
      const force = kSpring * delta;
      const fx = (force * dx) / dist;
      const fy = (force * dy) / dist;

      forces[i].fx += fx;
      forces[i].fy += fy;
      forces[j].fx -= fx;
      forces[j].fy -= fy;
    });

    const step = 0.05;
    nodes.forEach((n, i) => {
      const damp = n.isFocal ? 0.1 : 1.0;
      n.x += step * forces[i].fx * damp;
      n.y += step * forces[i].fy * damp;
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

const SimilarStocks: React.FC = () => {
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

  const vecs = useMemo(() => {
    const map: Record<string, number[]> = {};
    stocks.forEach((s) => {
      const v: number[] = [];
      featKeys.forEach((key) => {
        const val =
          s.sectors[key] ??
          s.industryGroups[key] ??
          0;
        v.push(val);
      });
      map[s.isin] = v;
    });
    return map;
  }, [stocks, featKeys]);

  const [focal, setFocal] = useState<string>(() => stocks[0]?.isin ?? "");
  const [k, setK] = useState<number>(10);
  const [numPeers, setNumPeers] = useState<number>(5);

  const focalStock =
    stocks.find((s) => s.isin === focal) ?? stocks[0];

  const nbrs = useMemo(() => {
    const fv = vecs[focal];
    if (!fv) return [];

    const dists: { stock: CombinedStock; dist: number }[] = [];

    stocks.forEach((s) => {
      if (s.isin === focal) return;
      const v = vecs[s.isin];
      if (!v) return;
      const dist = cosDist(fv, v);
      dists.push({ stock: s, dist });
    });

    dists.sort((a, b) => a.dist - b.dist);

    return dists.slice(0, k);
  }, [focal, k, vecs, stocks]);

  const { layoutNodes, layoutEdges } = useMemo(() => {
    if (!focalStock) return { layoutNodes: [] as Node[], layoutEdges: [] as Edge[] };

    const nodes: Node[] = [];
    nodes.push({
      id: focalStock.isin,
      label: `${focalStock.isin}\n${focalStock.name}`,
      isFocal: true,
      x: 0,
      y: 0,
    });

    // Only include up to numPeers neighbors
    const peersToShow = nbrs.slice(0, numPeers);
    
    peersToShow.forEach((n) => {
      nodes.push({
        id: n.stock.isin,
        label: `${n.stock.isin}\n${n.stock.name}`,
        isFocal: false,
        x: Math.random() * 0.2 - 0.1,
        y: Math.random() * 0.2 - 0.1,
      });
    });

    const edges: Edge[] = [];
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const id1 = nodes[i].id;
        const id2 = nodes[j].id;
        const v1 = vecs[id1];
        const v2 = vecs[id2];
        if (!v1 || !v2) continue;
        const w = cosDist(v1, v2);
        edges.push({ source: id1, target: id2, weight: w });
      }
    }

    const laidOut = runLayout(nodes, edges, 250);
    return { layoutNodes: laidOut, layoutEdges: edges };
  }, [focalStock, nbrs, vecs, numPeers]);

  const xs = layoutNodes.map((n) => n.x);
  const ys = layoutNodes.map((n) => n.y);
  const labels = layoutNodes.map((n) => n.label);
  const colors = layoutNodes.map((n) => (n.isFocal ? "red" : "yellow"));

  const edgeTraces = layoutEdges
    .map((e) => {
      const src = layoutNodes.find((n) => n.id === e.source);
      const tgt = layoutNodes.find((n) => n.id === e.target);
      if (!src || !tgt) return null;

      return {
        x: [src.x, tgt.x],
        y: [src.y, tgt.y],
        mode: "lines",
        type: "scatter",
        line: { width: 1, color: "#bbbbbb" },
        hovertemplate: `distance = ${e.weight.toFixed(4)}<extra></extra>`,
        showlegend: false,
      } as any;
    })
    .filter(Boolean);

  const nodeTrace: any = {
    x: xs,
    y: ys,
    mode: "markers+text",
    type: "scatter",
    text: labels,
    textposition: "top center",
    textfont: {
      color: "#cccccc",
      size: 10,
    },
    marker: {
      size: 18,
      color: colors,
      opacity: 0.9,
      line: { width: 1, color: "black" },
    },
    hovertemplate: "ISIN: %{text}<extra></extra>",
    showlegend: false,
  };

  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 1 }}>
        Find Similar Stocks (force-directed kNN graph)
      </Typography>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", sm: "1.5fr 1fr 1fr" },
          gap: 1.5,
          mb: 1.5,
        }}
      >
        <FormControl fullWidth size="small">
          <InputLabel>Focal stock (ISIN)</InputLabel>
          <Select
            value={focal}
            label="Focal stock (ISIN)"
            onChange={(e) => setFocal(e.target.value)}
          >
            {stocks.map((s) => (
              <MenuItem key={s.isin} value={s.isin}>
                {s.isin} – {s.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <TextField
          size="small"
          label="Number of neighbors (k)"
          type="number"
          value={k}
          onChange={(e) => {
            const val = Number(e.target.value);
            if (!Number.isNaN(val) && val > 0) {
              setK(val);
            }
          }}
          inputProps={{ min: 1, max: 30 }}
        />

        <TextField
          size="small"
          label="Number of peers"
          type="number"
          value={numPeers}
          onChange={(e) => {
            const val = Number(e.target.value);
            if (!Number.isNaN(val) && val > 0) {
              setNumPeers(val);
            }
          }}
          inputProps={{ min: 1, max: k }}
        />
      </Box>

      <Paper variant="outlined" sx={{ p: 1 }}>
        <Plot
          data={[...edgeTraces, nodeTrace]}
          layout={
            {
              height: 280,
              margin: { l: 10, r: 10, t: 50, b: 10 },
              xaxis: { visible: false },
              yaxis: { visible: false },
              showlegend: false,
            } as any
          }
          config={{ displayModeBar: false, responsive: true } as any}
          style={{ width: "100%" }}
        />
      </Paper>
    </Box>
  );
};

export default SimilarStocks;

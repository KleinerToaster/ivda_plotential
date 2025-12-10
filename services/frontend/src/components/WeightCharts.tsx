import React from "react";
import Plot from "react-plotly.js";
import { Box, Typography, ToggleButtonGroup, ToggleButton, Paper } from "@mui/material";
import { Opacity } from "@mui/icons-material";

const median = (vals: number[]): number => {
  const valid = vals.filter((v) => !Number.isNaN(v)).sort((a, b) => a - b);
  if (!valid.length) return 0;
  const mid = Math.floor(valid.length / 2);
  if (valid.length % 2 === 0) {
    return (valid[mid - 1] + valid[mid]) / 2;
  }
  return valid[mid];
};

// Constants
const SECTOR_TO_INDUSTRY_GROUPS: Record<string, string[]> = {
  Financials: ["Banks", "Financial Services", "Insurance"],
  "Health Care": [
    "Health Care Equipment & Services",
    "Pharmaceuticals, Biotechnology & Life Sciences",
  ],
  "Information Technology": [
    "Semiconductors & Semiconductor Equipment",
    "Software & Services",
    "Technology Hardware & Equipment",
  ],
  Industrials: [
    "Capital Goods",
    "Commercial & Professional Services",
    "Transportation",
  ],
  Energy: ["Energy"],
  Materials: ["Materials"],
  "Consumer Staples": [
    "Food & Staples Retailing",
    "Food Beverage & Tobacco",
    "Household & Personal Products",
  ],
  "Consumer Discretionary": [
    "Automobiles & Components",
    "Consumer Durables & Apparel",
    "Consumer Services",
    "Retailing",
  ],
  "Real Estate": [
    "Equity Real Estate Investment Trusts (REITs)",
    "Real Estate Management & Development",
  ],
  "Communication Services": [
    "Media & Entertainment",
    "Telecommunication Services",
  ],
  Utilities: ["Utilities"],
};

const BLUE_SHADES = [
  "rgba(66, 133, 244, 0.55)",
  "rgba(66, 133, 244, 0.55)",
  "rgba(66, 133, 244, 0.55)",
  "rgba(66, 133, 244, 0.55)",
];

const RED_SHADES = [
  "rgba(244, 67, 54, 0.55)",
  "rgba(244, 67, 54, 0.55)",
  "rgba(244, 67, 54, 0.55)",
  "rgba(244, 67, 54, 0.55)",
];

// Asset colors: Asset 1=blue, Asset 2=red, Benchmark 1=yellow, Benchmark 2=green
const ASSET1_COLOR = "rgba(66, 133, 244, 0.85)";  // Blue - sector bars
const ASSET2_COLOR = "rgba(244, 67, 54, 0.85)";   // Red - sector bars
const BENCHMARK1_COLOR = "rgba(255, 193, 7, 0.85)";  // Yellow
const BENCHMARK2_COLOR = "rgba(76, 175, 80, 0.85)";  // Green
const STOCK_COLOR = ASSET1_COLOR;  // Backward compatibility
const COMP_COLOR = ASSET2_COLOR;   // Backward compatibility
const REMAINDER_COLOR = "lightgray";
const DISTRIBUTION_CURVE_COLOR = "#555555";

// Helper functions
const calculateKernelDensity = (
  samples: number[],
  steps: number = 80,
  bandwidth: number = 8
): { densities: number[]; ys: number[] } => {
  const densities: number[] = [];
  const ys: number[] = [];
  
  for (let i = 0; i <= steps; i++) {
    const y = (100 * i) / steps;
    ys.push(y);
    let density = 0;
    samples.forEach((s) => {
      const diff = (y - s) / bandwidth;
      density += Math.exp(-0.5 * diff * diff);
    });
    densities.push(density);
  }
  
  return { densities, ys };
};

const createDistributionCurve = (
  xCenter: number,
  samples: number[],
  sectorLabel: string,
  benchmarkLabel: string,
  barWidth: number = 0.65
) => {
  if (!samples.length) return null;
  
  const { densities, ys } = calculateKernelDensity(samples);
  const maxD = Math.max(...densities) || 1;
  
  const halfBarWidth = barWidth / 2;
  const curveX: number[] = [];
  const curveY: number[] = [];
  densities.forEach((d, i) => {
    const bow = (d / maxD) * barWidth;
    curveX.push(xCenter - halfBarWidth + bow);
    curveY.push(ys[i]);
  });
  
  return {
    x: curveX,
    y: curveY,
    type: "scatter",
    mode: "lines",
    name: `${benchmarkLabel} – ${sectorLabel}`,
    line: {
      width: 2,
      shape: "spline",
      smoothing: 1.3,
      color: DISTRIBUTION_CURVE_COLOR,
    },
    hovertemplate: `${benchmarkLabel} (${sectorLabel}): %{y:.1f}%<extra></extra>`,
    showlegend: false,
  };
};

const getIndustryGroupWeights = (
  stock: { industryGroups: Record<string, number> } | null,
  industryGroups: string[]
): { ig: string; weight: number }[] => {
  if (!stock) return [];
  
  const weights: { ig: string; weight: number }[] = [];
  industryGroups.forEach((ig) => {
    const weight = stock.industryGroups[ig] || 0;
    if (weight > 0) {
      weights.push({ ig, weight });
    }
  });
  return weights;
};

const createIndustryGroupBars = (
  xPos: number,
  igWeights: { ig: string; weight: number }[],
  sectorName: string,
  colorShades: string[],
  offsetGroup: string
) => {
  const traces: any[] = [];
  const totalWeight = igWeights.reduce((sum, item) => sum + item.weight, 0);
  
  if (igWeights.length === 0) {
    // Placeholder bar
    traces.push({
      x: [xPos],
      y: [-100],
      type: "bar",
      marker: { color: REMAINDER_COLOR, opacity: 0.3, line: { color: "white", width: 0.5 } },
      offsetgroup: offsetGroup,
      width: 0.35,
      base: [0],
      hovertemplate: `No exposure to ${sectorName}<extra></extra>`,
      showlegend: false,
    });
    return traces;
  }
  
  let cumulative = 0;
  igWeights.forEach((item, idx) => {
    const rescaledHeight = totalWeight > 0 ? (item.weight / totalWeight) * 100 : 0;
    const colorIdx = igWeights.length > 1 ? idx % colorShades.length : 0;
    
    traces.push({
      x: [xPos],
      y: [-rescaledHeight],
      type: "bar",
      marker: { color: colorShades[colorIdx], line: { color: "white", width: 1.5 } },
      offsetgroup: offsetGroup,
      width: 0.35,
      base: [-cumulative],
      hovertemplate: `${item.ig}: ${item.weight.toFixed(1)}% of stock<br>(${rescaledHeight.toFixed(1)}% of ${sectorName})<extra></extra>`,
      showlegend: false,
    });
    
    cumulative += rescaledHeight;
  });
  
  return traces;
};

interface WeightChartsProps {
  filteredSectorData: {
    sectors: string[];
    stockWeights: number[];
    benchWeights: number[];
    positions: number[];
  };
  distSamplesBenchBySector: Record<string, number[]>;
  currentBenchmarkLabel: string;
  selectedStock: {
    name: string;
    sectors: Record<string, number>;
    industryGroups: Record<string, number>;
  } | null;
  comparisonStock: {
    name: string;
    sectors: Record<string, number>;
    industryGroups: Record<string, number>;
  } | null;
  showWeightDistributions: boolean;
  showIndustryGroups: boolean;
  setShowWeightDistributions: (value: boolean) => void;
  setShowIndustryGroups: (value: boolean) => void;
  allIGNames: string[];
  allSectorNames: string[];
}

const WeightCharts: React.FC<WeightChartsProps> = ({
  filteredSectorData,
  distSamplesBenchBySector,
  currentBenchmarkLabel,
  selectedStock,
  comparisonStock,
  showWeightDistributions,
  showIndustryGroups,
  setShowWeightDistributions,
  setShowIndustryGroups,
  allIGNames,
  allSectorNames,
}) => {
  const emptyStockName = "Selected stock";
  const emptyCompName = "Comparison stock";

  return (
    <Box>
      <Paper variant="outlined" sx={{ p: 1 }}>
        <Typography sx={{ fontSize: "0.85rem", fontWeight: 600, color: "#333", mb: 1 }}>
          Stock Level Absolute Category Weights
        </Typography>
        <Box sx={{ display: "flex", gap: 2, mb: 1, alignItems: "center" }}>
          <Typography variant="caption" sx={{ fontSize: "0.75rem", minWidth: "fit-content" }}>
            Display Industry Groups
          </Typography>
          <ToggleButtonGroup
            exclusive
            size="small"
            value={showIndustryGroups ? "yes" : "no"}
            onChange={(_, val) => val && setShowIndustryGroups(val === "yes")}
            sx={{
              '& .MuiToggleButton-root': {
                py: 0.3,
                px: 1.2,
                fontSize: "0.7rem",
              }
            }}
          >
            <ToggleButton value="yes">Yes</ToggleButton>
            <ToggleButton value="no">No</ToggleButton>
          </ToggleButtonGroup>

          <Typography variant="caption" sx={{ fontSize: "0.75rem", minWidth: "fit-content", ml: 2 }}>
            Compare weights
          </Typography>
          <ToggleButtonGroup
            exclusive
            size="small"
            value={showWeightDistributions ? "yes" : "no"}
            onChange={(_, val) => val && setShowWeightDistributions(val === "yes")}
            sx={{
              '& .MuiToggleButton-root': {
                py: 0.3,
                px: 1.2,
                fontSize: "0.7rem",
              }
            }}
          >
            <ToggleButton value="yes">Yes</ToggleButton>
            <ToggleButton value="no">No</ToggleButton>
          </ToggleButtonGroup>
        </Box>
      <Box sx={{ height: 335, overflow: "hidden" }}>
      {(() => {
        if (!showWeightDistributions) {
    if (showIndustryGroups) {
      // Stacked bar chart showing industry group breakdown within each sector
      const SECTOR_TO_INDUSTRY_GROUPS: Record<string, string[]> = {
        Financials: ["Banks", "Financial Services", "Insurance"],
        "Health Care": [
          "Health Care Equipment & Services",
          "Pharmaceuticals, Biotechnology & Life Sciences",
        ],
        "Information Technology": [
          "Semiconductors & Semiconductor Equipment",
          "Software & Services",
          "Technology Hardware & Equipment",
        ],
        Industrials: [
          "Capital Goods",
          "Commercial & Professional Services",
          "Transportation",
        ],
        Energy: ["Energy"],
        Materials: ["Materials"],
        "Consumer Staples": [
          "Food & Staples Retailing",
          "Food Beverage & Tobacco",
          "Household & Personal Products",
        ],
        "Consumer Discretionary": [
          "Automobiles & Components",
          "Consumer Durables & Apparel",
          "Consumer Services",
          "Retailing",
        ],
        "Real Estate": [
          "Equity Real Estate Investment Trusts (REITs)",
          "Real Estate Management & Development",
        ],
        "Communication Services": [
          "Media & Entertainment",
          "Telecommunication Services",
        ],
        Utilities: ["Utilities"],
      };

      const traces: any[] = [];
      const medianShapes: any[] = [];
      
      // For each sector with non-zero weight
      filteredSectorData.sectors.forEach((sector, sectorIdx) => {
        const xPos = filteredSectorData.positions[sectorIdx];
        const sectorWeight = filteredSectorData.stockWeights[sectorIdx];
        const industryGroups = SECTOR_TO_INDUSTRY_GROUPS[sector] || [];
        
        // Add the main sector weight bar (same as when showIndustryGroups = false)
        traces.push({
          x: [xPos],
          y: [sectorWeight],
          type: "bar",
          name: sector,
          marker: { color: "rgba(66, 133, 244, 0.8)" },
          offsetgroup: "stock",
          width: 0.5,
          hovertemplate: `${sector}: ${sectorWeight.toFixed(1)}%<extra></extra>`,
          showlegend: false,
        });
        
        // Add remainder bar (transparent gray) on top of sector weight
        const remainder = 100 - sectorWeight;
        traces.push({
          x: [xPos],
          y: [remainder],
          type: "bar",
          name: "Remainder",
          marker: { color: "lightgray", opacity: 0.8 },
          offsetgroup: "stock",
          width: 0.5,
          base: [sectorWeight],
          hovertemplate: `Remainder: ${remainder.toFixed(1)}%<extra></extra>`,
          showlegend: false,
        });
        
        // Get industry group weights for this sector
        const igWeights: { ig: string; weight: number }[] = [];
        let totalIGWeight = 0;
        
        industryGroups.forEach((ig) => {
          const weight = selectedStock?.industryGroups[ig] || 0;
          if (weight > 0) {
            igWeights.push({ ig, weight });
            totalIGWeight += weight;
          }
        });
        
        // Create stacked bars for industry groups BELOW the x-axis
        // These bars go downward, showing relative proportions (rescaled to -100%)
        // Use different shades of blue for multiple IGs in same sector
        
        let cumulative = 0;
        igWeights.forEach((item, igIdx) => {
          const rescaledHeight = totalIGWeight > 0 ? (item.weight / totalIGWeight) * 100 : 0;
          const colorIdx = igWeights.length > 1 ? igIdx % BLUE_SHADES.length : 0;
          const igColor = BLUE_SHADES[colorIdx];
          
          traces.push({
            x: [xPos],
            y: [-rescaledHeight],  // Negative to go below x-axis
            type: "bar",
            name: item.ig,
            marker: { color: igColor, line: { color: "white", width: 1.5 }, opacity: 0.5 },
            offsetgroup: "stock",
            width: 0.55,
            base: [-cumulative],  // Negative base to stack downward
            hovertemplate: `${item.ig}: ${item.weight.toFixed(1)}% of stock<br>(${rescaledHeight.toFixed(1)}% of ${sector})<extra></extra>`,
            showlegend: false,
          });
          
          cumulative += rescaledHeight;
        });
        
        // Add distribution curve for sector
        const samples = distSamplesBenchBySector[sector] ?? [];
        if (samples.length > 0) {
          const barWidth = 0.5;
          const halfBarWidth = barWidth / 2;
          const steps = 80;
          const bandwidth = 8;
          const densities: number[] = [];
          const ys: number[] = [];
          
          for (let i = 0; i <= steps; i++) {
            const y = (100 * i) / steps;
            ys.push(y);
            let density = 0;
            samples.forEach((s) => {
              const u = (y - s) / bandwidth;
              density += Math.exp(-0.5 * u * u);
            });
            densities.push(density);
          }
          
          const maxD = Math.max(...densities) || 1;
          const curveX: number[] = [];
          const curveY: number[] = [];
          densities.forEach((d, i) => {
            const bow = (d / maxD) * barWidth;
            curveX.push(xPos - halfBarWidth + bow);
            curveY.push(ys[i]);
          });
          
          traces.push({
            x: curveX,
            y: curveY,
            type: "scatter",
            mode: "lines",
            name: `${currentBenchmarkLabel} – ${sector}`,
            line: {
              width: 2,
              shape: "spline",
              smoothing: 1.3,
              color: "#555555",
            },
            hovertemplate: `${currentBenchmarkLabel} (${sector}): %{y:.1f}%<extra></extra>`,
            showlegend: false,
          });
          
          // Add median line
          const med = median(samples);
          const medianHalfBarWidth = 0.5 / 2;
          medianShapes.push({
            type: "line",
            xref: "x",
            yref: "y",
            x0: xPos - medianHalfBarWidth,
            x1: xPos + medianHalfBarWidth,
            y0: med,
            y1: med,
            line: {
              width: 4,
              color: "#555555",
            },
          });
        }
      });

      return (
          <Plot
            data={traces}
            layout={
              {
                barmode: "stack",
                height: 380,
                margin: { l: 80, r: 80, t: 60, b: 80 },
              yaxis: {
                title: { text: "" },
                range: [-100, 100],  // Extended range to show bars below axis
                tickmode: "array",
                tickvals: [-100, -75, -50, -25, 0, 25, 50, 75, 100],
                ticktext: ["100%", "75%", "50%", "25%", "0%", "25%", "50%", "75%", "100%"],
                zeroline: true,
                zerolinewidth: 2,
                zerolinecolor: "black",
                showline: true,
                linewidth: 2,
                linecolor: "black",
                showgrid: false,
              },
              xaxis: {
                title: { text: "" },
                tickmode: "array",
                tickvals: filteredSectorData.positions,
                ticktext: filteredSectorData.sectors,
                range: [0.5, 11.5],
                side: "top",
                tickangle: -25,
              },
              shapes: [
                ...medianShapes,
                // Grid lines for positive y-values only (25% steps)
                { type: "line", xref: "paper", yref: "y", x0: 0, x1: 1, y0: 25, y1: 25, line: { width: 1.5, color: "rgba(128, 128, 128, 0.3)", dash: "dot" }, layer: "below" },
                { type: "line", xref: "paper", yref: "y", x0: 0, x1: 1, y0: 50, y1: 50, line: { width: 1.5, color: "rgba(128, 128, 128, 0.3)", dash: "dot" }, layer: "below" },
                { type: "line", xref: "paper", yref: "y", x0: 0, x1: 1, y0: 75, y1: 75, line: { width: 1.5, color: "rgba(128, 128, 128, 0.3)", dash: "dot" }, layer: "below" },
                { type: "line", xref: "paper", yref: "y", x0: 0, x1: 1, y0: 100, y1: 100, line: { width: 1.5, color: "rgba(128, 128, 128, 0.3)", dash: "dot" }, layer: "below" },
                {
                  type: "line",
                  xref: "x",
                  yref: "y",
                  x0: 0.5,
                  x1: 11.5,
                  y0: 0,
                  y1: 0,
                  line: {
                    width: 2,
                    color: "black",
                  },
                  layer: "above",
                },
              ],
              annotations: [
                {
                  x: -0.12,
                  y: 60,
                  xref: "paper",
                  yref: "y",
                  text: "Sector Weight",
                  textangle: -90,
                  showarrow: false,
                  font: { size: 12 },
                  xanchor: "center",
                  yanchor: "middle",
                },
                {
                  x: -0.12,
                  y: -60,
                  xref: "paper",
                  yref: "y",
                  text: "Rescaled Ind. Weight",
                  textangle: -90,
                  showarrow: false,
                  font: { size: 12 },
                  xanchor: "center",
                  yanchor: "middle",
                },
              ],
              showlegend: false,
            } as any
          }
          config={{ displayModeBar: false, responsive: true } as any}
          style={{ width: "100%" }}
        />
      );
    }
    
    // Original sector-only view (showIndustryGroups = false)
    return (
        <Plot
          data={
            (() => {
            const traces: any[] = [];

            traces.push({
              x: filteredSectorData.positions,
              y: filteredSectorData.stockWeights,
              type: "bar",
              name: selectedStock?.name ?? emptyStockName,
              marker: { color: STOCK_COLOR },
              offsetgroup: "stock",
              width: 0.65,
            });

            const remainderWeights = filteredSectorData.stockWeights.map(
              (w) => 100 - w
            );
            traces.push({
              x: filteredSectorData.positions,
              y: remainderWeights,
              type: "bar",
              name: "Remainder",
              marker: { color: REMAINDER_COLOR, opacity: 0.8 },
              offsetgroup: "stock",
              width: 0.65,
              showlegend: false,
              hovertemplate: "Remainder: %{y:.1f}%<extra></extra>",
            });

            filteredSectorData.sectors.forEach((sector, idx) => {
              const samples = distSamplesBenchBySector[sector] ?? [];
              const xCenter = filteredSectorData.positions[idx];
              const curve = createDistributionCurve(xCenter, samples, sector, currentBenchmarkLabel, 0.65);
              if (curve) {
                traces.push(curve);
              }
            });

            return traces;
          })()
        }
        layout={
          {
            barmode: "stack",
            height: 380,
            margin: { l: 80, r: 80, t: 80, b: 80 },
            yaxis: {
              title: { text: "Sector Weight" },
              range: [0, 100],
              tickmode: "array",
              tickvals: [0, 25, 50, 75, 100],
              ticktext: ["0%", "25%", "50%", "75%", "100%"],
              zeroline: true,
              zerolinewidth: 2,
              zerolinecolor: "black",
              showline: true,
              linewidth: 2,
              linecolor: "black",
              showgrid: false,
            },
            xaxis: {
              title: { text: "" },
              tickmode: "array",
              tickvals: filteredSectorData.positions.map((v) => v - 0.3),
              ticktext: filteredSectorData.sectors,
              range: [0.5, 11.5],
              side: "top",
              tickangle: -25,
            },
            shapes: [
              // Grid lines at 25% steps
              { type: "line", xref: "paper", yref: "y", x0: 0, x1: 1, y0: 25, y1: 25, line: { width: 1.5, color: "rgba(128, 128, 128, 0.3)", dash: "dot" }, layer: "below" },
              { type: "line", xref: "paper", yref: "y", x0: 0, x1: 1, y0: 50, y1: 50, line: { width: 1.5, color: "rgba(128, 128, 128, 0.3)", dash: "dot" }, layer: "below" },
              { type: "line", xref: "paper", yref: "y", x0: 0, x1: 1, y0: 75, y1: 75, line: { width: 1.5, color: "rgba(128, 128, 128, 0.3)", dash: "dot" }, layer: "below" },
              { type: "line", xref: "paper", yref: "y", x0: 0, x1: 1, y0: 100, y1: 100, line: { width: 1.5, color: "rgba(128, 128, 128, 0.3)", dash: "dot" }, layer: "below" },
              // Median lines
              ...filteredSectorData.sectors.map((sector, idx) => {
                const samples = distSamplesBenchBySector[sector] ?? [];
                const med = median(samples);
                const xCenter = filteredSectorData.positions[idx];
                const halfBarWidth = 0.65 / 2;
                return {
                  type: "line",
                  xref: "x",
                  yref: "y",
                  x0: xCenter - halfBarWidth,
                  x1: xCenter + halfBarWidth,
                  y0: med,
                  y1: med,
                  line: {
                    width: 4,
                    color: DISTRIBUTION_CURVE_COLOR,
                  },
                };
              }),
            ],
            showlegend: false,
          } as any
        }
        config={{ displayModeBar: false, responsive: true } as any}
        style={{ width: "100%" }}
      />
    );
  }

  if (showIndustryGroups) {
    // Industry group breakdown with comparison stock

    // Build combined sector data including sectors where either stock has weight
    const combinedSectorData: Array<{
      sector: string;
      stockWeight: number;
      compWeight: number;
    }> = [];

    // Add sectors from baseline (already filtered and sorted by baseline weight)
    filteredSectorData.sectors.forEach((sector, idx) => {
      const stockWeight = filteredSectorData.stockWeights[idx];
      const compWeight = comparisonStock?.sectors[sector] || 0;
      combinedSectorData.push({ sector, stockWeight, compWeight });
    });

    // Add sectors where only comparison stock has weight
    allSectorNames.forEach((sector) => {
      const stockWeight = selectedStock?.sectors[sector] || 0;
      const compWeight = comparisonStock?.sectors[sector] || 0;
      
      if (stockWeight === 0 && compWeight > 0) {
        combinedSectorData.push({ sector, stockWeight: 0, compWeight });
      }
    });

    // Sort the comparison-only sectors by weight
    const baselineCount = filteredSectorData.sectors.length;
    if (combinedSectorData.length > baselineCount) {
      const compOnlySectors = combinedSectorData.slice(baselineCount);
      compOnlySectors.sort((a, b) => b.compWeight - a.compWeight);
      combinedSectorData.splice(baselineCount, compOnlySectors.length, ...compOnlySectors);
    }

    const traces: any[] = [];
    const sectors: string[] = [];
    const positions: number[] = [];
    
    // For each sector where at least one stock has weight
    combinedSectorData.forEach((sectorData, sectorIdx) => {
      const sector = sectorData.sector;
      const xPos = sectorIdx + 1;
      const stockSectorWeight = sectorData.stockWeight;
      const compSectorWeight = sectorData.compWeight;
      const industryGroups = SECTOR_TO_INDUSTRY_GROUPS[sector] || [];
      
      sectors.push(sector);
      positions.push(xPos);
      
      // Baseline stock sector bar
      traces.push({
        x: [xPos],
        y: [stockSectorWeight],
        type: "bar",
        name: sector,
        marker: { color: STOCK_COLOR , opacity: 0.8},
        offsetgroup: "stock",
        width: 0.38,
        hovertemplate: `${sector}: ${stockSectorWeight.toFixed(1)}%<extra></extra>`,
        showlegend: false,
      });
      
      // Baseline remainder
      traces.push({
        x: [xPos],
        y: [100 - stockSectorWeight],
        type: "bar",
        marker: { color: REMAINDER_COLOR, opacity: 0.8   },
        offsetgroup: "stock",
        width: 0.38,
        base: [stockSectorWeight],
        hovertemplate: `Remainder: ${(100 - stockSectorWeight).toFixed(1)}%<extra></extra>`,
        showlegend: false,
      });
      
      // Comparison stock sector bar
      traces.push({
        x: [xPos],
        y: [compSectorWeight],
        type: "bar",
        marker: { color: COMP_COLOR },
        offsetgroup: "comp",
        width: 0.38,
        hovertemplate: `${sector}: ${compSectorWeight.toFixed(1)}%<extra></extra>`,
        showlegend: false,
      });
      
      // Comparison remainder
      traces.push({
        x: [xPos],
        y: [100 - compSectorWeight],
        type: "bar",
        marker: { color: REMAINDER_COLOR, opacity: 0.8 },
        offsetgroup: "comp",
        width: 0.38,
        base: [compSectorWeight],
        hovertemplate: `Remainder: ${(100 - compSectorWeight).toFixed(1)}%<extra></extra>`,
        showlegend: false,
      });
      
      // Baseline stock industry groups (below x-axis)
      const stockIgWeights = getIndustryGroupWeights(selectedStock, industryGroups);
      const stockIgBars = createIndustryGroupBars(xPos, stockIgWeights, sector, BLUE_SHADES, "stock");
      traces.push(...stockIgBars);
      
      // Comparison stock industry groups (below x-axis)
      const compIgWeights = getIndustryGroupWeights(comparisonStock, industryGroups);
      const compIgBars = createIndustryGroupBars(xPos, compIgWeights, sector, RED_SHADES, "comp");
      traces.push(...compIgBars);
    });

    // Add separator line if there are comparison-only sectors
    const shapes: any[] = [
      // Grid lines for positive y-values only (25% steps)
      { type: "line", xref: "paper", yref: "y", x0: 0, x1: 1, y0: 25, y1: 25, line: { width: 1.5, color: "rgba(128, 128, 128, 0.3)", dash: "dot" }, layer: "below" },
      { type: "line", xref: "paper", yref: "y", x0: 0, x1: 1, y0: 50, y1: 50, line: { width: 1.5, color: "rgba(128, 128, 128, 0.3)", dash: "dot" }, layer: "below" },
      { type: "line", xref: "paper", yref: "y", x0: 0, x1: 1, y0: 75, y1: 75, line: { width: 1.5, color: "rgba(128, 128, 128, 0.3)", dash: "dot" }, layer: "below" },
      { type: "line", xref: "paper", yref: "y", x0: 0, x1: 1, y0: 100, y1: 100, line: { width: 1.5, color: "rgba(128, 128, 128, 0.3)", dash: "dot" }, layer: "below" },
      {
        type: "line",
        xref: "x",
        yref: "y",
        x0: 0.5,
        x1: Math.max(11.5, combinedSectorData.length + 0.5),
        y0: 0,
        y1: 0,
        line: {
          width: 2,
          color: "black",
        },
        layer: "above",
      },
    ];
    
    if (combinedSectorData.length > baselineCount) {
      shapes.push({
        type: "line",
        xref: "x",
        yref: "paper",
        x0: baselineCount + 0.5,
        x1: baselineCount + 0.5,
        y0: 0,
        y1: 1,
        line: {
          color: "gray",
          width: 2,
          dash: "dot",
        },
      });
    }

    return (
        <Plot
          data={traces}
          layout={{
            barmode: "group",
            height: 380,
            margin: { l: 100, r: 80, t: 70, b: 70 },
          yaxis: {
            title: { text: "" },
            range: [-100, 100],
            tickmode: "array",
            tickvals: [-100, -75, -50, -25, 0, 25, 50, 75, 100],
            ticktext: ["100%", "75%", "50%", "25%", "0%", "25%", "50%", "75%", "100%"],
            zeroline: true,
            zerolinewidth: 2,
            zerolinecolor: "black",
            showline: true,
            linewidth: 2,
            linecolor: "black",
            showgrid: false,
          },
          xaxis: {
            title: { text: "" },
            tickmode: "array",
            tickvals: positions,
            ticktext: sectors,
            range: [0.5, Math.max(11.5, combinedSectorData.length + 0.5)],
            side: "top",
            tickangle: -25,
          },
          shapes,
          annotations: [
            {
              x: -0.12,
              y: 60,
              xref: "paper",
              yref: "y",
              text: "Sector Weight",
              textangle: -90,
              showarrow: false,
              font: { size: 12 },
              xanchor: "center",
              yanchor: "middle",
            },
            {
              x: -0.12,
              y: -50,
              xref: "paper",
              yref: "y",
              text: "Rescaled Ind. Weight",
              textangle: -90,
              showarrow: false,
              font: { size: 12 },
              xanchor: "center",
              yanchor: "middle",
            },
          ],
          showlegend: false,
        } as any}
        config={{ displayModeBar: false, responsive: true } as any}
        style={{ width: "100%" }}
      />
    );
  }

  // Comparison view: show both stocks' bars side by side for each sector
  // Include sectors from baseline stock plus sectors where only comparison stock has weight
  const comparisonData: Array<{
    sector: string;
    stockWeight: number;
    compWeight: number;
  }> = [];

  // Add sectors from baseline (already filtered and sorted)
  filteredSectorData.sectors.forEach((sector, idx) => {
    const stockWeight = filteredSectorData.stockWeights[idx];
    const compWeight = comparisonStock?.sectors[sector] || 0;
    comparisonData.push({ sector, stockWeight, compWeight });
  });

  // Add sectors where only comparison stock has weight
  allSectorNames.forEach((sector) => {
    const stockWeight = selectedStock?.sectors[sector] || 0;
    const compWeight = comparisonStock?.sectors[sector] || 0;
    
    if (stockWeight === 0 && compWeight > 0) {
      comparisonData.push({ sector, stockWeight: 0, compWeight });
    }
  });

  // Sort the comparison-only sectors by weight
  const baselineCount = filteredSectorData.sectors.length;
  if (comparisonData.length > baselineCount) {
    const compOnlySectors = comparisonData.slice(baselineCount);
    compOnlySectors.sort((a, b) => b.compWeight - a.compWeight);
    comparisonData.splice(baselineCount, compOnlySectors.length, ...compOnlySectors);
  }

  const traces: any[] = [];
  const sectors: string[] = [];
  const positions: number[] = [];
  
  comparisonData.forEach((item, idx) => {
    const xPos = idx + 1;
    sectors.push(item.sector);
    positions.push(xPos);
    
    // Baseline stock bar
    traces.push({
      x: [xPos],
      y: [item.stockWeight],
      type: "bar",
      name: selectedStock?.name ?? emptyStockName,
      marker: { color: STOCK_COLOR },
      width: 0.38,
      offsetgroup: "stock",
      hovertemplate: `${item.sector}: ${item.stockWeight.toFixed(1)}%<extra></extra>`,
      showlegend: false,
    });
    
    // Baseline remainder
    traces.push({
      x: [xPos],
      y: [100 - item.stockWeight],
      type: "bar",
      marker: { color: REMAINDER_COLOR, opacity: 0.8 },
      width: 0.38,
      offsetgroup: "stock",
      base: [item.stockWeight],
      hovertemplate: `Remainder: ${(100 - item.stockWeight).toFixed(1)}%<extra></extra>`,
      showlegend: false,
    });
    
    // Comparison stock bar
    traces.push({
      x: [xPos],
      y: [item.compWeight],
      type: "bar",
      name: comparisonStock?.name ?? emptyCompName,
      marker: { color: COMP_COLOR },
      width: 0.38,
      offsetgroup: "comp",
      hovertemplate: `${item.sector}: ${item.compWeight.toFixed(1)}%<extra></extra>`,
      showlegend: false,
    });
    
    // Comparison remainder
    traces.push({
      x: [xPos],
      y: [100 - item.compWeight],
      type: "bar",
      marker: { color: REMAINDER_COLOR, opacity: 0.8 },
      width: 0.38,
      offsetgroup: "comp",
      base: [item.compWeight],
      hovertemplate: `Remainder: ${(100 - item.compWeight).toFixed(1)}%<extra></extra>`,
      showlegend: false,
    });
  });

  // Add separator line if there are comparison-only sectors
  const shapes: any[] = [];
  if (comparisonData.length > baselineCount) {
    shapes.push({
      type: "line",
      xref: "x",
      yref: "paper",
      x0: baselineCount + 0.5,
      x1: baselineCount + 0.5,
      y0: 0,
      y1: 1,
      line: {
        color: "gray",
        width: 2,
        dash: "dot",
      },
    });
  }

  return (
      <Plot
        data={traces}
        layout={{
          barmode: "group",
          height: 380,
          margin: { l: 80, r: 80, t: 70, b: 100 },
        yaxis: {
          title: { text: "Sector Weight" },
          range: [0, 100],
          tickmode: "array",
          tickvals: [0, 25, 50, 75, 100],
          ticktext: ["0%", "25%", "50%", "75%", "100%"],
          zeroline: true,
          zerolinewidth: 2,
          zerolinecolor: "black",
          showline: true,
          linewidth: 2,
          linecolor: "black",
          showgrid: false,
        },
        xaxis: {
          title: { text: "" },
          tickmode: "array",
          tickvals: positions,
          ticktext: sectors,
          range: [0.5, Math.max(11.5, comparisonData.length + 0.5)],
          side: "top",
          tickangle: -25,
        },
        shapes: [
          // Grid lines at 25% steps
          { type: "line", xref: "paper", yref: "y", x0: 0, x1: 1, y0: 25, y1: 25, line: { width: 1.5, color: "rgba(128, 128, 128, 0.3)", dash: "dot" }, layer: "below" },
          { type: "line", xref: "paper", yref: "y", x0: 0, x1: 1, y0: 50, y1: 50, line: { width: 1.5, color: "rgba(128, 128, 128, 0.3)", dash: "dot" }, layer: "below" },
          { type: "line", xref: "paper", yref: "y", x0: 0, x1: 1, y0: 75, y1: 75, line: { width: 1.5, color: "rgba(128, 128, 128, 0.3)", dash: "dot" }, layer: "below" },
          { type: "line", xref: "paper", yref: "y", x0: 0, x1: 1, y0: 100, y1: 100, line: { width: 1.5, color: "rgba(128, 128, 128, 0.3)", dash: "dot" }, layer: "below" },
          // Separator line (if needed)
          ...shapes,
        ],
        showlegend: false,
      } as any}
        config={{ displayModeBar: false, responsive: true } as any}
        style={{ width: "100%" }}
      />
  );
      })()}
      </Box>
      </Paper>
    </Box>
  );
};export default WeightCharts;

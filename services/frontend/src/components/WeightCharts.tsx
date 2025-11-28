import React from "react";
import Plot from "react-plotly.js";

const median = (vals: number[]): number => {
  const valid = vals.filter((v) => !Number.isNaN(v)).sort((a, b) => a - b);
  if (!valid.length) return 0;
  const mid = Math.floor(valid.length / 2);
  if (valid.length % 2 === 0) {
    return (valid[mid - 1] + valid[mid]) / 2;
  }
  return valid[mid];
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
  allIGNames,
  allSectorNames,
}) => {
  const emptyStockName = "Selected stock";
  const emptyCompName = "Comparison stock";

  if (!showWeightDistributions) {
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
              marker: { color: "rgba(66, 133, 244, 0.8)" },
              offsetgroup: "stock",
              width: 0.35,
            });

            const remainderWeights = filteredSectorData.stockWeights.map(
              (w) => 100 - w
            );
            traces.push({
              x: filteredSectorData.positions,
              y: remainderWeights,
              type: "bar",
              name: "Remainder",
              marker: { color: "lightgray", opacity: 0.3 },
              offsetgroup: "stock",
              width: 0.35,
              showlegend: false,
              hovertemplate: "Remainder: %{y:.1f}%<extra></extra>",
            });

            const curveWidth = 0.39;
            filteredSectorData.sectors.forEach((sector, idx) => {
              const samples = distSamplesBenchBySector[sector] ?? [];
              if (!samples.length) return;
              const xCenter = filteredSectorData.positions[idx];
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
                const bow = (d / maxD) * curveWidth;
                curveX.push(xCenter - 0.195 + bow);
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
            });

            return traces;
          })()
        }
        layout={
          {
            barmode: "stack",
            height: 300,
            margin: { l: 60, r: 20, t: 45, b: 60 },
            yaxis: {
              title: { text: "Weight (%)" },
              range: [0, 100],
              tickmode: "linear",
              tick0: 0,
              dtick: 20,
              zeroline: true,
              zerolinewidth: 2,
              zerolinecolor: "black",
              showline: true,
              linewidth: 2,
              linecolor: "black",
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
            shapes: filteredSectorData.sectors.map((sector, idx) => {
              const samples = distSamplesBenchBySector[sector] ?? [];
              const med = median(samples);
              const xCenter = filteredSectorData.positions[idx];
              return {
                type: "line",
                xref: "x",
                yref: "y",
                x0: xCenter - 0.195,
                x1: xCenter + 0.195,
                y0: med,
                y1: med,
                line: {
                  width: 4,
                  color: "#555555",
                },
              };
            }),
            showlegend: false,
          } as any
        }
        config={{ displayModeBar: false, responsive: true } as any}
        style={{ width: "100%" }}
      />
    );
  }

  if (showIndustryGroups) {
    const tempData: Array<{
      ig: string;
      stockWeight: number;
      compWeight: number;
    }> = [];
    allIGNames.forEach((ig) => {
      const stockW = selectedStock?.industryGroups[ig] || 0;
      const compW = comparisonStock?.industryGroups[ig] || 0;
      if (stockW > 0 || compW > 0) {
        tempData.push({ ig, stockWeight: stockW, compWeight: compW });
      }
    });

    const selectedHasWeight = tempData.filter((item) => item.stockWeight > 0);
    const onlyCompHasWeight = tempData.filter(
      (item) => item.stockWeight === 0 && item.compWeight > 0
    );

    selectedHasWeight.sort((a, b) => b.stockWeight - a.stockWeight);
    onlyCompHasWeight.sort((a, b) => b.compWeight - a.compWeight);

    const combinedData = [...selectedHasWeight, ...onlyCompHasWeight];

    const filteredIGs: string[] = [];
    const filteredStockWeights: number[] = [];
    const filteredCompWeights: number[] = [];
    combinedData.forEach((item) => {
      filteredIGs.push(item.ig);
      filteredStockWeights.push(item.stockWeight);
      filteredCompWeights.push(item.compWeight);
    });

    const stockIGs: string[] = [];
    const stockWeightsFiltered: number[] = [];
    const stockRemainderIGs: string[] = [];
    const stockRemainderValues: number[] = [];
    const stockRemainderBase: number[] = [];
    combinedData.forEach((item) => {
      if (item.stockWeight > 0) {
        stockIGs.push(item.ig);
        stockWeightsFiltered.push(item.stockWeight);
        stockRemainderIGs.push(item.ig);
        stockRemainderValues.push(100 - item.stockWeight);
        stockRemainderBase.push(item.stockWeight);
      }
    });

    const compRemainders = filteredCompWeights.map((w) => 100 - w);
    const separatorIndex = selectedHasWeight.length;
    const shapes: any[] =
      onlyCompHasWeight.length > 0 && separatorIndex < filteredIGs.length
        ? [
            {
              type: "line",
              xref: "paper",
              yref: "paper",
              x0: separatorIndex / filteredIGs.length,
              x1: separatorIndex / filteredIGs.length,
              y0: 0,
              y1: 1,
              line: {
                color: "gray",
                width: 2,
                dash: "dot",
              },
            },
          ]
        : [];

    const data = [
      {
        x: stockIGs,
        y: stockWeightsFiltered,
        type: "bar",
        name: selectedStock?.name ?? emptyStockName,
        marker: { color: "rgba(66, 133, 244, 0.8)" },
        width: 0.39,
        offset: -0.25,
      },
      {
        x: stockRemainderIGs,
        y: stockRemainderValues,
        type: "bar",
        marker: { color: "lightgray" },
        opacity: 0.25,
        showlegend: false,
        width: 0.39,
        offset: -0.25,
        base: stockRemainderBase,
      },
      {
        x: filteredIGs,
        y: filteredCompWeights,
        type: "bar",
        name: comparisonStock?.name ?? emptyCompName,
        marker: { color: "rgba(255, 127, 80, 0.8)" },
        width: 0.35,
        offset: 0.25,
      },
      {
        x: filteredIGs,
        y: compRemainders,
        type: "bar",
        marker: { color: "lightgray" },
        opacity: 0.3,
        showlegend: false,
        width: 0.35,
        offset: 0.25,
        base: filteredCompWeights,
      },
    ] as any;

    return (
      <Plot
        data={data}
        layout={{
          barmode: "group",
          bargap: 0.65,
          bargroupgap: 0.05,
          height: 300,
          margin: { l: 60, r: 20, t: 45, b: 60 },
          yaxis: {
            title: { text: "Weight (%)" },
            range: [0, 100],
            tickmode: "linear",
            tick0: 0,
            dtick: 20,
            zeroline: true,
            zerolinewidth: 2,
            zerolinecolor: "black",
            showline: true,
            linewidth: 2,
            linecolor: "black",
          },
          xaxis: {
            title: { text: "" },
            tickvals: filteredSectorData.positions.map((v) => v - 0.3),
            side: "top",
            tickangle: -25,
          },
          shapes,
          showlegend: false,
        } as any}
        config={{ displayModeBar: false, responsive: true } as any}
        style={{ width: "100%" }}
      />
    );
  }

  const {
    traces,
    separatorPosition,
    positions,
    sectors,
    onlyCompHasWeight,
  } = (() => {
    const tempData: Array<{
      sector: string;
      stockWeight: number;
      compWeight: number;
    }> = [];

    allSectorNames.forEach((sector) => {
      const stockW = selectedStock?.sectors[sector] || 0;
      const compW = comparisonStock?.sectors[sector] || 0;
      if (stockW > 0 || compW > 0) {
        tempData.push({ sector, stockWeight: stockW, compWeight: compW });
      }
    });

    const selectedHasWeight = tempData.filter((item) => item.stockWeight > 0);
    const onlyCompHasWeightLocal = tempData.filter(
      (item) => item.stockWeight === 0 && item.compWeight > 0
    );

    selectedHasWeight.sort((a, b) => b.stockWeight - a.stockWeight);
    onlyCompHasWeightLocal.sort((a, b) => b.compWeight - a.compWeight);

    const combinedData = [...selectedHasWeight, ...onlyCompHasWeightLocal];

    const sectorsLocal: string[] = [];
    const stockWeights: number[] = [];
    const compWeights: number[] = [];
    const positionsLocal: number[] = [];

    combinedData.forEach((item, idx) => {
      sectorsLocal.push(item.sector);
      stockWeights.push(item.stockWeight);
      compWeights.push(item.compWeight);
      positionsLocal.push(idx + 1);
    });

    const stockPositions: number[] = [];
    const stockWeightsFiltered: number[] = [];
    const stockRemainderPositions: number[] = [];
    const stockRemainderValues: number[] = [];
    const stockRemainderBase: number[] = [];

    combinedData.forEach((item, idx) => {
      if (item.stockWeight > 0) {
        stockPositions.push(idx + 1);
        stockWeightsFiltered.push(item.stockWeight);
        stockRemainderPositions.push(idx + 1);
        stockRemainderValues.push(100 - item.stockWeight);
        stockRemainderBase.push(item.stockWeight);
      }
    });

    const compRemainders = compWeights.map((w) => 100 - w);
    const separatorPositionLocal = selectedHasWeight.length + 0.9;

    const tracesLocal = [
      {
        x: stockPositions,
        y: stockWeightsFiltered,
        type: "bar",
        name: selectedStock?.name ?? emptyStockName,
        marker: { color: "rgba(66, 133, 244, 0.8)" },
        width: 0.35,
        offset: -0.25,
      },
      {
        x: stockRemainderPositions,
        y: stockRemainderValues,
        type: "bar",
        marker: { color: "lightgray" },
        opacity: 0.3,
        showlegend: false,
        width: 0.35,
        offset: -0.25,
        base: stockRemainderBase,
      },
      {
        x: positionsLocal,
        y: compWeights,
        type: "bar",
        name: comparisonStock?.name ?? emptyCompName,
        marker: { color: "rgba(255, 127, 80, 0.8)" },
        width: 0.35,
        offset: 0.25,
      },
      {
        x: positionsLocal,
        y: compRemainders,
        type: "bar",
        marker: { color: "lightgray" },
        opacity: 0.2,
        showlegend: false,
        width: 0.35,
        offset: 0.25,
        base: compWeights,
      },
    ] as any;

    return {
      traces: tracesLocal,
      separatorPosition: separatorPositionLocal,
      positions: positionsLocal,
      sectors: sectorsLocal,
      onlyCompHasWeight: onlyCompHasWeightLocal,
    };
  })();

  return (
    <Plot
      data={traces}
      layout={{
        barmode: "overlay",
        bargap: 0.65,
        height: 300,
        margin: { l: 60, r: 20, t: 45, b: 60 },
        yaxis: {
          title: { text: "Weight (%)" },
          range: [0, 100],
          tickmode: "linear",
          tick0: 0,
          dtick: 20,
          zeroline: true,
          zerolinewidth: 2,
          zerolinecolor: "black",
          showline: true,
          linewidth: 2,
          linecolor: "black",
        },
        xaxis: {
          title: { text: "" },
          tickmode: "array",
          tickvals: positions,
          ticktext: sectors,
          range: [0.5, 11.5],
          side: "top",
          tickangle: -25,
        },
        shapes: onlyCompHasWeight.length > 0
          ? [
              {
                type: "line",
                xref: "x",
                yref: "paper",
                x0: separatorPosition,
                x1: separatorPosition,
                y0: 0,
                y1: 1,
                line: {
                  color: "gray",
                  width: 2,
                  dash: "dot",
                },
              },
            ]
          : [],
        showlegend: false,
      } as any}
      config={{ displayModeBar: false, responsive: true } as any}
      style={{ width: "100%" }}
    />
  );
};

export default WeightCharts;

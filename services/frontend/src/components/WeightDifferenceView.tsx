import React, { useMemo } from "react";
import {
  Box,
  Typography,
} from "@mui/material";
import Plot from "react-plotly.js";
import rawStockData from "../stock_data.json";
import rawAllBenchmarks from "../all_benchmarks.json";
import sectorColorConfig from "../sectorColors.json";
import sectorOrderConfig from "../sectorOrder.json";

interface CombinedStock {
  isin: string;
  name: string;
  country: string;
  marketCapEUR: number;
  sectors: Record<string, number>;
  industryGroups: Record<string, number>;
}

const STOCKS = rawStockData as unknown as CombinedStock[];

interface WeightDifferenceViewProps {
  selectedStockIsin: string;
  onStockSelect: (isin: string) => void;
  portfolio2Key: string;
  setPortfolio2Key: (key: string) => void;
  benchmarkId: string;
  setBenchmarkId: (id: string) => void;
  benchmark2Id: string;
  setBenchmark2Id: (id: string) => void;
  baseline: string;
  setBaseline: (baseline: string) => void;
  level: Level;
  setLevel: (level: Level) => void;
  categoryFilter: CategoryFilter;
  setCategoryFilter: (filter: CategoryFilter) => void;
}

type Level = "Sectors" | "Industry Groups";
type CategoryFilter = "All" | "Top 5" | "Top 10";

type BenchmarksStructure = Record<
  string,
  [number, Record<string, number>]
>;

interface CountryRegionMarketBenchmark {
  level: "country" | "region" | "market";
  code: string;
  name: string;
  benchmarks: BenchmarksStructure;
}

interface AllBenchmarksJson {
  countries: Record<string, CountryRegionMarketBenchmark>;
  regions: Record<string, CountryRegionMarketBenchmark>;
  markets: Record<string, CountryRegionMarketBenchmark>;
}

const ALL_BENCHMARKS = rawAllBenchmarks as unknown as AllBenchmarksJson;

type BenchmarkOption = {
  id: string;
  label: string;
  level: "universe" | "country" | "region" | "market";
  ref?: CountryRegionMarketBenchmark;
};

const WeightDifferenceView: React.FC<WeightDifferenceViewProps> = ({ 
  selectedStockIsin, 
  onStockSelect,
  portfolio2Key,
  setPortfolio2Key,
  benchmarkId,
  setBenchmarkId,
  benchmark2Id,
  setBenchmark2Id,
  baseline,
  setBaseline,
  level,
  setLevel,
  categoryFilter,
  setCategoryFilter,
}) => {
  const hasData = STOCKS.length > 0;

  const benchmarkOptions: BenchmarkOption[] = useMemo(() => {
    const opts: BenchmarkOption[] = [
      { id: "none", label: "None (Portfolio 1 vs Portfolio 2)", level: "universe" },
      { id: "universe", label: "Universe average", level: "universe" },
    ];

    Object.entries(ALL_BENCHMARKS.countries).forEach(([code, bm]) => {
      opts.push({
        id: `country-${code}`,
        label: `${bm.name} (${code})`,
        level: "country",
        ref: bm,
      });
    });

    Object.entries(ALL_BENCHMARKS.regions).forEach(([region, bm]) => {
      opts.push({
        id: `region-${region}`,
        label: bm.name,
        level: "region",
        ref: bm,
      });
    });

    Object.entries(ALL_BENCHMARKS.markets).forEach(([market, bm]) => {
      opts.push({
        id: `market-${market}`,
        label: bm.name,
        level: "market",
        ref: bm,
      });
    });

    return opts;
  }, []);

  const currentBenchmark = useMemo(
    () =>
      benchmarkOptions.find((b) => b.id === benchmarkId) ??
      benchmarkOptions[0],
    [benchmarkOptions, benchmarkId]
  );

  const currentBenchmark2 = useMemo(
    () =>
      benchmarkOptions.find((b) => b.id === benchmark2Id) ??
      benchmarkOptions[0],
    [benchmarkOptions, benchmark2Id]
  );

  const portfolio1Stock = useMemo<CombinedStock | null>(
    () =>
      hasData && selectedStockIsin
        ? STOCKS.find((s) => s.isin === selectedStockIsin) ?? null
        : null,
    [hasData, selectedStockIsin]
  );

  const portfolio2IsAverage = portfolio2Key === "avg";
  const portfolio2IsNone = portfolio2Key === "";
  const portfolio2Stock = useMemo<CombinedStock | null>(
    () =>
      portfolio2IsAverage || !hasData || portfolio2IsNone
        ? null
        : STOCKS.find((s) => `stock:${s.isin}` === portfolio2Key) ?? null,
    [portfolio2IsAverage, hasData, portfolio2Key, portfolio2IsNone]
  );

  const sectorNames = useMemo(() => {
    // Use the shared ordered sectors list (ordered by average weight)
    return sectorOrderConfig.orderedSectors;
  }, []);

  const igNames = useMemo(() => {
    const set = new Set<string>();
    STOCKS.forEach((st) =>
      Object.keys(st.industryGroups || {}).forEach((k) => set.add(k))
    );
    return Array.from(set).sort();
  }, []);

  const allCategories =
    level === "Sectors" ? sectorNames : igNames;

  // Create color map for sectors
  const sectorColorMap = useMemo(() => {
    const distinctColors = sectorColorConfig.palette;
    const map: Record<string, string> = {};
    sectorOrderConfig.orderedSectors.forEach((sector, i) => {
      map[sector] = distinctColors[i % distinctColors.length];
    });
    return map;
  }, []);

  const universeBenchmarkAll = useMemo(() => {
    const avg: Record<string, number> = {};
    if (!hasData || allCategories.length === 0) return avg;

    allCategories.forEach((cat) => {
      const vals = STOCKS.map((s) =>
        level === "Sectors" ? s.sectors[cat] || 0 : s.industryGroups[cat] || 0
      );
      const sum = vals.reduce((a, b) => a + b, 0);
      avg[cat] = sum / vals.length;
    });

    return avg;
  }, [allCategories, level, hasData]);

  const benchmarkWeightsAllMap = useMemo(() => {
    const map: Record<string, number> = {};
    if (!allCategories.length) return map;

    if (
      !currentBenchmark ||
      currentBenchmark.level === "universe" ||
      !currentBenchmark.ref
    ) {
      allCategories.forEach((cat) => {
        map[cat] = universeBenchmarkAll[cat] ?? 0;
      });
      return map;
    }

    const benchStruct = currentBenchmark.ref.benchmarks;

    if (level === "Sectors") {
      allCategories.forEach((sector) => {
        const entry = benchStruct[sector];
        if (!entry) {
          map[sector] = 0;
        } else {
          const [sectorWeightFraction] = entry;
          map[sector] = sectorWeightFraction * 100;
        }
      });
    } else {
      allCategories.forEach((igName) => {
        let igWeightFraction = 0;
        for (const sector of Object.keys(benchStruct)) {
          const entry = benchStruct[sector];
          if (!entry) continue;
          const [, igDict] = entry;
          if (igName in igDict) {
            igWeightFraction = igDict[igName];
            break;
          }
        }
        map[igName] = igWeightFraction * 100;
      });
    }

    return map;
  }, [allCategories, currentBenchmark, level, universeBenchmarkAll]);

  const categoriesList = useMemo(() => {
    if (categoryFilter === "All") return allCategories;
    const n = categoryFilter === "Top 5" ? 5 : 10;
    const weighted = allCategories.map((cat) => ({
      cat,
      w: benchmarkWeightsAllMap[cat] ?? 0,
    }));
    weighted.sort((a, b) => b.w - a.w);
    return weighted.slice(0, n).map((x) => x.cat);
  }, [allCategories, benchmarkWeightsAllMap, categoryFilter]);

  const getPortfolioWeights = (
    stock: CombinedStock | null,
    useAverageUniverse: boolean,
    cats: string[]
  ): number[] => {
    if (useAverageUniverse) {
      return cats.map((cat) => universeBenchmarkAll[cat] ?? 0);
    }
    if (!stock) {
      return cats.map(() => 0);
    }
    return cats.map((cat) =>
      level === "Sectors"
        ? stock.sectors[cat] || 0
        : stock.industryGroups[cat] || 0
    );
  };

  const portfolio1Weights = useMemo(
    () => getPortfolioWeights(portfolio1Stock, false, categoriesList),
    [portfolio1Stock, categoriesList, level, universeBenchmarkAll]
  );

  const portfolio2Weights = useMemo(
    () =>
      getPortfolioWeights(
        portfolio2Stock,
        portfolio2IsAverage,
        categoriesList
      ),
    [portfolio2Stock, portfolio2IsAverage, categoriesList, level, universeBenchmarkAll]
  );

  const benchmarkWeights = useMemo(
    () => categoriesList.map((cat) => benchmarkWeightsAllMap[cat] ?? 0),
    [categoriesList, benchmarkWeightsAllMap]
  );

  const benchmark2WeightsAllMap = useMemo(() => {
    const map: Record<string, number> = {};
    if (!allCategories.length) return map;

    if (
      !currentBenchmark2 ||
      currentBenchmark2.level === "universe" ||
      !currentBenchmark2.ref
    ) {
      allCategories.forEach((cat) => {
        map[cat] = universeBenchmarkAll[cat] ?? 0;
      });
      return map;
    }

    const benchStruct = currentBenchmark2.ref.benchmarks;

    if (level === "Sectors") {
      allCategories.forEach((sector) => {
        const entry = benchStruct[sector];
        if (!entry) {
          map[sector] = 0;
        } else {
          const [sectorWeightFraction] = entry;
          map[sector] = sectorWeightFraction * 100;
        }
      });
    } else {
      allCategories.forEach((igName) => {
        let igWeightFraction = 0;
        for (const sector of Object.keys(benchStruct)) {
          const entry = benchStruct[sector];
          if (!entry) continue;
          const [, igDict] = entry;
          if (igName in igDict) {
            igWeightFraction = igDict[igName];
            break;
          }
        }
        map[igName] = igWeightFraction * 100;
      });
    }

    return map;
  }, [allCategories, currentBenchmark2, level, universeBenchmarkAll]);

  const benchmark2Weights = useMemo(
    () => categoriesList.map((cat) => benchmark2WeightsAllMap[cat] ?? 0),
    [categoriesList, benchmark2WeightsAllMap]
  );

  const portfolio1IsNone = selectedStockIsin === "";

  const portfolio1Label = portfolio1Stock?.name ?? "None";

  const portfolio2Label = portfolio2IsNone
    ? "None"
    : portfolio2IsAverage
    ? `${level} Universe average`
    : portfolio2Stock?.name ?? "Portfolio 2";

  const benchmarkLabel = currentBenchmark?.label ?? "Benchmark 1";
  const benchmark2Label = currentBenchmark2?.label ?? "Benchmark 2";

  // Get baseline weights
  const baselineWeights = useMemo(() => {
    if (baseline === "portfolio1") return portfolio1Weights;
    if (baseline === "portfolio2") return portfolio2Weights;
    if (baseline === "benchmark1") return benchmarkWeights;
    if (baseline === "benchmark2") return benchmark2Weights;
    return categoriesList.map(() => 0);
  }, [baseline, portfolio1Weights, portfolio2Weights, benchmarkWeights, benchmark2Weights, categoriesList]);

  // Build list of active (non-baseline, non-None) inputs
  const activeInputs = useMemo(() => {
    const inputs: Array<{ key: string; weights: number[]; label: string; color: string }> = [];
    const grayPalette = sectorColorConfig.weightDifferencePalette;
    let colorIndex = 0;
    
    if (baseline !== "portfolio1" && !portfolio1IsNone) {
      inputs.push({
        key: "portfolio1",
        weights: portfolio1Weights,
        label: portfolio1Label,
        color: grayPalette[colorIndex % grayPalette.length],
      });
      colorIndex++;
    }
    
    if (baseline !== "portfolio2" && !portfolio2IsNone) {
      inputs.push({
        key: "portfolio2",
        weights: portfolio2Weights,
        label: portfolio2Label,
        color: grayPalette[colorIndex % grayPalette.length],
      });
      colorIndex++;
    }
    
    if (baseline !== "benchmark1" && benchmarkId !== "none") {
      inputs.push({
        key: "benchmark1",
        weights: benchmarkWeights,
        label: benchmarkLabel,
        color: grayPalette[colorIndex % grayPalette.length],
      });
      colorIndex++;
    }
    
    if (baseline !== "benchmark2" && benchmark2Id !== "none") {
      inputs.push({
        key: "benchmark2",
        weights: benchmark2Weights,
        label: benchmark2Label,
        color: grayPalette[colorIndex % grayPalette.length],
      });
      colorIndex++;
    }
    
    return inputs;
  }, [
    baseline,
    portfolio1IsNone,
    portfolio2IsNone,
    benchmarkId,
    benchmark2Id,
    portfolio1Weights,
    portfolio2Weights,
    benchmarkWeights,
    benchmark2Weights,
    portfolio1Label,
    portfolio2Label,
    benchmarkLabel,
    benchmark2Label,
  ]);

  const baselineLabel = useMemo(() => {
    if (baseline === "portfolio1") return portfolio1Label;
    if (baseline === "portfolio2") return portfolio2Label;
    if (baseline === "benchmark1") return benchmarkLabel;
    if (baseline === "benchmark2") return benchmark2Label;
    return "Baseline";
  }, [baseline, portfolio1Label, portfolio2Label, benchmarkLabel, benchmark2Label]);

  // Calculate data: one bar per active input, showing difference from baseline
  const data = useMemo(() => {
    if (activeInputs.length === 0) {
      return [
        {
          type: "bar" as const,
          orientation: "h" as const,
          x: categoriesList.map(() => 0),
          y: categoriesList,
          name: "No data",
          marker: { color: "rgba(200, 200, 200, 0.5)" },
          hovertemplate: "<b>%{y}</b><br>No active inputs<extra></extra>",
        },
      ];
    }

    return activeInputs.map((input) => {
      const diff = input.weights.map((w, i) => (baselineWeights[i] ?? 0) - w);
      return {
        type: "bar" as const,
        orientation: "h" as const,
        x: diff,
        y: categoriesList,
        name: `${baselineLabel} - ${input.label}`,
        marker: { color: input.color },
        hovertemplate:
          "<b>%{y}</b><br>" +
          `${baselineLabel} - ${input.label}: %{x:.2f}%<extra></extra>`,
      };
    });
  }, [activeInputs, baselineWeights, categoriesList, baselineLabel]);

  const maxAbs = useMemo(() => {
    const allVals = data.flatMap(trace => trace.x).map((v: number) => Math.abs(v || 0));
    const m = allVals.length ? Math.max(...allVals) : 0;
    return m > 0 ? m * 1.2 : 10;
  }, [data]);

  if (!hasData) {
    return (
      <Typography variant="body2" color="text.secondary">
        No data available in stock_data.json.
      </Typography>
    );
  }

  const layout = {
    barmode: "group" as const,
    height: 413,
    margin: { l: 150, r: 20, t: 20, b: 20 },
    xaxis: {
      title: "% difference vs benchmark",
      ticksuffix: "%",
      range: [-maxAbs, maxAbs],
      zeroline: true,
      zerolinewidth: 2,
      showgrid: true,
      gridcolor: "rgba(128, 128, 128, 0.2)",
      gridwidth: 1,
    },
    yaxis: { 
      autorange: "reversed" as const,
      showgrid: false,
    },
    shapes: [
      // Add horizontal grid lines
      ...categoriesList.flatMap((_, idx) => [
        {
          type: "line" as const,
          x0: -maxAbs,
          x1: maxAbs,
          y0: idx - 0.5,
          y1: idx - 0.5,
          line: {
            color: "rgba(128, 128, 128, 0.3)",
            width: 1,
          },
        },
        {
          type: "line" as const,
          x0: -maxAbs,
          x1: maxAbs,
          y0: idx + 0.5,
          y1: idx + 0.5,
          line: {
            color: "rgba(128, 128, 128, 0.3)",
            width: 1,
          },
        },
      ]),
    ],
    showlegend: false,
  };

  return (
    <Box>
      <Plot
        data={data as any}
        layout={layout as any}
        style={{ width: "100%" }}
        config={{ displayModeBar: false, responsive: true } as any}
      />
    </Box>
  );
};

export default WeightDifferenceView;

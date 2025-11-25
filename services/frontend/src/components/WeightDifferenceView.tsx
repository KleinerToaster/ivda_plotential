import React, { useMemo, useState } from "react";
import {
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import Plot from "react-plotly.js";
import rawStockData from "../stock_data.json";
import rawAllBenchmarks from "../all_benchmarks.json";

interface CombinedStock {
  isin: string;
  name: string;
  country: string;
  marketCapEUR: number;
  sectors: Record<string, number>;
  industryGroups: Record<string, number>;
}

const STOCKS = rawStockData as unknown as CombinedStock[];

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

type BaselineOption = {
  id: string;
  label: string;
  level: "universe" | "country" | "region" | "market";
  ref?: CountryRegionMarketBenchmark;
};

const WeightDifferenceView: React.FC = () => {
  const hasData = STOCKS.length > 0;

  const [portfolio1Isin, setPortfolio1Isin] = useState<string>(
    STOCKS[0]?.isin ?? ""
  );

  const [portfolio2Key, setPortfolio2Key] = useState<string>(() => {
    const second = STOCKS[1]?.isin ?? STOCKS[0]?.isin ?? "";
    return second ? `stock:${second}` : "avg";
  });

  const [level, setLevel] = useState<Level>("Sectors");
  const [categoryFilter, setCategoryFilter] =
    useState<CategoryFilter>("All");

  const baselineOptions: BaselineOption[] = useMemo(() => {
    const opts: BaselineOption[] = [
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

  const [baselineId, setBaselineId] = useState<string>("universe");

  const currentBaseline = useMemo(
    () =>
      baselineOptions.find((b) => b.id === baselineId) ??
      baselineOptions[0],
    [baselineOptions, baselineId]
  );

  const portfolio1Stock = useMemo<CombinedStock | null>(
    () =>
      hasData
        ? STOCKS.find((s) => s.isin === portfolio1Isin) ?? STOCKS[0]
        : null,
    [hasData, portfolio1Isin]
  );

  const portfolio2IsAverage = portfolio2Key === "avg";
  const portfolio2Stock = useMemo<CombinedStock | null>(
    () =>
      portfolio2IsAverage || !hasData
        ? null
        : STOCKS.find((s) => `stock:${s.isin}` === portfolio2Key) ?? null,
    [portfolio2IsAverage, hasData, portfolio2Key]
  );

  const sectorNames = useMemo(() => {
    const set = new Set<string>();
    STOCKS.forEach((st) =>
      Object.keys(st.sectors || {}).forEach((k) => set.add(k))
    );
    return Array.from(set).sort();
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

  const universeBaselineAll = useMemo(() => {
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

  const baselineWeightsAllMap = useMemo(() => {
    const map: Record<string, number> = {};
    if (!allCategories.length) return map;

    if (
      !currentBaseline ||
      currentBaseline.level === "universe" ||
      !currentBaseline.ref
    ) {
      allCategories.forEach((cat) => {
        map[cat] = universeBaselineAll[cat] ?? 0;
      });
      return map;
    }

    const benchStruct = currentBaseline.ref.benchmarks;

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
  }, [allCategories, currentBaseline, level, universeBaselineAll]);

  const categoriesList = useMemo(() => {
    if (categoryFilter === "All") return allCategories;
    const n = categoryFilter === "Top 5" ? 5 : 10;
    const weighted = allCategories.map((cat) => ({
      cat,
      w: baselineWeightsAllMap[cat] ?? 0,
    }));
    weighted.sort((a, b) => b.w - a.w);
    return weighted.slice(0, n).map((x) => x.cat);
  }, [allCategories, baselineWeightsAllMap, categoryFilter]);

  const getPortfolioWeights = (
    stock: CombinedStock | null,
    useAverageUniverse: boolean,
    cats: string[]
  ): number[] => {
    if (useAverageUniverse) {
      return cats.map((cat) => universeBaselineAll[cat] ?? 0);
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
    [portfolio1Stock, categoriesList, level, universeBaselineAll]
  );

  const portfolio2Weights = useMemo(
    () =>
      getPortfolioWeights(
        portfolio2Stock,
        portfolio2IsAverage,
        categoriesList
      ),
    [portfolio2Stock, portfolio2IsAverage, categoriesList, level, universeBaselineAll]
  );

  const baselineWeights = useMemo(
    () => categoriesList.map((cat) => baselineWeightsAllMap[cat] ?? 0),
    [categoriesList, baselineWeightsAllMap]
  );

  const diffP1 = useMemo(
    () =>
      portfolio1Weights.map(
        (w, i) => w - (baselineWeights[i] ?? 0)
      ),
    [portfolio1Weights, baselineWeights]
  );

  const diffP2 = useMemo(
    () =>
      portfolio2Weights.map(
        (w, i) => w - (baselineWeights[i] ?? 0)
      ),
    [portfolio2Weights, baselineWeights]
  );

  const maxAbs = useMemo(() => {
    const allVals = [...diffP1, ...diffP2].map((v) => Math.abs(v || 0));
    const m = allVals.length ? Math.max(...allVals) : 0;
    return m > 0 ? m * 1.2 : 10;
  }, [diffP1, diffP2]);

  if (!hasData || !portfolio1Stock) {
    return (
      <Typography variant="body2" color="text.secondary">
        No data available in stock_data.json.
      </Typography>
    );
  }

  const portfolio2Label = portfolio2IsAverage
    ? `${level} Universe average`
    : portfolio2Stock?.name ?? "Portfolio 2";

  const baselineLabel = currentBaseline?.label ?? "Baseline";

  const data = [
    {
      type: "bar" as const,
      orientation: "h" as const,
      x: diffP1,
      y: categoriesList,
      name: portfolio1Stock.name,
      marker: { color: "rgba(66, 133, 244, 0.8)" },
      hovertemplate:
        "<b>%{y}</b><br>" +
        `${portfolio1Stock.name} vs ${baselineLabel}: %{x:.2f}%<extra></extra>`,
    },
    {
      type: "bar" as const,
      orientation: "h" as const,
      x: diffP2,
      y: categoriesList,
      name: portfolio2Label,
      marker: {
        color: "rgba(219, 68, 55, 0.1)",
        line: { color: "rgba(219, 68, 55, 1)", width: 2 },
      },
      hovertemplate:
        "<b>%{y}</b><br>" +
        `${portfolio2Label} vs ${baselineLabel}: %{x:.2f}%<extra></extra>`,
    },
  ];

  const layout = {
    barmode: "overlay" as const,
    height: 330,
    margin: { l: 140, r: 40, t: 40, b: 50 },
    xaxis: {
      title: "% difference vs baseline",
      ticksuffix: "%",
      range: [-maxAbs, maxAbs],
      zeroline: true,
      zerolinewidth: 2,
    },
    yaxis: { autorange: "reversed" as const },
    showlegend: true,
  };

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 2 }}>
        Weight Differences Analysis
      </Typography>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "repeat(5, 1fr)" },
          gap: 2,
          mb: 2,
        }}
      >
        <FormControl fullWidth size="small">
          <InputLabel>Portfolio 1 (Stock)</InputLabel>
          <Select
            value={portfolio1Isin}
            label="Portfolio 1 (Stock)"
            onChange={(e) => setPortfolio1Isin(e.target.value)}
          >
            {STOCKS.map((s) => (
              <MenuItem key={s.isin} value={s.isin}>
                {s.name} ({s.isin})
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl fullWidth size="small">
          <InputLabel>Portfolio 2</InputLabel>
          <Select
            value={portfolio2Key}
            label="Portfolio 2"
            onChange={(e) => setPortfolio2Key(e.target.value)}
          >
            {STOCKS.map((s) => (
              <MenuItem key={s.isin} value={`stock:${s.isin}`}>
                {s.name} ({s.isin})
              </MenuItem>
            ))}
            <MenuItem value="avg">{level} Universe average</MenuItem>
          </Select>
        </FormControl>

        <FormControl fullWidth size="small">
          <InputLabel>Baseline</InputLabel>
          <Select
            value={baselineId}
            label="Baseline"
            onChange={(e) => setBaselineId(e.target.value as string)}
          >
            {baselineOptions.map((b) => (
              <MenuItem key={b.id} value={b.id}>
                {b.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl fullWidth size="small">
          <InputLabel>Hierarchical Level</InputLabel>
          <Select
            value={level}
            label="Hierarchical Level"
            onChange={(e) => setLevel(e.target.value as Level)}
          >
            <MenuItem value="Sectors">Sectors</MenuItem>
            <MenuItem value="Industry Groups">Industry Groups</MenuItem>
          </Select>
        </FormControl>

        <FormControl fullWidth size="small">
          <InputLabel>Categories</InputLabel>
          <Select
            value={categoryFilter}
            label="Categories"
            onChange={(e) =>
              setCategoryFilter(e.target.value as CategoryFilter)
            }
          >
            <MenuItem value="All">All</MenuItem>
            <MenuItem value="Top 5">Top 5</MenuItem>
            <MenuItem value="Top 10">Top 10</MenuItem>
          </Select>
        </FormControl>
      </Box>

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

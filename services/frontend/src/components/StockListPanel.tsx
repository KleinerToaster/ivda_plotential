import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Slider,
  ToggleButtonGroup,
  ToggleButton,
  Paper,
  List,
  ListItem,
  ListItemText,
  Divider,
  Collapse,
  ListItemButton,
} from "@mui/material";
import ExpandLess from "@mui/icons-material/ExpandLess";
import ExpandMore from "@mui/icons-material/ExpandMore";
import Plot from "react-plotly.js";
import rawStockData from "../stock_data.json";
import rawAllBenchmarks from "../all_benchmarks.json";
import sectorColorConfig from "../sectorColors.json";
import sectorOrderConfig from "../sectorOrder.json";

type SortOrder = "asc" | "desc";

interface StockListPanelProps {
  section?: "drilldown" | "lower";
  selectedStockIsin: string;
  onStockSelect: (isin: string) => void;
}

// Ordered by average sector weight across all firms (highest to lowest)
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

const REGION_TO_COUNTRIES: Record<string, string[]> = {
  Europe: [
    "AT",
    "BE",
    "CH",
    "DE",
    "DK",
    "ES",
    "FR",
    "GB",
    "IE",
    "IL",
    "IT",
    "LU",
    "NL",
    "NO",
    "PT",
    "SE",
  ],
  "North America": ["BM", "CA", "PA", "US"],
  "South America": ["CL", "PE"],
  Asia: ["CN", "HK", "IN", "JP", "KR", "SG"],
  Africa: ["ZA"],
  Oceania: ["AU"],
  World: [
    "AT",
    "AU",
    "BE",
    "BM",
    "CA",
    "CH",
    "CL",
    "CN",
    "DE",
    "DK",
    "ES",
    "FR",
    "GB",
    "HK",
    "IE",
    "IL",
    "IN",
    "IT",
    "JP",
    "KR",
    "LU",
    "NL",
    "NO",
    "PA",
    "PE",
    "PT",
    "SE",
    "SG",
    "US",
    "ZA",
  ],
};

const MARKET_TO_COUNTRIES: Record<string, string[]> = {
  Developed: [
    "AT",
    "AU",
    "BE",
    "CA",
    "CH",
    "DE",
    "DK",
    "ES",
    "FR",
    "GB",
    "IE",
    "IL",
    "IT",
    "JP",
    "LU",
    "NL",
    "NO",
    "PT",
    "SE",
    "SG",
    "US",
  ],
  Emerging: ["BM", "CL", "CN", "HK", "IN", "KR", "PA", "PE", "ZA"],
  "Investable Universe": [
    "AT",
    "AU",
    "BE",
    "BM",
    "CA",
    "CH",
    "CL",
    "CN",
    "DE",
    "DK",
    "ES",
    "FR",
    "GB",
    "HK",
    "IE",
    "IL",
    "IN",
    "IT",
    "JP",
    "KR",
    "LU",
    "NL",
    "NO",
    "PA",
    "PE",
    "PT",
    "SE",
    "SG",
    "US",
    "ZA",
  ],
};

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

interface Stock {
  name: string;
  percentage: number;
  subset: string;
}

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
const COMBINED_STOCKS = rawStockData as unknown as CombinedStock[];

type BenchmarkOption = {
  id: string;
  label: string;
  level: "universe" | "country" | "region" | "market";
  ref?: CountryRegionMarketBenchmark;
};

const getTopIndustryGroup = (
  s: CombinedStock
): { name: string | null; weight: number } => {
  if (s.topIndustryGroup && typeof s.topIndustryGroupWeight === "number") {
    return { name: s.topIndustryGroup, weight: s.topIndustryGroupWeight };
  }

  const entries = Object.entries(s.industryGroups || {});
  if (!entries.length) return { name: null, weight: 0 };
  const [igName, igWeight] = entries.sort((a, b) => b[1] - a[1])[0];
  return { name: igName, weight: igWeight };
};

const getTopSector = (
  s: CombinedStock
): { name: string | null; weight: number } => {
  const entries = Object.entries(s.sectors || {});
  if (!entries.length) return { name: null, weight: 0 };
  const [sectorName, sectorWeight] = entries.sort((a, b) => b[1] - a[1])[0];
  return { name: sectorName, weight: sectorWeight };
};

const mean = (vals: number[]): number => {
  const valid = vals.filter((v) => !Number.isNaN(v));
  if (!valid.length) return 0;
  return valid.reduce((a, b) => a + b, 0) / valid.length;
};

const median = (vals: number[]): number => {
  const valid = vals.filter((v) => !Number.isNaN(v)).sort((a, b) => a - b);
  if (!valid.length) return 0;
  const mid = Math.floor(valid.length / 2);
  if (valid.length % 2 === 0) {
    return (valid[mid - 1] + valid[mid]) / 2;
  }
  return valid[mid];
};

const StockListPanel: React.FC<StockListPanelProps> = ({ section, selectedStockIsin, onStockSelect }) => {
  const combinedStocks = COMBINED_STOCKS;

  // Sector color palette loaded from shared config
  const sectorColorPalette = useMemo(() => {
    return sectorColorConfig.palette;
  }, []);

  const sectorColorMap = useMemo(() => {
    // Use the shared ordered sectors list (ordered by average weight)
    const sectors = sectorOrderConfig.orderedSectors;
    const map: Record<string, string> = {};
    sectors.forEach((sector, i) => {
      map[sector] = sectorColorPalette[i % sectorColorPalette.length];
    });
    return map;
  }, [sectorColorPalette]);

  const benchmarkOptions: BenchmarkOption[] = useMemo(() => {
    const opts: BenchmarkOption[] = [
      {
        id: "universe",
        label: "Universe average",
        level: "universe",
      },
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
        label: `${bm.name}`,
        level: "region",
        ref: bm,
      });
    });

    Object.entries(ALL_BENCHMARKS.markets).forEach(([market, bm]) => {
      opts.push({
        id: `market-${market}`,
        label: `${bm.name}`,
        level: "market",
        ref: bm,
      });
    });

    return opts;
  }, []);

  const allSectorNames = useMemo(() => {
    const set = new Set<string>();
    combinedStocks.forEach((s) =>
      Object.keys(s.sectors || {}).forEach((k) => set.add(k))
    );
    return Array.from(set).sort();
  }, [combinedStocks]);

  const allIGNames = useMemo(() => {
    const set = new Set<string>();
    combinedStocks.forEach((s) =>
      Object.keys(s.industryGroups || {}).forEach((k) => set.add(k))
    );
    return Array.from(set).sort();
  }, [combinedStocks]);

  const sectorIGMapping = useMemo(
    () =>
      Object.entries(SECTOR_TO_INDUSTRY_GROUPS).map(([sector, groups]) => ({
        sector,
        groups,
      })),
    []
  );

  const stocksForSubsetList: Stock[] = useMemo(
    () =>
      combinedStocks
        .map((cs) => {
          const { name, weight } = getTopIndustryGroup(cs);
          if (!name) return null;
          return {
            name: cs.name,
            percentage: weight,
            subset: name,
          } as Stock;
        })
        .filter((x): x is Stock => x !== null),
    [combinedStocks]
  );

  const [subset, setSubset] = useState<string>("");
  const [cutoffRange, setCutoffRange] = useState<number[]>([0, 100]);
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [activeListType, setActiveListType] = useState<"subset" | "sector">("subset");

  // Keep histogram margins centralized so the slider aligns perfectly with the x-axis width
  const histogramMargin = useMemo(() => ({ l: 16, r: 12, t: 5, b: 25 }), []);

  const subsets = useMemo(
    () => Array.from(new Set(stocksForSubsetList.map((s) => s.subset))).sort(),
    [stocksForSubsetList]
  );

  useEffect(() => {
    if (!subset && subsets.length > 0) {
      setSubset(subsets[0]);
      setActiveListType("subset");
    }
  }, [subsets, subset]);

  const subsetStocks = useMemo(
    () => stocksForSubsetList.filter((s) => s.subset === subset),
    [stocksForSubsetList, subset]
  );

  const [sectorListFocus, setSectorListFocus] = useState<string>(
    () => allSectorNames[0] ?? ""
  );

  const sectorStockList = useMemo(() => {
    if (!sectorListFocus) return [];
    return combinedStocks
      .map((stock) => ({
        isin: stock.isin,
        name: stock.name,
        percentage: stock.sectors[sectorListFocus] ?? 0,
      }))
      .filter((entry) => entry.percentage > 0)
      .sort((a, b) => b.percentage - a.percentage);
  }, [combinedStocks, sectorListFocus]);

  const filteredStocks = useMemo(() => {
    const [lowerBound, upperBound] = cutoffRange;
    const withinBounds = subsetStocks.filter(
      (s) => s.percentage >= lowerBound && s.percentage <= upperBound
    );
    return [...withinBounds].sort((a, b) =>
      sortOrder === "asc"
        ? a.percentage - b.percentage
        : b.percentage - a.percentage
    );
  }, [subsetStocks, cutoffRange, sortOrder]);

  const filteredSectorStocks = useMemo(() => {
    const [lowerBound, upperBound] = cutoffRange;
    const withinBounds = sectorStockList.filter(
      (s) => s.percentage >= lowerBound && s.percentage <= upperBound
    );
    return [...withinBounds].sort((a, b) =>
      sortOrder === "asc"
        ? a.percentage - b.percentage
        : b.percentage - a.percentage
    );
  }, [sectorStockList, cutoffRange, sortOrder]);

  const subsetWeights = subsetStocks.map((s) => s.percentage);

  const activeListItems = useMemo(() => {
    if (activeListType === "sector") {
      return filteredSectorStocks.map((stock) => ({
        id: stock.isin,
        name: stock.name,
        percentage: stock.percentage,
      }));
    }

    return filteredStocks.map((stock, idx) => ({
      id: `${stock.name}-${idx}`,
      name: stock.name,
      percentage: stock.percentage,
    }));
  }, [activeListType, sectorStockList, filteredStocks, filteredSectorStocks]);

  const [expandedSectors, setExpandedSectors] = useState<Set<string>>(new Set());
  const [scatterSector, setScatterSector] = useState<string>(
    () => allSectorNames[0] ?? ""
  );

  const handleToggleSector = (sector: string) => {
    // Set this sector as the x-axis for the scatterplot
    setScatterSector(sector);
    setSectorListFocus(sector);
    setActiveListType("sector");
    
    setExpandedSectors((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(sector)) {
        newSet.delete(sector);
      } else {
        newSet.add(sector);
      }
      return newSet;
    });
  };

  const [scatterIG, setScatterIG] = useState<string>(
    () => allIGNames[0] ?? ""
  );

  useEffect(() => {
    if (!scatterSector && allSectorNames.length) {
      setScatterSector(allSectorNames[0]);
    }
  }, [scatterSector, allSectorNames]);

  useEffect(() => {
    if (!sectorListFocus && allSectorNames.length) {
      setSectorListFocus(allSectorNames[0]);
    }
  }, [sectorListFocus, allSectorNames]);

  useEffect(() => {
    if (!scatterIG && allIGNames.length) {
      setScatterIG(allIGNames[0]);
    }
  }, [scatterIG, allIGNames]);

  const scatterData = useMemo(() => {
    const dataByIG: Record<string, { x: number; y: number; name: string; ig: string }[]> = {};
    
    // Get industry groups that belong to the selected sector
    const sectorIGs = SECTOR_TO_INDUSTRY_GROUPS[scatterSector] || [];
    
    combinedStocks.forEach((stock) => {
      const sectorWeight = stock.sectors[scatterSector] ?? 0;
      
      // Only process if stock has weight in this sector
      if (sectorWeight > 0) {
        // Create a tuple only for industry groups that belong to this sector
        sectorIGs.forEach((ig) => {
          const igWeight = stock.industryGroups[ig] ?? 0;
          if (igWeight > 0) {
            if (!dataByIG[ig]) {
              dataByIG[ig] = [];
            }
            dataByIG[ig].push({
              x: sectorWeight,
              y: igWeight,
              name: stock.name,
              ig: ig,
            });
          }
        });
      }
    });
    
    return dataByIG;
  }, [combinedStocks, scatterSector]);

  const [comparisonStockIsin, setComparisonStockIsin] = useState<string>(
    combinedStocks[1]?.isin ?? combinedStocks[0]?.isin ?? ""
  );

  const [distBenchmarkId, setDistBenchmarkId] = useState<string>("universe");
  const [showIndustryGroups, setShowIndustryGroups] = useState<boolean>(true);
  const [showWeightDistributions, setShowWeightDistributions] =
    useState<boolean>(true);

  const currentBenchmark = useMemo(
    () =>
      benchmarkOptions.find((b) => b.id === distBenchmarkId) ??
      benchmarkOptions[0],
    [benchmarkOptions, distBenchmarkId]
  );

  const selectedStock = useMemo(
    () =>
      combinedStocks.find((s) => s.isin === selectedStockIsin) ||
      combinedStocks[0] ||
      null,
    [combinedStocks, selectedStockIsin]
  );

  const comparisonStock = useMemo(
    () =>
      combinedStocks.find((s) => s.isin === comparisonStockIsin) ||
      combinedStocks[1] ||
      combinedStocks[0] ||
      null,
    [combinedStocks, comparisonStockIsin]
  );

  const sectorPositions = useMemo(
    () => allSectorNames.map((_, i) => i + 1),
    [allSectorNames]
  );

  const filteredSectorData = useMemo(() => {
    if (!selectedStock) return { sectors: [], stockWeights: [], benchWeights: [], positions: [] };
    
    const tempData: Array<{ sector: string; stockWeight: number; benchWeight: number }> = [];
    
    allSectorNames.forEach((sector) => {
      const stockWeight = selectedStock.sectors[sector] || 0;
      
      // Only include sectors where the stock has non-zero weight
      if (stockWeight > 0) {
        let benchWeight = 0;
        
        if (!combinedStocks.length) {
          benchWeight = 0;
        } else if (
          !currentBenchmark ||
          currentBenchmark.level === "universe" ||
          !currentBenchmark.ref
        ) {
          benchWeight = mean(
            combinedStocks.map((s) =>
              s.sectors[sector] != null ? Number(s.sectors[sector]) : 0
            )
          );
        } else {
          const benchStruct = currentBenchmark.ref.benchmarks;
          const entry = benchStruct[sector];
          if (entry) {
            const [sectorWeightFraction] = entry;
            benchWeight = sectorWeightFraction * 100;
          }
        }
        
        tempData.push({ sector, stockWeight, benchWeight });
      }
    });
    
    // Sort by stock weight in descending order
    tempData.sort((a, b) => b.stockWeight - a.stockWeight);
    
    const sectors: string[] = [];
    const stockWeights: number[] = [];
    const benchWeights: number[] = [];
    const positions: number[] = [];
    
    tempData.forEach((item, idx) => {
      sectors.push(item.sector);
      stockWeights.push(item.stockWeight);
      benchWeights.push(item.benchWeight);
      positions.push(idx + 1);
    });
    
    return { sectors, stockWeights, benchWeights, positions };
  }, [allSectorNames, selectedStock, combinedStocks, currentBenchmark]);

  const distStockWeights = useMemo(() => {
    if (!selectedStock) return allSectorNames.map(() => 0);
    return allSectorNames.map((sector) => selectedStock.sectors[sector] || 0);
  }, [allSectorNames, selectedStock]);

  const distBenchWeights = useMemo(() => {
    if (!combinedStocks.length) return allSectorNames.map(() => 0);

    if (
      !currentBenchmark ||
      currentBenchmark.level === "universe" ||
      !currentBenchmark.ref
    ) {
      return allSectorNames.map((sector) =>
        mean(
          combinedStocks.map((s) =>
            s.sectors[sector] != null ? Number(s.sectors[sector]) : 0
          )
        )
      );
    }

    const benchStruct = currentBenchmark.ref.benchmarks;

    return allSectorNames.map((sector) => {
      const entry = benchStruct[sector];
      if (!entry) return 0;
      const [sectorWeightFraction] = entry;
      return sectorWeightFraction * 100;
    });
  }, [allSectorNames, combinedStocks, currentBenchmark]);

  const distSamplesBenchBySector: Record<string, number[]> = useMemo(() => {
    let sampleStocks = combinedStocks;

    if (currentBenchmark && currentBenchmark.level !== "universe" && currentBenchmark.ref) {
      const code = currentBenchmark.ref.code;
      if (currentBenchmark.level === "country") {
        sampleStocks = combinedStocks.filter((s) => s.country === code);
      } else if (currentBenchmark.level === "region") {
        const countries = REGION_TO_COUNTRIES[code] ?? [];
        if (countries.length) {
          sampleStocks = combinedStocks.filter((s) =>
            countries.includes(s.country)
          );
        }
      } else if (currentBenchmark.level === "market") {
        const countries = MARKET_TO_COUNTRIES[code] ?? [];
        if (countries.length) {
          sampleStocks = combinedStocks.filter((s) =>
            countries.includes(s.country)
          );
        }
      }
    }

    const map: Record<string, number[]> = {};
    filteredSectorData.sectors.forEach((sector) => {
      map[sector] = sampleStocks
        .map((s) => s.sectors[sector] || 0)
        .filter((v) => !Number.isNaN(v));
    });
    return map;
  }, [filteredSectorData.sectors, combinedStocks, currentBenchmark]);

  const igStockWeights = useMemo(() => {
    if (!selectedStock) return allIGNames.map(() => 0);
    return allIGNames.map((ig) => selectedStock.industryGroups[ig] || 0);
  }, [allIGNames, selectedStock]);

  const igBenchWeights = useMemo(() => {
    if (!combinedStocks.length) return allIGNames.map(() => 0);

    if (
      !currentBenchmark ||
      currentBenchmark.level === "universe" ||
      !currentBenchmark.ref
    ) {
      return allIGNames.map((ig) =>
        mean(
          combinedStocks.map((s) =>
            s.industryGroups[ig] != null ? Number(s.industryGroups[ig]) : 0
          )
        )
      );
    }

    const benchStruct = currentBenchmark.ref.benchmarks;

    return allIGNames.map((igName) => {
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

      return igWeightFraction * 100;
    });
  }, [allIGNames, combinedStocks, currentBenchmark]);

  if (!combinedStocks.length) {
    return (
      <Typography variant="body2" color="text.secondary">
        No data found in stock_data.json.
      </Typography>
    );
  }

  if (section === "drilldown") {
    const subsetLabel =
      subset || (subsets.length ? subsets[0] : "No industry groups");
    const activeListHeader =
      activeListType === "sector"
        ? sectorListFocus || "Selected sector"
        : subsetLabel;
    const emptyListMessage =
      activeListType === "sector"
        ? `No firms with exposure to ${activeListHeader} between ${cutoffRange[0]}% and ${cutoffRange[1]}%.`
        : `No stocks in "${activeListHeader}" between ${cutoffRange[0]}% and ${cutoffRange[1]}%.`;

    return (
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "260px minmax(0, 1fr)" },
            gap: 2,
            alignItems: "stretch",
            minHeight: 380,
          }}
        >
          <Paper
            variant="outlined"
            sx={{ p: 1.5, height: "fit-content", overflow: "hidden" }}
          >
            <Typography
              variant="subtitle2"
              sx={{ mb: 1, fontWeight: 600, textAlign: "center" }}
            >
              Drill-Down from Sectors to Stocks
            </Typography>

            <List
              dense
              disablePadding
              sx={{
                maxHeight: 450,
                overflow: "auto",
                border: "1px solid #e0e0e0",
                borderRadius: 1,
              }}
            >
              {sectorIGMapping.map((row, idx) => (
                <React.Fragment key={row.sector}>
                  {idx > 0 && <Divider />}
                  <ListItemButton 
                    onClick={() => handleToggleSector(row.sector)}
                    sx={{
                      borderLeft: `12px solid ${sectorColorMap[row.sector] || '#999'}`,
                      pl: 1.5,
                    }}
                  >
                    <ListItemText
                      primary={row.sector}
                      primaryTypographyProps={{
                        variant: "body2",
                        fontWeight: 500,
                      }}
                    />
                    {expandedSectors.has(row.sector) ? (
                      <ExpandLess />
                    ) : (
                      <ExpandMore />
                    )}
                  </ListItemButton>
                  <Collapse
                    in={expandedSectors.has(row.sector)}
                    timeout="auto"
                    unmountOnExit
                  >
                    <List component="div" disablePadding dense>
                      {row.groups.map((group) => (
                        <ListItemButton
                          key={group}
                          onClick={() => {
                            setSubset(group);
                            setActiveListType("subset");
                          }}
                          sx={{
                            pl: 4,
                            py: 0.5,
                            bgcolor: subset === group ? "#e3f2fd" : "#f9f9f9",
                            "&:hover": {
                              bgcolor: subset === group ? "#bbdefb" : "#eeeeee",
                            },
                          }}
                        >
                          <ListItemText
                            primary={group}
                            primaryTypographyProps={{
                              variant: "body2",
                              fontSize: "0.85rem",
                              fontWeight: subset === group ? 600 : 400,
                            }}
                          />
                        </ListItemButton>
                      ))}
                    </List>
                  </Collapse>
                </React.Fragment>
              ))}
            </List>
          </Paper>

          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: 0.5,
              height: "100%",
              pt: 0,
            }}
          >
            <Box sx={{ flex: "1 0 auto", minHeight: 0, mt: 0 }}>
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
                  gap: 2,
                  alignItems: "flex-start",
                }}
              >
                <Box>
                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: "2fr 1fr",
                      gap: 1.5,
                      mb: 1,
                      alignItems: "center",
                    }}
                  >
                    <Box sx={{ position: "relative" }}>
                      <Typography
                        variant="caption"
                        gutterBottom
                        sx={{
                          display: "block",
                          mb: 0.5,
                          textAlign: "center",
                          width: `calc(100% - ${histogramMargin.l + histogramMargin.r}px)`,
                          ml: `${histogramMargin.l}px`,
                        }}
                      >
                        Weight range: {cutoffRange[0]}% – {cutoffRange[1]}%
                      </Typography>
                      <Box sx={{ position: "relative", height: 70 }}>
                        <Plot
                          data={
                            [
                              {
                                x: subsetWeights,
                                type: "histogram",
                                orientation: "v",
                                xbins: { start: 0, end: 100, size: 5 },
                                marker: {
                                  opacity: 0.6,
                                  color: "rgba(95, 132, 187, 0.7)",
                                  line: {
                                    color: "rgba(0, 102, 255, 0.7)",
                                    width: 1.5,
                                  },
                                },
                                hovertemplate:
                                  "%{x}–%{x+5}%: %{y} stocks<extra></extra>",
                              },
                            ] as any
                          }
                              layout={
                            {
                              height: 60,
                              margin: histogramMargin,
                              xaxis: {
                                range: [0, 100],
                                tickfont: { size: 9 },
                                gridcolor: "#d0d0d0",
                                linecolor: "#666666",
                                zerolinecolor: "#666666",
                                showline: true,
                                tickvals: [0, 25, 50, 75, 100],
                                ticktext: ["0%", "25%", "50%", "75%", "100%"],
                              },
                              yaxis: { 
                                showticklabels: false,
                                tickfont: { size: 9 },
                              gridcolor: "#d0d0d0",
                              linecolor: "#666666",
                              zerolinecolor: "#666666",
                              showline: true,
                              },
                              shapes: [
                                {
                                  type: "rect",
                                  xref: "x",
                                  yref: "paper",
                                  x0: cutoffRange[0],
                                  x1: cutoffRange[1],
                                  y0: 0,
                                  y1: 1,
                                  fillcolor: "rgba(120, 120, 120, 0.12)",
                                  line: { width: 0 },
                                  layer: "below",
                                },
                                {
                                  type: "line",
                                  xref: "x",
                                  yref: "paper",
                                  x0: cutoffRange[0],
                                  x1: cutoffRange[0],
                                  y0: 0,
                                  y1: 1,
                                  line: {
                                    width: 2,
                                    dash: "solid",
                                    color: "#007a7a",
                                  },
                                },
                                {
                                  type: "line",
                                  xref: "x",
                                  yref: "paper",
                                  x0: cutoffRange[1],
                                  x1: cutoffRange[1],
                                  y0: 0,
                                  y1: 1,
                                  line: {
                                    width: 2,
                                    dash: "solid",
                                    color: "#007a7a",
                                  },
                                },
                              ],
                            } as any
                          }
                          config={{ displayModeBar: false, responsive: true, staticPlot: true } as any}
                          style={{ width: "100%", height: "100%", position: "absolute", top: 0, left: 0 }}
                        />
                        <Slider
                          value={cutoffRange}
                          onChange={(_, val) => setCutoffRange(val as number[])}
                          min={0}
                          max={100}
                          step={1}
                          marks
                          disableSwap
                          valueLabelDisplay="auto"
                          valueLabelFormat={(val) => `${val}%`}
                          sx={{
                            position: "absolute",
                            bottom: -6,
                            left: histogramMargin.l,
                            right: "auto",
                            width: `calc(100% - ${histogramMargin.l + histogramMargin.r}px)`,
                            height: 4,
                            color: 'grey.600',
                            '& .MuiSlider-thumb': {
                              bgcolor: '#ffffff',
                              width: 16,
                              height: 16,
                              border: '2px solid #555555',
                              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.25)',
                            },
                            '& .MuiSlider-track': {
                              bgcolor: '#666666',
                              height: 4,
                              borderRadius: 9999,
                            },
                            '& .MuiSlider-rail': {
                              bgcolor: '#d6d6d6',
                              opacity: 1,
                              height: 4,
                              borderRadius: 9999,
                            },
                            '& .MuiSlider-mark': {
                              display: 'none',
                            },
                          }}
                        />
                      </Box>
                    </Box>

                    <ToggleButtonGroup
                      orientation="vertical"
                      exclusive
                      size="small"
                      value={sortOrder}
                      onChange={(_, val) => val && setSortOrder(val)}
                      sx={{
                        width: 72,
                        justifySelf: "start",
                        '& .MuiToggleButton-root': {
                          py: 0.4,
                          px: 1,
                          fontSize: "0.75rem",
                          lineHeight: 1.2,
                        },
                      }}
                    >
                      <ToggleButton value="asc">Asc</ToggleButton>
                      <ToggleButton value="desc">Desc</ToggleButton>
                    </ToggleButtonGroup>
                  </Box>

                  <Paper
                    variant="outlined"
                    sx={{
                      maxHeight: 420,
                      overflowY: "auto",
                      width: { xs: "100%", md: "90%" },
                    }}
                  >
                    <List dense disablePadding>
                      <ListItem
                        sx={{
                          bgcolor: "#f5f5f5",
                          py: 1,
                          position: "sticky",
                          top: 0,
                          zIndex: 2,
                          borderBottom: "1px solid rgba(0,0,0,0.08)",
                        }}
                      >
                        <ListItemText
                          primary={activeListHeader}
                          primaryTypographyProps={{
                            variant: "subtitle2",
                            fontWeight: 600,
                          }}
                        />
                      </ListItem>
                      <Divider />
                      {activeListItems.length === 0 ? (
                        <ListItem>
                          <ListItemText
                            primary={emptyListMessage}
                            primaryTypographyProps={{
                              variant: "body2",
                              color: "text.secondary",
                            }}
                          />
                        </ListItem>
                      ) : (
                        activeListItems.map((stock, idx) => (
                          <React.Fragment key={`${stock.id ?? stock.name}-${idx}`}>
                            {idx > 0 && <Divider />}
                            <ListItem
                              secondaryAction={
                                <Typography variant="body2">
                                  {stock.percentage.toFixed(1)}%
                                </Typography>
                              }
                            >
                              <ListItemText
                                primary={stock.name}
                                primaryTypographyProps={{
                                  variant: "body2",
                                }}
                              />
                            </ListItem>
                          </React.Fragment>
                        ))
                      )}
                    </List>
                  </Paper>
                </Box>

                <Box>
                  <Plot
                    data={
                      Object.entries(scatterData).map(([ig, points], idx) => ({
                        x: points.map((p) => p.x),
                        y: points.map((p) => p.y),
                        text: points.map((p) => p.name),
                        mode: "markers",
                        type: "scatter",
                        marker: { size: 7 },
                        name: ig,
                        hovertemplate:
                          "%{text}<br>" +
                          `${scatterSector}: %{x:.1f}%<br>` +
                          `${ig}: %{y:.1f}%<extra></extra>`,
                      })) as any
                    }
                    layout={
                      {
                        height: 340,
                        margin: { l: 60, r: 20, t: 0, b: 40 },
                        xaxis: {
                          title: {
                            text: scatterSector || "Sector weight (%)",
                          },
                          range: [0, 100],
                        },
                        yaxis: {
                          title: {
                            text: "Industry Group weight (%)",
                          },
                          range: [0, 100],
                        },
                        shapes: [
                          {
                            type: "line",
                            x0: 0,
                            y0: 0,
                            x1: 100,
                            y1: 100,
                            line: {
                              color: "gray",
                              width: 1,
                              dash: "dot",
                            },
                          },
                        ],
                        showlegend: true,
                        legend: {
                          orientation: "h",
                          x: 0.5,
                          y: 1.12,
                          xanchor: "center",
                          yanchor: "top",
                        },
                      } as any
                    }
                    config={{ displayModeBar: false, responsive: true } as any}
                    style={{ width: "100%" }}
                  />
                </Box>
              </Box>
            </Box>
          </Box>
        </Box>
      </Box>
    );
  }

  return (
    <Box>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "1.5fr 1.5fr 1.5fr 1fr 1fr" },
          gap: 2,
          mb: 1.5,
          alignItems: "center",
        }}
      >
        <FormControl fullWidth size="small">
          <InputLabel>Selected stock</InputLabel>
          <Select
            value={selectedStockIsin}
            label="Selected stock"
            onChange={(e) => onStockSelect(e.target.value)}
          >
            {combinedStocks.map((s) => (
              <MenuItem key={s.isin} value={s.isin}>
                {s.name} ({s.isin})
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl fullWidth size="small">
          <InputLabel>Benchmark</InputLabel>
          <Select
            value={distBenchmarkId}
            label="Benchmark"
            onChange={(e) => setDistBenchmarkId(e.target.value)}
          >
            {benchmarkOptions.map((b) => (
              <MenuItem key={b.id} value={b.id}>
                {b.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl fullWidth size="small">
          <InputLabel>Comparison Stock</InputLabel>
          <Select
            value={comparisonStockIsin}
            label="Comparison Stock"
            onChange={(e) => setComparisonStockIsin(e.target.value)}
          >
            {combinedStocks.map((s) => (
              <MenuItem key={s.isin} value={s.isin}>
                {s.name} ({s.isin})
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Box>
          <Typography variant="caption" sx={{ mb: 0.5, display: "block" }}>
            Display Industry Groups
          </Typography>
          <ToggleButtonGroup
            exclusive
            size="small"
            value={showIndustryGroups ? "yes" : "no"}
            onChange={(_, val) => val && setShowIndustryGroups(val === "yes")}
          >
            <ToggleButton value="yes">Yes</ToggleButton>
            <ToggleButton value="no">No</ToggleButton>
          </ToggleButtonGroup>
        </Box>

        <Box>
          <Typography variant="caption" sx={{ mb: 0.5, display: "block" }}>
            Compare weights
          </Typography>
          <ToggleButtonGroup
            exclusive
            size="small"
            value={showWeightDistributions ? "yes" : "no"}
            onChange={(_, val) =>
              val && setShowWeightDistributions(val === "yes")
            }
          >
            <ToggleButton value="yes">Yes</ToggleButton>
            <ToggleButton value="no">No</ToggleButton>
          </ToggleButtonGroup>
        </Box>
      </Box>

      {!showWeightDistributions ? (
        <Plot
          data={
            (() => {
              const traces: any[] = [];

              traces.push({
                x: filteredSectorData.positions,
                y: filteredSectorData.stockWeights,
                type: "bar",
                name: selectedStock?.name ?? "Selected stock",
                marker: { color: "rgba(66, 133, 244, 0.8)" },
                offsetgroup: "stock",
                width: 0.35,
              });

              // Add stacked remainder bars to reach 100%
              const remainderWeights = filteredSectorData.stockWeights.map(w => 100 - w);
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
                  name: `${currentBenchmark?.label ?? "Benchmark"} – ${sector}`,
                  line: {
                    width: 2,
                    shape: "spline",
                    smoothing: 1.3,
                    color: "#555555",
                  },
                  hovertemplate: `${
                    currentBenchmark?.label ?? "Benchmark"
                  } (${sector}): %{y:.1f}%<extra></extra>`,
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
                tickvals: filteredSectorData.positions.map(v => v - 0.3),
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
      ) : showIndustryGroups ? (
        (() => {
          const tempData: Array<{ ig: string; stockWeight: number; compWeight: number }> = [];
          
          allIGNames.forEach((ig) => {
            const stockW = selectedStock?.industryGroups[ig] || 0;
            const compW = comparisonStock?.industryGroups[ig] || 0;
            // Include if either stock has non-zero weight
            if (stockW > 0 || compW > 0) {
              tempData.push({ ig, stockWeight: stockW, compWeight: compW });
            }
          });
          
          // Separate IGs where selected stock has weight vs only comparison stock has weight
          const selectedHasWeight = tempData.filter(item => item.stockWeight > 0);
          const onlyCompHasWeight = tempData.filter(item => item.stockWeight === 0 && item.compWeight > 0);
          
          // Sort selected stock IGs by weight descending
          selectedHasWeight.sort((a, b) => b.stockWeight - a.stockWeight);
          // Sort comparison-only IGs by comparison weight descending
          onlyCompHasWeight.sort((a, b) => b.compWeight - a.compWeight);
          
          // Combine: selected stock IGs first, then comparison-only IGs
          const combinedData = [...selectedHasWeight, ...onlyCompHasWeight];
          
          const filteredIGs: string[] = [];
          const filteredStockWeights: number[] = [];
          const filteredCompWeights: number[] = [];
          
          combinedData.forEach(item => {
            filteredIGs.push(item.ig);
            filteredStockWeights.push(item.stockWeight);
            filteredCompWeights.push(item.compWeight);
          });
          
          // Filter IGs and weights to only show bars where stock has weight
          const stockIGs: string[] = [];
          const stockWeightsFiltered: number[] = [];
          const stockRemainderIGs: string[] = [];
          const stockRemainderValues: number[] = [];
          const stockRemainderBase: number[] = [];
          
          combinedData.forEach(item => {
            if (item.stockWeight > 0) {
              stockIGs.push(item.ig);
              stockWeightsFiltered.push(item.stockWeight);
              stockRemainderIGs.push(item.ig);
              stockRemainderValues.push(100 - item.stockWeight);
              stockRemainderBase.push(item.stockWeight);
            }
          });
          
          const compRemainders = filteredCompWeights.map(w => 100 - w);
          
          // Find separator position (between selected stock IGs and comparison-only IGs)
          const separatorIndex = selectedHasWeight.length;
          
          // Create shapes for separator line if there are comparison-only IGs
          const shapes: any[] = onlyCompHasWeight.length > 0 && separatorIndex < filteredIGs.length ? [{
            type: "line",
            xref: "paper",
            yref: "paper",
            x0: (separatorIndex / filteredIGs.length),
            x1: (separatorIndex / filteredIGs.length),
            y0: 0,
            y1: 1,
            line: {
              color: "gray",
              width: 2,
              dash: "dot",
            },
          }] : [];

          return (
            <Plot
              data={[
                {
                  x: stockIGs,
                  y: stockWeightsFiltered,
                  type: "bar",
                  name: selectedStock?.name ?? "Selected stock",
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
                  name: comparisonStock?.name ?? "Comparison stock",
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
              ] as any}
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
                  tickvals: filteredSectorData.positions.map(v => v - 0.3),
                  side: "top",
                  tickangle: -25,
                },
                shapes: shapes,
                showlegend: false,
              } as any}
              config={{ displayModeBar: false, responsive: true } as any}
              style={{ width: "100%" }}
            />
          );
        })()
      ) : (
        (() => {
          // Build comparison data for sectors
          const tempData: Array<{ sector: string; stockWeight: number; compWeight: number }> = [];
          
          allSectorNames.forEach((sector) => {
            const stockW = selectedStock?.sectors[sector] || 0;
            const compW = comparisonStock?.sectors[sector] || 0;
            // Include if either stock has non-zero weight
            if (stockW > 0 || compW > 0) {
              tempData.push({ sector, stockWeight: stockW, compWeight: compW });
            }
          });
          
          // Separate sectors where selected stock has weight vs only comparison stock has weight
          const selectedHasWeight = tempData.filter(item => item.stockWeight > 0);
          const onlyCompHasWeight = tempData.filter(item => item.stockWeight === 0 && item.compWeight > 0);
          
          // Sort selected stock sectors by weight descending
          selectedHasWeight.sort((a, b) => b.stockWeight - a.stockWeight);
          // Sort comparison-only sectors by comparison weight descending
          onlyCompHasWeight.sort((a, b) => b.compWeight - a.compWeight);
          
          // Combine: selected stock sectors first, then comparison-only sectors
          const combinedData = [...selectedHasWeight, ...onlyCompHasWeight];
          
          const sectors: string[] = [];
          const stockWeights: number[] = [];
          const compWeights: number[] = [];
          const positions: number[] = [];
          
          combinedData.forEach((item, idx) => {
            sectors.push(item.sector);
            stockWeights.push(item.stockWeight);
            compWeights.push(item.compWeight);
            positions.push(idx + 1);
          });
          
          // Filter positions and weights to only show bars where stock has weight
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
          
          const compRemainders = compWeights.map((w: number) => 100 - w);
          
          // Find separator position (between selected stock sectors and comparison-only sectors)
          const separatorPosition = selectedHasWeight.length + 0.9;
          
          return (
            <Plot
              data={
                [
                  {
                    x: stockPositions,
                    y: stockWeightsFiltered,
                    type: "bar",
                    name: selectedStock?.name ?? "Selected stock",
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
                    x: positions,
                    y: compWeights,
                    type: "bar",
                    name: comparisonStock?.name ?? "Comparison stock",
                    marker: { color: "rgba(255, 127, 80, 0.8)" },
                    width: 0.35,
                    offset: 0.25,
                  },
                  {
                    x: positions,
                    y: compRemainders,
                    type: "bar",
                    marker: { color: "lightgray" },
                    opacity: 0.2,
                    showlegend: false,
                    width: 0.35,
                    offset: 0.25,
                    base: compWeights,
                  },
                ] as any
              }
              layout={
                {
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
                  shapes: onlyCompHasWeight.length > 0 ? [{
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
                  }] : [],
                  showlegend: false,
                } as any
              }
              config={{ displayModeBar: false, responsive: true } as any}
              style={{ width: "100%" }}
            />
          );
        })()
      )}
    </Box>
  );
};

export default StockListPanel;

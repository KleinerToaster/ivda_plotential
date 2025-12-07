import React, { useRef, useState } from "react";
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  Divider,
  Button,
  TextField,
  Autocomplete,
  ToggleButtonGroup,
  ToggleButton,
} from "@mui/material";
import "./App.css";

import WeightDifferenceView from "./components/WeightDifferenceView";
import StockListPanel, {
  SavedState,
  StockListPanelHandle,
} from "./components/StockListPanel";
import SimilarStocks from "./components/SimilarStocks";
import WeightCharts from "./components/WeightCharts";
import DataValidityOverlay from "./components/DataValidityOverlay";
import PortfolioBuilderOverlay from "./components/PortfolioBuilderOverlay";
import rawStockData from "./stock_data.json";
import rawAllBenchmarks from "./all_benchmarks.json";
import sectorOrderConfig from "./sectorOrder.json";

type BenchmarksStructure = Record<string, [number, Record<string, number>]>;

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

interface PortfolioStock {
  isin: string;
  name: string;
  weight: number;
}

interface Portfolio {
  id: string;
  name: string;
  stocks: PortfolioStock[];
  createdAt: string;
}

type BenchmarkOption = {
  id: string;
  label: string;
  level: "universe" | "country" | "region" | "market" | "portfolio";
  ref?: CountryRegionMarketBenchmark;
  portfolio?: Portfolio;
};

type Level = "Sectors" | "Industry Groups";
type CategoryFilter = "All" | "Top 11";

function App() {
  const [showOverlay, setShowOverlay] = useState(false);
  const [showPortfolioBuilder, setShowPortfolioBuilder] = useState(false);
  const [selectedStockIsin, setSelectedStockIsin] = useState<string>(
    rawStockData[0]?.isin ?? ""
  );
  
  // Weight Difference View controls
  const [portfolio2Key, setPortfolio2Key] = useState<string>("");
  const [benchmarkId, setBenchmarkId] = useState<string>("none");
  const [benchmark2Id, setBenchmark2Id] = useState<string>("none");
  const [baseline, setBaseline] = useState<string>("portfolio1");
  const [level, setLevel] = useState<Level>("Sectors");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("All");
  
  const baselineButtonSx = (key: string) => ({
    width: 130,
    height: 16,
    bgcolor: baseline === key ? "grey.300" : "white",
    borderRadius: 1,
    cursor: "pointer",
    border: baseline === key ? "2px solid rgba(0, 0, 0, 0.65)" : "1px solid rgba(0, 0, 0, 0.25)",
    transition: "all 0.2s",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    "&:hover": {
      bgcolor: baseline === key ? "grey.400" : "rgba(0, 0, 0, 0.05)",
      borderColor: "rgba(0, 0, 0, 0.65)",
    },
  });

  const baselineButtonTextSx = (key: string) => ({
    fontSize: "0.6rem",
    color: baseline === key ? "rgba(0, 0, 0, 0.87)" : "rgba(0, 0, 0, 0.6)",
    fontWeight: baseline === key ? 600 : 400,
  });
  
  // Similar Stocks controls
  const [featureType, setFeatureType] = useState<"both" | "sectors" | "industryGroups">("both");
  const [k, setK] = useState<number>(50);
  const [kPeer, setKPeer] = useState<number>(10);
  const [iterations, setIterations] = useState<number>(500);
  const [coolingRate, setCoolingRate] = useState<number>(1.5);

  // WeightCharts controls
  const [comparisonStockIsin, setComparisonStockIsin] = useState<string>(
    rawStockData[1]?.isin ?? rawStockData[0]?.isin ?? ""
  );
  const [distBenchmarkId, setDistBenchmarkId] = useState<string>("universe");
  const [showIndustryGroups, setShowIndustryGroups] = useState<boolean>(true);
  const [showWeightDistributions, setShowWeightDistributions] = useState<boolean>(false);

  const companies = rawStockData.map((s: any) => ({
    isin: s.isin,
    name: s.name,
  }));
  
  // State to trigger re-render when portfolios change
  const [portfoliosUpdated, setPortfoliosUpdated] = React.useState(0);
  
  // Listen for portfolio changes (both storage events and custom events)
  React.useEffect(() => {
    const handlePortfoliosUpdate = () => {
      setPortfoliosUpdated(prev => prev + 1);
    };
    
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "portfolios") {
        setPortfoliosUpdated(prev => prev + 1);
      }
    };
    
    window.addEventListener("portfoliosUpdated", handlePortfoliosUpdate);
    window.addEventListener("storage", handleStorageChange);
    
    return () => {
      window.removeEventListener("portfoliosUpdated", handlePortfoliosUpdate);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);
  
  const benchmarkOptions: BenchmarkOption[] = React.useMemo(() => {
    const opts: BenchmarkOption[] = [
      { id: "none", label: "None", level: "universe" },
      { id: "universe", label: "Universe average", level: "universe" },
    ];

    // Load saved portfolios from localStorage
    try {
      const savedPortfoliosJson = localStorage.getItem("portfolios");
      if (savedPortfoliosJson) {
        const portfolios = JSON.parse(savedPortfoliosJson) as Portfolio[];
        portfolios.forEach((portfolio) => {
          opts.push({
            id: `portfolio-${portfolio.id}`,
            label: `Portfolio: ${portfolio.name}`,
            level: "portfolio",
            portfolio: portfolio,
          });
        });
      }
    } catch (e) {
      console.error("Failed to load saved portfolios", e);
    }

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
  }, [portfoliosUpdated]);
  
  const drilldownRef = useRef<StockListPanelHandle | null>(null);
  const [stateName, setStateName] = useState("");
  const [savedStates, setSavedStates] = useState<SavedState[]>([]);
  const maxSavedStates = 4;

  const handleSaveState = () => {
    const trimmed = stateName.trim().slice(0, 8);
    if (!trimmed || savedStates.length >= maxSavedStates) return;
    const config = drilldownRef.current?.getStateConfig();
    if (!config) return;
    setSavedStates((prev) => [...prev, { name: trimmed, config }]);
    setStateName("");
  };

  const handleLoadState = (state: SavedState) => {
    drilldownRef.current?.applyState(state.config);
    if (state.config.highlightedStockIsin) {
      setSelectedStockIsin(state.config.highlightedStockIsin);
    }
  };



  // WeightCharts computed values
  const REGION_TO_COUNTRIES: Record<string, string[]> = {
    Europe: ["AT", "BE", "CH", "DE", "DK", "ES", "FR", "GB", "IE", "IL", "IT", "LU", "NL", "NO", "PT", "SE"],
    "North America": ["BM", "CA", "PA", "US"],
    "South America": ["CL", "PE"],
    Asia: ["CN", "HK", "IN", "JP", "KR", "SG"],
    Africa: ["ZA"],
    Oceania: ["AU"],
    World: ["AT", "AU", "BE", "BM", "CA", "CH", "CL", "CN", "DE", "DK", "ES", "FR", "GB", "HK", "IE", "IL", "IN", "IT", "JP", "KR", "LU", "NL", "NO", "PA", "PE", "PT", "SE", "SG", "US", "ZA"],
  };

  const MARKET_TO_COUNTRIES: Record<string, string[]> = {
    Developed: ["AT", "AU", "BE", "CA", "CH", "DE", "DK", "ES", "FR", "GB", "IE", "IL", "IT", "JP", "LU", "NL", "NO", "PT", "SE", "SG", "US"],
    Emerging: ["BM", "CL", "CN", "HK", "IN", "KR", "PA", "PE", "ZA"],
    "Investable Universe": ["AT", "AU", "BE", "BM", "CA", "CH", "CL", "CN", "DE", "DK", "ES", "FR", "GB", "HK", "IE", "IL", "IN", "IT", "JP", "KR", "LU", "NL", "NO", "PA", "PE", "PT", "SE", "SG", "US", "ZA"],
  };

  const mean = (vals: number[]): number => {
    const valid = vals.filter((v) => !Number.isNaN(v));
    if (!valid.length) return 0;
    return valid.reduce((a, b) => a + b, 0) / valid.length;
  };

  const combinedStocks = rawStockData as any[];

  const allSectorNames = React.useMemo(() => {
    return sectorOrderConfig.orderedSectors;
  }, []);

  const allIGNames = React.useMemo(() => {
    const set = new Set<string>();
    combinedStocks.forEach((s) =>
      Object.keys(s.industryGroups || {}).forEach((k) => set.add(k))
    );
    return Array.from(set).sort();
  }, []);

  const currentDistBenchmark = React.useMemo(
    () =>
      benchmarkOptions.find((b) => b.id === distBenchmarkId) ??
      benchmarkOptions[0],
    [benchmarkOptions, distBenchmarkId]
  );

  const selectedStock = React.useMemo(
    () =>
      combinedStocks.find((s) => s.isin === selectedStockIsin) ||
      combinedStocks[0] ||
      null,
    [selectedStockIsin]
  );

  const comparisonStock = React.useMemo(
    () =>
      combinedStocks.find((s) => s.isin === comparisonStockIsin) ||
      combinedStocks[1] ||
      combinedStocks[0] ||
      null,
    [comparisonStockIsin]
  );

  const filteredSectorData = React.useMemo(() => {
    if (!selectedStock) return { sectors: [], stockWeights: [], benchWeights: [], positions: [] };
    
    const tempData: Array<{ sector: string; stockWeight: number; benchWeight: number }> = [];
    
    allSectorNames.forEach((sector) => {
      const stockWeight = selectedStock.sectors[sector] || 0;
      
      if (stockWeight > 0) {
        let benchWeight = 0;
        
        if (!combinedStocks.length) {
          benchWeight = 0;
        } else if (
          !currentDistBenchmark ||
          currentDistBenchmark.level === "universe" ||
          !currentDistBenchmark.ref
        ) {
          benchWeight = mean(
            combinedStocks.map((s) =>
              s.sectors[sector] != null ? Number(s.sectors[sector]) : 0
            )
          );
        } else {
          const benchStruct = currentDistBenchmark.ref.benchmarks;
          const entry = benchStruct[sector];
          if (entry) {
            const [sectorWeightFraction] = entry;
            benchWeight = sectorWeightFraction * 100;
          }
        }
        
        tempData.push({ sector, stockWeight, benchWeight });
      }
    });
    
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
  }, [allSectorNames, selectedStock, currentDistBenchmark]);

  const distSamplesBenchBySector: Record<string, number[]> = React.useMemo(() => {
    let sampleStocks = combinedStocks;

    if (currentDistBenchmark && currentDistBenchmark.level !== "universe" && currentDistBenchmark.ref) {
      const code = currentDistBenchmark.ref.code;
      if (currentDistBenchmark.level === "country") {
        sampleStocks = combinedStocks.filter((s) => s.country === code);
      } else if (currentDistBenchmark.level === "region") {
        const countries = REGION_TO_COUNTRIES[code] ?? [];
        if (countries.length) {
          sampleStocks = combinedStocks.filter((s) =>
            countries.includes(s.country)
          );
        }
      } else if (currentDistBenchmark.level === "market") {
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
  }, [filteredSectorData.sectors, currentDistBenchmark]);

  return (
    <Box sx={{ flexGrow: 1, bgcolor: "#f5f5f5" }}>
      <AppBar
        position="static"
        sx={{
          backgroundColor: "#e0e0e0",
        }}
      >
        <Toolbar sx={{ minHeight: 80, py: 0.5, gap: 1, alignItems: "center", justifyContent: "space-between" }}>
          <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
            <Typography variant="h6" sx={{ flexShrink: 0, fontSize: "1.1rem", mr: 2, color: "black" }}>
              Plotential
            </Typography>
            
            <Divider orientation="vertical" sx={{ bgcolor: 'white', width: '0.4px', alignSelf: 'stretch', mx: 1 }} />
            
            {/* All controls in single horizontal row */}
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, flexWrap: "nowrap" }}>
              <Button
                color="inherit"
                size="small"
                onClick={() => setShowOverlay(true)}
                sx={{ color: "black", border: "1px solid rgba(0, 0, 0, 0.45)", fontSize: "0.75rem", px: 1.5 }}
              >
                Data Validity
              </Button>
              <Button
                color="inherit"
                size="small"
                onClick={() => setShowPortfolioBuilder(true)}
                sx={{ color: "black", border: "1px solid rgba(0, 0, 0, 0.45)", fontSize: "0.75rem", px: 1.5 }}
              >
                Portfolio Builder
              </Button>
              
              <Divider orientation="vertical" sx={{ bgcolor: 'white', width: '0.4px', height: '24px', mx: 0.5 }} />
              
              <TextField
                value={stateName}
                onChange={(e) => setStateName(e.target.value)}
                size="small"
                label=""
                placeholder="State name"
                inputProps={{ maxLength: 8 }}
                sx={{ width: 140, bgcolor: "white", borderRadius: 1, ml: 5 }}
              />
              <Button
                color="inherit"
                size="small"
                variant="outlined"
                sx={{ 
                  color: "black",
                  border: "1px solid rgba(0, 0, 0, 0.35)",
                  fontSize: "0.75rem",
                  px: 1.5,
                  minWidth: "auto",
                  '&.Mui-disabled': {
                    color: 'rgba(0, 0, 0, 0.4)',
                    borderColor: 'rgba(0, 0, 0, 0.35)',
                  }
                }}
                onClick={handleSaveState}
                disabled={!stateName.trim() || savedStates.length >= maxSavedStates}
              >
                Save
              </Button>
              {savedStates.length === 0 ? (
              <Typography variant="caption" sx={{ color: "black", whiteSpace: "nowrap" }}>
                  No saved states
                </Typography>
              ) : (
                <>
                  <Divider orientation="vertical" sx={{ bgcolor: 'white', width: '0.4px', height: '24px'}} />
                  {savedStates.map((state) => (
                    <Button
                      key={state.name}
                      color="inherit"
                      size="small"
                      variant="outlined"
                      sx={{ color: "black", border: "0.5px solid rgba(0, 0, 0, 0.35)", minWidth: "auto", fontSize: "0.75rem", px: 1 }}
                      onClick={() => handleLoadState(state)}
                    >
                      {state.name}
                    </Button>
                  ))}
                </>
              )}
            </Box>
            
          </Box>
          
          {/* Portfolio and Benchmark Controls */}
          <Box sx={{ display: "flex", gap: 0.5 }}>
            <Divider orientation="vertical" sx={{ bgcolor: 'white', width: '0.4px', alignSelf: 'stretch', mx: 1 }} />
            {/* Labels column */}
            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5, justifyContent: "space-between", pt: 0.2 }}>
              <Typography variant="caption" sx={{ fontSize: "0.7rem", color: "black", fontWeight: 500, height: 16, display: "flex", alignItems: "center" }}>
                Baseline:
              </Typography>
              <Typography variant="caption" sx={{ fontSize: "0.7rem", color: "black", fontWeight: 500, height: 32, display: "flex", alignItems: "center" }}>
                Assets:
              </Typography>
            </Box>
            
            {/* Controls column */}
            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
              {/* Baseline indicators */}
              <Box sx={{ display: "flex", gap: 0.4 }}>
                <Box onClick={() => setBaseline("portfolio1")} sx={baselineButtonSx("portfolio1")}>
                  <Typography variant="caption" sx={baselineButtonTextSx("portfolio1")}>
                    Asset 1
                  </Typography>
                </Box>
                <Box onClick={() => setBaseline("portfolio2")} sx={baselineButtonSx("portfolio2")}>
                  <Typography variant="caption" sx={baselineButtonTextSx("portfolio2")}>
                    Asset 2
                  </Typography>
                </Box>
                <Box onClick={() => setBaseline("benchmark1")} sx={baselineButtonSx("benchmark1")}>
                  <Typography variant="caption" sx={baselineButtonTextSx("benchmark1")}>
                    Benchmark 1
                  </Typography>
                </Box>
                <Box onClick={() => setBaseline("benchmark2")} sx={baselineButtonSx("benchmark2")}>
                  <Typography variant="caption" sx={baselineButtonTextSx("benchmark2")}>
                    Benchmark 2
                  </Typography>
                </Box>
              </Box>
              
              {/* Input fields */}
              <Box sx={{ display: "flex", gap: 0.4 }}>
                <Autocomplete
                sx={{ 
                  width: 130, 
                  "& .MuiInputBase-root": { 
                    fontSize: "0.75rem",
                    paddingRight: "20px !important"
                  }, 
                  "& .MuiInputLabel-root": { fontSize: "0.75rem" },
                  "& .MuiAutocomplete-endAdornment": {
                    right: "2px",
                    "& .MuiButtonBase-root": {
                      padding: "0px",
                      width: "16px",
                      height: "16px",
                      "& .MuiSvgIcon-root": {
                        fontSize: "0.75rem"
                      }
                    }
                  }
                }}
                size="small"
                options={[{ isin: "", name: "None" }, ...rawStockData]}
                getOptionLabel={(option: any) => option.isin === "" ? "None" : `${option.name} (${option.isin})`}
                value={rawStockData.find((s: any) => s.isin === selectedStockIsin) || { isin: "", name: "None" } as any}
                onChange={(_, newValue: any) => {
                  setSelectedStockIsin(newValue?.isin || "");
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label=""
                    sx={{
                      bgcolor: "white",
                      borderRadius: 1,
                      "& .MuiOutlinedInput-root": {
                        bgcolor: baseline === "portfolio1" ? "rgba(66, 133, 244, 0.6)" : "rgba(66, 133, 244, 0.35)",
                      },
                    }}
                  />
                )}
              />
              <Autocomplete
                sx={{ 
                  width: 130, 
                  "& .MuiInputBase-root": { 
                    fontSize: "0.75rem",
                    paddingRight: "20px !important"
                  }, 
                  "& .MuiInputLabel-root": { fontSize: "0.75rem" },
                  "& .MuiAutocomplete-endAdornment": {
                    right: "2px",
                    "& .MuiButtonBase-root": {
                      padding: "0px",
                      width: "16px",
                      height: "16px",
                      "& .MuiSvgIcon-root": {
                        fontSize: "0.75rem"
                      }
                    }
                  }
                }}
                size="small"
                options={[
                  { id: "", label: "None" },
                  ...rawStockData.map((s: any) => ({ id: `stock:${s.isin}`, label: `${s.name} (${s.isin})` })),
                  { id: "avg", label: `${level} Universe average` },
                ]}
                getOptionLabel={(option: any) => option.label}
                value={
                  portfolio2Key === ""
                    ? { id: "", label: "None" }
                    : portfolio2Key === "avg"
                    ? { id: "avg", label: `${level} Universe average` }
                    : { id: portfolio2Key, label: rawStockData.find((s: any) => `stock:${s.isin}` === portfolio2Key)?.name ? `${rawStockData.find((s: any) => `stock:${s.isin}` === portfolio2Key)?.name}` : portfolio2Key }
                }
                onChange={(_, newValue: any) => {
                  const newKey = newValue?.id || "";
                  setPortfolio2Key(newKey);
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label=""
                    sx={{
                      bgcolor: "white",
                      borderRadius: 1,
                      "& .MuiOutlinedInput-root": {
                        bgcolor: baseline === "portfolio2" ? "rgba(244, 67, 54, 0.6)" : "rgba(244, 67, 54, 0.35)",
                      },
                    }}
                  />
                )}
              />
              <Autocomplete
                sx={{ 
                  width: 130, 
                  "& .MuiInputBase-root": { 
                    fontSize: "0.75rem",
                    paddingRight: "20px !important"
                  }, 
                  "& .MuiInputLabel-root": { fontSize: "0.75rem" },
                  "& .MuiAutocomplete-endAdornment": {
                    right: "2px",
                    "& .MuiButtonBase-root": {
                      padding: "0px",
                      width: "16px",
                      height: "16px",
                      "& .MuiSvgIcon-root": {
                        fontSize: "0.75rem"
                      }
                    }
                  }
                }}
                size="small"
                options={benchmarkOptions}
                getOptionLabel={(option) => option.label}
                value={benchmarkOptions.find((b) => b.id === benchmarkId) || benchmarkOptions[0]}
                onChange={(_, newValue) => {
                  setBenchmarkId(newValue?.id || "none");
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label=""
                    sx={{
                      bgcolor: "white",
                      borderRadius: 1,
                      "& .MuiOutlinedInput-root": {
                        bgcolor: baseline === "benchmark1" ? "rgba(255, 193, 7, 0.65)" : "rgba(255, 193, 7, 0.4)",
                      },
                    }}
                  />
                )}
              />
              <Autocomplete
                sx={{ 
                  width: 130, 
                  "& .MuiInputBase-root": { 
                    fontSize: "0.75rem",
                    paddingRight: "20px !important"
                  }, 
                  "& .MuiInputLabel-root": { fontSize: "0.75rem" },
                  "& .MuiAutocomplete-endAdornment": {
                    right: "2px",
                    "& .MuiButtonBase-root": {
                      padding: "0px",
                      width: "16px",
                      height: "16px",
                      "& .MuiSvgIcon-root": {
                        fontSize: "0.75rem"
                      }
                    }
                  }
                }}
                size="small"
                options={benchmarkOptions}
                getOptionLabel={(option) => option.label}
                value={benchmarkOptions.find((b) => b.id === benchmark2Id) || benchmarkOptions[0]}
                onChange={(_, newValue) => {
                  setBenchmark2Id(newValue?.id || "none");
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label=""
                    sx={{
                      bgcolor: "white",
                      borderRadius: 1,
                      "& .MuiOutlinedInput-root": {
                        bgcolor: baseline === "benchmark2" ? "rgba(76, 175, 80, 0.6)" : "rgba(76, 175, 80, 0.35)",
                      },
                    }}
                  />
                )}
              />
              </Box>
            </Box>
          </Box>
        </Toolbar>
      </AppBar>
      <DataValidityOverlay
        open={showOverlay}
        onClose={() => setShowOverlay(false)}
        companies={companies}
      />
      <PortfolioBuilderOverlay
        open={showPortfolioBuilder}
        onClose={() => setShowPortfolioBuilder(false)}
        stocks={companies}
      />
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            md: "3fr 2fr",
          },
          alignItems: "flex-start",
          gap: 3,
          p: 3,
        }}
      >
        <Box
          sx={{
            pr: { md: 3 },
            display: "flex",
            flexDirection: "column",
            height: "100%",
          }}
        >
          <Box sx={{ mb: 1 }}>
              <Box id="drilldown-section">
                <StockListPanel
                  ref={drilldownRef}
                  section="drilldown"
                  selectedStockIsin={selectedStockIsin}
                  onStockSelect={setSelectedStockIsin}
                />
            </Box>
          </Box>

          <Box sx={{ flexGrow: 1 }}>
            <StockListPanel 
              section="lower" 
              selectedStockIsin={selectedStockIsin}
              onStockSelect={setSelectedStockIsin}
            />

            <SimilarStocks 
              selectedStockIsin={selectedStockIsin}
              onStockSelect={setSelectedStockIsin}
              featureType={featureType}
              k={k}
              kPeer={kPeer}
              iterations={iterations}
              coolingRate={coolingRate}
            />
          </Box>
        </Box>
        <Box
          sx={{
            width: "100%",
            maxWidth: 900,
          }}
        >
          <WeightDifferenceView 
            selectedStockIsin={selectedStockIsin}
            onStockSelect={setSelectedStockIsin}
            portfolio2Key={portfolio2Key}
            setPortfolio2Key={setPortfolio2Key}
            benchmarkId={benchmarkId}
            setBenchmarkId={setBenchmarkId}
            benchmark2Id={benchmark2Id}
            setBenchmark2Id={setBenchmark2Id}
            baseline={baseline}
            setBaseline={setBaseline}
            level={level}
            setLevel={setLevel}
            categoryFilter={categoryFilter}
            setCategoryFilter={setCategoryFilter}
          />

          <Box sx={{ mt: 3 }} />

          <WeightCharts
            showWeightDistributions={showWeightDistributions}
            showIndustryGroups={showIndustryGroups}
            setShowWeightDistributions={setShowWeightDistributions}
            setShowIndustryGroups={setShowIndustryGroups}
            filteredSectorData={filteredSectorData}
            distSamplesBenchBySector={distSamplesBenchBySector}
            currentBenchmarkLabel={currentDistBenchmark?.label ?? "Benchmark"}
            selectedStock={selectedStock}
            comparisonStock={comparisonStock}
            allIGNames={allIGNames}
            allSectorNames={allSectorNames}
          />
        </Box>
      </Box>
    </Box>
  );
}

export default App;

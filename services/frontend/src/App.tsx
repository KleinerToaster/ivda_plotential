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
import DataValidityOverlay from "./components/DataValidityOverlay";
import PortfolioBuilderOverlay from "./components/PortfolioBuilderOverlay";
import rawStockData from "./stock_data.json";
import rawAllBenchmarks from "./all_benchmarks.json";

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

type BenchmarkOption = {
  id: string;
  label: string;
  level: "universe" | "country" | "region" | "market";
  ref?: CountryRegionMarketBenchmark;
};

type Level = "Sectors" | "Industry Groups";
type CategoryFilter = "All" | "Top 5" | "Top 10";

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
  
  // Similar Stocks controls
  const [featureType, setFeatureType] = useState<"both" | "sectors" | "industryGroups">("both");
  const [k, setK] = useState<number>(20);
  const [kPeer, setKPeer] = useState<number>(4);
  const [iterations, setIterations] = useState<number>(500);
  const [coolingRate, setCoolingRate] = useState<number>(1.0);

  const companies = rawStockData.map((s: any) => ({
    isin: s.isin,
    name: s.name,
  }));
  
  const benchmarkOptions: BenchmarkOption[] = React.useMemo(() => {
    const opts: BenchmarkOption[] = [
      { id: "none", label: "None", level: "universe" },
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

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar
        position="static"
        sx={{
          backgroundColor: "rgba(0, 0, 0, 0.7)",
        }}
      >
        <Toolbar sx={{ minHeight: 80, py: 0.5, gap: 1, alignItems: "center" }}>
          <Typography variant="h6" sx={{ flexShrink: 0, fontSize: "1.1rem", mr: 2 }}>
            Plotential
          </Typography>
          
          <Divider orientation="vertical" sx={{ bgcolor: 'white', width: '0.4px', alignSelf: 'stretch', mx: 1 }} />
          
          {/* Portfolio and Benchmark Controls */}
          <Box sx={{ display: "flex", gap: 0.5 }}>
            {/* Labels column */}
            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5, justifyContent: "space-between", pt: 0.2 }}>
              <Typography variant="caption" sx={{ fontSize: "0.7rem", color: "white", fontWeight: 500, height: 16, display: "flex", alignItems: "center" }}>
                Baseline:
              </Typography>
              <Typography variant="caption" sx={{ fontSize: "0.7rem", color: "white", fontWeight: 500, height: 32, display: "flex", alignItems: "center" }}>
                Assets:
              </Typography>
            </Box>
            
            {/* Controls column */}
            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
              {/* Baseline indicators */}
              <Box sx={{ display: "flex", gap: 0.4 }}>
                <Box
                  onClick={() => setBaseline("portfolio1")}
                  sx={{
                    width: 130,
                    height: 16,
                    bgcolor: baseline === "portfolio1" ? "primary.main" : "rgba(255, 255, 255, 0.25)",
                    borderRadius: 1,
                    cursor: "pointer",
                    border: baseline === "portfolio1" ? "2px solid white" : "1px solid rgba(255, 255, 255, 0.4)",
                    transition: "all 0.2s",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    "&:hover": {
                      bgcolor: baseline === "portfolio1" ? "primary.dark" : "rgba(255, 255, 255, 0.4)",
                      borderColor: "white",
                    },
                  }}
                >
                  <Typography variant="caption" sx={{ fontSize: "0.6rem", color: "white", fontWeight: baseline === "portfolio1" ? 600 : 400 }}>
                    Asset 1
                  </Typography>
                </Box>
                <Box
                  onClick={() => setBaseline("portfolio2")}
                  sx={{
                    width: 130,
                    height: 16,
                    bgcolor: baseline === "portfolio2" ? "primary.main" : "rgba(255, 255, 255, 0.25)",
                    borderRadius: 1,
                    cursor: "pointer",
                    border: baseline === "portfolio2" ? "2px solid white" : "1px solid rgba(255, 255, 255, 0.4)",
                    transition: "all 0.2s",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    "&:hover": {
                      bgcolor: baseline === "portfolio2" ? "primary.dark" : "rgba(255, 255, 255, 0.4)",
                      borderColor: "white",
                    },
                  }}
                >
                  <Typography variant="caption" sx={{ fontSize: "0.6rem", color: "white", fontWeight: baseline === "portfolio2" ? 600 : 400 }}>
                    Asset 2
                  </Typography>
                </Box>
                <Box
                  onClick={() => setBaseline("benchmark1")}
                  sx={{
                    width: 130,
                    height: 16,
                    bgcolor: baseline === "benchmark1" ? "primary.main" : "rgba(255, 255, 255, 0.25)",
                    borderRadius: 1,
                    cursor: "pointer",
                    border: baseline === "benchmark1" ? "2px solid white" : "1px solid rgba(255, 255, 255, 0.4)",
                    transition: "all 0.2s",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    "&:hover": {
                      bgcolor: baseline === "benchmark1" ? "primary.dark" : "rgba(255, 255, 255, 0.4)",
                      borderColor: "white",
                    },
                  }}
                >
                  <Typography variant="caption" sx={{ fontSize: "0.6rem", color: "white", fontWeight: baseline === "benchmark1" ? 600 : 400 }}>
                    Benchmark 1
                  </Typography>
                </Box>
                <Box
                  onClick={() => setBaseline("benchmark2")}
                  sx={{
                    width: 130,
                    height: 16,
                    bgcolor: baseline === "benchmark2" ? "primary.main" : "rgba(255, 255, 255, 0.25)",
                    borderRadius: 1,
                    cursor: "pointer",
                    border: baseline === "benchmark2" ? "2px solid white" : "1px solid rgba(255, 255, 255, 0.4)",
                    transition: "all 0.2s",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    "&:hover": {
                      bgcolor: baseline === "benchmark2" ? "primary.dark" : "rgba(255, 255, 255, 0.4)",
                      borderColor: "white",
                    },
                  }}
                >
                  <Typography variant="caption" sx={{ fontSize: "0.6rem", color: "white", fontWeight: baseline === "benchmark2" ? 600 : 400 }}>
                    Benchmark 2
                  </Typography>
                </Box>
              </Box>
              
              {/* Input fields */}
              <Box sx={{ display: "flex", gap: 0.4 }}>
                <Autocomplete
                sx={{ width: 130, "& .MuiInputBase-root": { fontSize: "0.75rem" }, "& .MuiInputLabel-root": { fontSize: "0.75rem" } }}
                size="small"
                options={[{ isin: "", name: "None" }, ...rawStockData]}
                getOptionLabel={(option: any) => option.isin === "" ? "None" : `${option.name} (${option.isin})`}
                value={rawStockData.find((s: any) => s.isin === selectedStockIsin) || { isin: "", name: "None" } as any}
                onChange={(_, newValue: any) => setSelectedStockIsin(newValue?.isin || "")}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label=""
                    sx={{
                      bgcolor: "white",
                      borderRadius: 1,
                      "& .MuiOutlinedInput-root": {
                        bgcolor: baseline === "portfolio1" ? "rgba(150, 150, 150, 0.2)" : "white",
                      },
                    }}
                  />
                )}
              />
              <Autocomplete
                sx={{ width: 130, "& .MuiInputBase-root": { fontSize: "0.75rem" }, "& .MuiInputLabel-root": { fontSize: "0.75rem" } }}
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
                onChange={(_, newValue: any) => setPortfolio2Key(newValue?.id || "")}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label=""
                    sx={{
                      bgcolor: "white",
                      borderRadius: 1,
                      "& .MuiOutlinedInput-root": {
                        bgcolor: baseline === "portfolio2" ? "rgba(150, 150, 150, 0.2)" : "white",
                      },
                    }}
                  />
                )}
              />
              <Autocomplete
                sx={{ width: 130, "& .MuiInputBase-root": { fontSize: "0.75rem" }, "& .MuiInputLabel-root": { fontSize: "0.75rem" } }}
                size="small"
                options={benchmarkOptions}
                getOptionLabel={(option) => option.label}
                value={benchmarkOptions.find((b) => b.id === benchmarkId) || benchmarkOptions[0]}
                onChange={(_, newValue) => setBenchmarkId(newValue?.id || "none")}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label=""
                    sx={{
                      bgcolor: "white",
                      borderRadius: 1,
                      "& .MuiOutlinedInput-root": {
                        bgcolor: baseline === "benchmark1" ? "rgba(150, 150, 150, 0.2)" : "white",
                      },
                    }}
                  />
                )}
              />
              <Autocomplete
                sx={{ width: 130, "& .MuiInputBase-root": { fontSize: "0.75rem" }, "& .MuiInputLabel-root": { fontSize: "0.75rem" } }}
                size="small"
                options={benchmarkOptions}
                getOptionLabel={(option) => option.label}
                value={benchmarkOptions.find((b) => b.id === benchmark2Id) || benchmarkOptions[0]}
                onChange={(_, newValue) => setBenchmark2Id(newValue?.id || "none")}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label=""
                    sx={{
                      bgcolor: "white",
                      borderRadius: 1,
                      "& .MuiOutlinedInput-root": {
                        bgcolor: baseline === "benchmark2" ? "rgba(150, 150, 150, 0.2)" : "white",
                      },
                    }}
                  />
                )}
              />
              </Box>
            </Box>
          </Box>
            
          <Divider orientation="vertical" sx={{ bgcolor: 'white', width: '0.4px', alignSelf: 'stretch', mx: 1 }} />
            
            {/* Level and filter controls */}
            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
              <ToggleButtonGroup
                exclusive
                size="small"
                value={level}
                onChange={(_, val) => val && setLevel(val as Level)}
                sx={{ bgcolor: "white", borderRadius: 1, "& .MuiToggleButton-root": { fontSize: "0.7rem", px: 1, py: 0.4 } }}
              >
                <ToggleButton value="Sectors">Sectors</ToggleButton>
                <ToggleButton value="Industry Groups">Industry Groups</ToggleButton>
              </ToggleButtonGroup>
              <ToggleButtonGroup
                exclusive
                size="small"
                value={categoryFilter}
                onChange={(_, val) => val && setCategoryFilter(val as CategoryFilter)}
                sx={{ bgcolor: "white", borderRadius: 1, "& .MuiToggleButton-root": { fontSize: "0.7rem", px: 1, py: 0.4 } }}
              >
                <ToggleButton value="All">All</ToggleButton>
                <ToggleButton value="Top 5">Top 5</ToggleButton>
                <ToggleButton value="Top 10">Top 10</ToggleButton>
              </ToggleButtonGroup>
            </Box>
            
            <Divider orientation="vertical" sx={{ bgcolor: 'white', width: '0.4px', alignSelf: 'stretch', mx: 1 }} />
            
            {/* Similar Stocks controls */}
            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
              <ToggleButtonGroup
                exclusive
                size="small"
                value={featureType}
                onChange={(_, val) => val && setFeatureType(val as "both" | "sectors" | "industryGroups")}
                sx={{ bgcolor: "white", borderRadius: 1, "& .MuiToggleButton-root": { fontSize: "0.7rem", px: 1, py: 0.4 } }}
              >
                <ToggleButton value="both">Both</ToggleButton>
                <ToggleButton value="sectors">Sectors</ToggleButton>
                <ToggleButton value="industryGroups">Ind. Groups</ToggleButton>
              </ToggleButtonGroup>
              
              <Box sx={{ display: "flex", gap: 0.5 }}>
                <Box>
                  <Typography variant="caption" sx={{ fontSize: "0.65rem", color: "white", display: "block" }}>K: {k}</Typography>
                  <TextField
                    type="number"
                    value={k}
                    onChange={(e) => setK(Number(e.target.value))}
                    size="small"
                    inputProps={{ min: 5, max: 150, step: 1, style: { fontSize: "0.7rem", padding: "2px 4px" } }}
                    sx={{ width: 60, bgcolor: "white", borderRadius: 1, "& .MuiInputBase-root": { height: "24px" } }}
                  />
                </Box>
                
                <Box>
                  <Typography variant="caption" sx={{ fontSize: "0.65rem", color: "white", display: "block" }}>Iter: {iterations}</Typography>
                  <TextField
                    type="number"
                    value={iterations}
                    onChange={(e) => setIterations(Number(e.target.value))}
                    size="small"
                    inputProps={{ min: 100, max: 1000, step: 50, style: { fontSize: "0.7rem", padding: "2px 4px" } }}
                    sx={{ width: 60, bgcolor: "white", borderRadius: 1, "& .MuiInputBase-root": { height: "24px" } }}
                  />
                </Box>
                
                <Box>
                  <Typography variant="caption" sx={{ fontSize: "0.65rem", color: "white", display: "block" }}>Peer: {kPeer}</Typography>
                  <TextField
                    type="number"
                    value={kPeer}
                    onChange={(e) => setKPeer(Number(e.target.value))}
                    size="small"
                    inputProps={{ min: 0, max: 10, step: 1, style: { fontSize: "0.7rem", padding: "2px 4px" } }}
                    sx={{ width: 60, bgcolor: "white", borderRadius: 1, "& .MuiInputBase-root": { height: "24px" } }}
                  />
                </Box>
                
                <Box>
                  <Typography variant="caption" sx={{ fontSize: "0.65rem", color: "white", display: "block" }}>Cool: {coolingRate.toFixed(1)}</Typography>
                  <TextField
                    type="number"
                    value={coolingRate}
                    onChange={(e) => setCoolingRate(Number(e.target.value))}
                    size="small"
                    inputProps={{ min: 0.5, max: 2.0, step: 0.1, style: { fontSize: "0.7rem", padding: "2px 4px" } }}
                    sx={{ width: 60, bgcolor: "white", borderRadius: 1, "& .MuiInputBase-root": { height: "24px" } }}
                  />
                </Box>
              </Box>
            </Box>
          
          <Divider orientation="vertical" sx={{ bgcolor: 'white', width: '0.4px', alignSelf: 'stretch', mx: 1 }} />
          
          {/* Utility Buttons Box */}
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1, minWidth: 450 }}>
            {/* Top row: utility buttons */}
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, justifyContent: "flex-end" }}>
              <Button
                color="inherit"
                size="small"
                onClick={() => setShowPortfolioBuilder(true)}
                sx={{ border: "1px solid white", fontSize: "0.75rem", px: 1.5 }}
              >
                Portfolio Builder
              </Button>
              <Button
                color="inherit"
                size="small"
                onClick={() => setShowOverlay(true)}
                sx={{ border: "1px solid white", fontSize: "0.75rem", px: 1.5 }}
              >
                Data Validity
              </Button>
            </Box>
            
            {/* Bottom row: state controls */}
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, flexWrap: "nowrap", justifyContent: "flex-end" }}>
              <TextField
                value={stateName}
                onChange={(e) => setStateName(e.target.value)}
                size="small"
                label=""
                placeholder="State name"
                inputProps={{ maxLength: 8 }}
                sx={{ width: 100, bgcolor: "white", borderRadius: 1 }}
              />
              <Button
                color="inherit"
                size="small"
                variant="outlined"
                sx={{ 
                  border: "1px solid white",
                  fontSize: "0.75rem",
                  px: 1.5,
                  minWidth: "auto",
                  '&.Mui-disabled': {
                    color: 'rgba(255, 255, 255, 0.5)',
                    borderColor: 'rgba(255, 255, 255, 0.5)',
                  }
                }}
                onClick={handleSaveState}
                disabled={!stateName.trim() || savedStates.length >= maxSavedStates}
              >
                Save
              </Button>
              {savedStates.length === 0 ? (
                <Typography variant="caption" color="white" sx={{ whiteSpace: "nowrap" }}>
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
                      sx={{ border: "0.5px solid white", minWidth: "auto", fontSize: "0.75rem", px: 1 }}
                      onClick={() => handleLoadState(state)}
                    >
                      {state.name}
                    </Button>
                  ))}
                </>
              )}
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
            borderRight: {
              xs: "none",
              md: "2px solid #555",
            },
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

          <Box
            sx={{
              borderTop: "2px solid #000000ff",
              my: 1,
            }}
          />

          <Box sx={{ flexGrow: 1 }}>
            <StockListPanel 
              section="lower" 
              selectedStockIsin={selectedStockIsin}
              onStockSelect={setSelectedStockIsin}
            />
          </Box>
        </Box>
        <Box
          sx={{
            width: "100%",
            maxWidth: 900,
            ml: { md: 0.2 },
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

          <Divider sx={{ my: 4 }} />

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
    </Box>
  );
}

export default App;

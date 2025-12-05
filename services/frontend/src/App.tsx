import React, { useRef, useState } from "react";
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  Divider,
  Button,
  TextField,
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

function App() {
  const [showOverlay, setShowOverlay] = useState(false);
  const [showPortfolioBuilder, setShowPortfolioBuilder] = useState(false);
  const [selectedStockIsin, setSelectedStockIsin] = useState<string>(
    rawStockData[0]?.isin ?? ""
  );

  const companies = rawStockData.map((s: any) => ({
    isin: s.isin,
    name: s.name,
  }));
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
        <Toolbar sx={{ justifyContent: "space-between" }}>
          <Typography variant="h6" sx={{ flexShrink: 0 }}>
            Plotential
          </Typography>
          <Box
            sx={{
              flexGrow: 1,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: 1,
              flexWrap: "wrap",
            }}
          >
            <TextField
              value={stateName}
              onChange={(e) => setStateName(e.target.value)}
              size="small"
              label=""
              inputProps={{ maxLength: 8 }}
              sx={{ width: 150, bgcolor: "white", borderRadius: 1 }}
            />
            <Button
              color="inherit"
              size="small"
              variant="outlined"
              sx={{ 
                border: "1px solid white",
                '&.Mui-disabled': {
                  color: 'rgba(255, 255, 255, 0.5)',
                  borderColor: 'rgba(255, 255, 255, 0.5)',
                }
              }}
              onClick={handleSaveState}
              disabled={!stateName.trim() || savedStates.length >= maxSavedStates}
            >
              Save state
            </Button>
            {savedStates.length === 0 ? (
              <Typography variant="caption" color="white">
                No saved states
              </Typography>
            ) : (
              <>
                <Divider orientation="vertical" sx={{ bgcolor: 'white', width: '0.4px', height: '30px'}} />
                {savedStates.map((state) => (
                  <Button
                    key={state.name}
                    color="inherit"
                    size="small"
                    variant="outlined"
                    sx={{ border: "0.5px solid white" }}
                    onClick={() => handleLoadState(state)}
                  >
                    {state.name}
                  </Button>
                ))}
              </>
            )}
          </Box>
          <Box
            sx={{ display: "flex", alignItems: "center", gap: 1, ml: 1 }}
          >
            <Button
              color="inherit"
              size="small"
              onClick={() => setShowPortfolioBuilder(true)}
              sx={{ border: "1px solid white" }}
            >
              Portfolio Builder
            </Button>
            <Button
              color="inherit"
              size="small"
              onClick={() => setShowOverlay(true)}
              sx={{ border: "1px solid white" }}
            >
              Data Validity
            </Button>
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
          />

          <Divider sx={{ my: 4 }} />

          <SimilarStocks 
            selectedStockIsin={selectedStockIsin}
            onStockSelect={setSelectedStockIsin}
          />
        </Box>
      </Box>
    </Box>
  );
}

export default App;

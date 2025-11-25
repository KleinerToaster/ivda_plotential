import React, { useState } from "react";
import { AppBar, Toolbar, Typography, Box, Divider, Button } from "@mui/material";
import "./App.css";

import WeightDifferenceView from "./components/WeightDifferenceView";
import StockListPanel from "./components/StockListPanel";
import SimilarStocks from "./components/SimilarStocks";
import DataValidityOverlay from "./components/DataValidityOverlay";
import rawStockData from "./stock_data.json";

function App() {
  const [showOverlay, setShowOverlay] = useState(false);

  const companies = rawStockData.map((s: any) => ({
    isin: s.isin,
    name: s.name,
  }));

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar
        position="static"
        sx={{
          backgroundColor: "rgba(0, 0, 0, 0.7)",
        }}
      >
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Plotential
          </Typography>
          <Button
            color="inherit"
            size="small"
            onClick={() => setShowOverlay(true)}
            sx={{ border: "1px solid white", ml: 2 }}
          >
            Data Validity
          </Button>
        </Toolbar>
      </AppBar>
      <DataValidityOverlay
        open={showOverlay}
        onClose={() => setShowOverlay(false)}
        companies={companies}
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
          <Box sx={{ mb: 3 }}>
            <Box id="drilldown-section">
              <StockListPanel section="drilldown" />
            </Box>
          </Box>

          <Box
            sx={{
              borderTop: "2px solid #555",
              my: 2,
            }}
          />

          <Box sx={{ flexGrow: 1 }}>
            <StockListPanel section="lower" />
          </Box>
        </Box>
        <Box
          sx={{
            width: "100%",
            maxWidth: 900,
            ml: { md: 3 },
          }}
        >
          <WeightDifferenceView />

          <Divider sx={{ my: 4 }} />

          <SimilarStocks />
        </Box>
      </Box>
    </Box>
  );
}

export default App;

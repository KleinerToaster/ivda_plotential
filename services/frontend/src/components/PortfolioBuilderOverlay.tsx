import React, { useState, useMemo } from "react";
import {
  Box,
  Typography,
  Modal,
  IconButton,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  Chip,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";

interface PortfolioBuilderOverlayProps {
  open: boolean;
  onClose: () => void;
  stocks: { isin: string; name: string }[];
}

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

const PortfolioBuilderOverlay: React.FC<PortfolioBuilderOverlayProps> = ({
  open,
  onClose,
  stocks,
}) => {
  const [portfolioName, setPortfolioName] = useState<string>("");
  const [selectedStockIsin, setSelectedStockIsin] = useState<string>(
    stocks[0]?.isin || ""
  );
  const [stockWeight, setStockWeight] = useState<number>(10);
  const [portfolioStocks, setPortfolioStocks] = useState<PortfolioStock[]>([]);
  const [savedPortfolios, setSavedPortfolios] = useState<Portfolio[]>([]);

  const totalWeight = useMemo(() => {
    return portfolioStocks.reduce((sum, stock) => sum + stock.weight, 0);
  }, [portfolioStocks]);

  const handleAddStock = () => {
    const stock = stocks.find((s) => s.isin === selectedStockIsin);
    if (!stock) return;

    // Check if stock already exists in portfolio
    const existingIndex = portfolioStocks.findIndex(
      (s) => s.isin === stock.isin
    );

    if (existingIndex >= 0) {
      // Update existing stock weight
      const updated = [...portfolioStocks];
      updated[existingIndex].weight += stockWeight;
      setPortfolioStocks(updated);
    } else {
      // Add new stock
      setPortfolioStocks([
        ...portfolioStocks,
        {
          isin: stock.isin,
          name: stock.name,
          weight: stockWeight,
        },
      ]);
    }
  };

  const handleRemoveStock = (isin: string) => {
    setPortfolioStocks(portfolioStocks.filter((s) => s.isin !== isin));
  };

  const handleSavePortfolio = () => {
    if (!portfolioName.trim()) {
      alert("Please enter a portfolio name");
      return;
    }

    if (portfolioStocks.length === 0) {
      alert("Please add at least one stock to the portfolio");
      return;
    }

    const newPortfolio: Portfolio = {
      id: Date.now().toString(),
      name: portfolioName.trim(),
      stocks: portfolioStocks,
      createdAt: new Date().toISOString(),
    };

    const updatedPortfolios = [...savedPortfolios, newPortfolio];
    setSavedPortfolios(updatedPortfolios);

    // Save to localStorage
    localStorage.setItem("portfolios", JSON.stringify(updatedPortfolios));

    // Reset form
    setPortfolioName("");
    setPortfolioStocks([]);

    alert(`Portfolio "${newPortfolio.name}" saved successfully!`);
  };

  const handleDeletePortfolio = (portfolioId: string) => {
    const updatedPortfolios = savedPortfolios.filter(
      (p) => p.id !== portfolioId
    );
    setSavedPortfolios(updatedPortfolios);
    localStorage.setItem("portfolios", JSON.stringify(updatedPortfolios));
  };

  const handleLoadPortfolio = (portfolio: Portfolio) => {
    setPortfolioName(portfolio.name);
    setPortfolioStocks(portfolio.stocks);
  };

  // Load saved portfolios on mount
  React.useEffect(() => {
    const saved = localStorage.getItem("portfolios");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSavedPortfolios(parsed);
      } catch (e) {
        console.error("Failed to parse saved portfolios", e);
      }
    }
  }, []);

  return (
    <Modal open={open} onClose={onClose}>
      <Box
        sx={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: 700,
          maxHeight: "90vh",
          bgcolor: "white",
          borderRadius: 2,
          p: 3,
          boxShadow: 24,
          display: "flex",
          flexDirection: "column",
          gap: 2,
          overflow: "auto",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center" }}>
          <Typography variant="h5" sx={{ flexGrow: 1 }}>
            Portfolio Builder
          </Typography>
          <IconButton size="small" onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Box>

        <Divider />

        {/* Portfolio Name */}
        <TextField
          fullWidth
          size="small"
          label="Portfolio Name"
          value={portfolioName}
          onChange={(e) => setPortfolioName(e.target.value)}
          placeholder="Enter portfolio name"
        />

        {/* Add Stock Section */}
        <Box>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Add Stock to Portfolio
          </Typography>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "2fr 1fr auto",
              gap: 1.5,
              alignItems: "center",
            }}
          >
            <FormControl fullWidth size="small">
              <InputLabel>Stock</InputLabel>
              <Select
                value={selectedStockIsin}
                label="Stock"
                onChange={(e) => setSelectedStockIsin(e.target.value)}
              >
                {stocks.map((s) => (
                  <MenuItem key={s.isin} value={s.isin}>
                    {s.name} ({s.isin})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              size="small"
              label="Weight (%)"
              type="number"
              value={stockWeight}
              onChange={(e) => {
                const val = Number(e.target.value);
                if (!Number.isNaN(val) && val > 0) {
                  setStockWeight(val);
                }
              }}
              inputProps={{ min: 0, max: 100, step: 1 }}
            />

            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleAddStock}
              sx={{ height: 40 }}
            >
              Add
            </Button>
          </Box>
        </Box>

        {/* Current Portfolio Stocks */}
        <Box>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mb: 1,
            }}
          >
            <Typography variant="subtitle2">Portfolio Stocks</Typography>
            <Chip
              label={`Total: ${totalWeight.toFixed(1)}%`}
              color={totalWeight === 100 ? "success" : "warning"}
              size="small"
            />
          </Box>

          <Paper
            variant="outlined"
            sx={{ maxHeight: 200, overflow: "auto", minHeight: 100 }}
          >
            {portfolioStocks.length === 0 ? (
              <Box sx={{ p: 2, textAlign: "center" }}>
                <Typography variant="body2" color="text.secondary">
                  No stocks added yet
                </Typography>
              </Box>
            ) : (
              <List dense disablePadding>
                {portfolioStocks.map((stock, idx) => (
                  <React.Fragment key={stock.isin}>
                    {idx > 0 && <Divider />}
                    <ListItem>
                      <ListItemText
                        primary={stock.name}
                        secondary={stock.isin}
                      />
                      <ListItemSecondaryAction
                        sx={{ display: "flex", gap: 1, alignItems: "center" }}
                      >
                        <Typography variant="body2" sx={{ mr: 2 }}>
                          {stock.weight.toFixed(1)}%
                        </Typography>
                        <IconButton
                          edge="end"
                          size="small"
                          onClick={() => handleRemoveStock(stock.isin)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </ListItemSecondaryAction>
                    </ListItem>
                  </React.Fragment>
                ))}
              </List>
            )}
          </Paper>
        </Box>

        {/* Save Button */}
        <Button
          variant="contained"
          color="primary"
          onClick={handleSavePortfolio}
          disabled={portfolioStocks.length === 0 || !portfolioName.trim()}
          fullWidth
        >
          Save Portfolio
        </Button>

        <Divider />

        {/* Saved Portfolios */}
        <Box>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Saved Portfolios ({savedPortfolios.length})
          </Typography>
          <Paper
            variant="outlined"
            sx={{ maxHeight: 200, overflow: "auto", minHeight: 100 }}
          >
            {savedPortfolios.length === 0 ? (
              <Box sx={{ p: 2, textAlign: "center" }}>
                <Typography variant="body2" color="text.secondary">
                  No saved portfolios yet
                </Typography>
              </Box>
            ) : (
              <List dense disablePadding>
                {savedPortfolios.map((portfolio, idx) => (
                  <React.Fragment key={portfolio.id}>
                    {idx > 0 && <Divider />}
                    <ListItem
                      onClick={() => handleLoadPortfolio(portfolio)}
                      sx={{ cursor: "pointer", "&:hover": { bgcolor: "action.hover" } }}
                    >
                      <ListItemText
                        primary={portfolio.name}
                        secondary={`${portfolio.stocks.length} stocks • ${new Date(
                          portfolio.createdAt
                        ).toLocaleDateString()}`}
                      />
                      <ListItemSecondaryAction>
                        <IconButton
                          edge="end"
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeletePortfolio(portfolio.id);
                          }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </ListItemSecondaryAction>
                    </ListItem>
                  </React.Fragment>
                ))}
              </List>
            )}
          </Paper>
        </Box>
      </Box>
    </Modal>
  );
};

export default PortfolioBuilderOverlay;

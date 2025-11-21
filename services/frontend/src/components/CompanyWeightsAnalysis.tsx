import React, { useEffect, useState } from "react";
import { Card, CardContent, Typography, Box, FormControl, InputLabel, Select, MenuItem, FormControlLabel, Switch } from "@mui/material";
import Plot from "react-plotly.js";
import { CompanyISIN, CompanySector, CompanyIndustryGroup } from "./types";

interface WeightBar {
  label: string;
  value: number;
}

export const CompanyWeightsAnalysis: React.FC = () => {
  const [companies, setCompanies] = useState<CompanyISIN[]>([]);
  const [selectedIsin, setSelectedIsin] = useState<string>("");
  const [benchmark] = useState<string>("World");
  const [showIndustryGroups, setShowIndustryGroups] = useState<boolean>(false);

  const [sectorWeights, setSectorWeights] = useState<WeightBar[]>([]);
  const [industryGroupWeights, setIndustryGroupWeights] = useState<WeightBar[]>([]);
  const [sectorConfidence, setSectorConfidence] = useState<number | null>(null);

  // Fetch list of companies for the stock selector
  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const res = await fetch("http://127.0.0.1:5000/companies_isin");
        const data: any[] = await res.json();
        const mapped: CompanyISIN[] = data.map((c) => ({
          id: c.id,
          isin: c.isin,
          name: c.name,
          description: c.description,
          country: c.country,
          market_cap: c.market_cap,
          stocks_owned: c.stocks_owned,
        }));
        setCompanies(mapped);
        if (mapped.length > 0) {
          setSelectedIsin(mapped[0].isin);
        }
      } catch (e) {
        console.error("Error fetching companies for weights analysis:", e);
      }
    };

    fetchCompanies();
  }, []);

  // Fetch sector and industry group weights for the selected company
  useEffect(() => {
    if (!selectedIsin) return;

    const fetchWeights = async () => {
      try {
        // Fetch sector info for the specific ISIN
        const sectorRes = await fetch(`http://127.0.0.1:5000/companies_sector/${selectedIsin}`);
        const sectorData: CompanySector = await sectorRes.json();

        // Extract confidence and convert to percentage
        const rawConfidence = (sectorData as any).confidence;
        let parsedConfidence: number | null = null;

        if (typeof rawConfidence === "number") {
          parsedConfidence = rawConfidence <= 1 ? rawConfidence * 100 : rawConfidence;
        } else if (typeof rawConfidence === "string") {
          const parsed = parseFloat(rawConfidence);
          if (!Number.isNaN(parsed)) {
            parsedConfidence = parsed <= 1 ? parsed * 100 : parsed;
          }
        }

        setSectorConfidence(parsedConfidence);

        // Map sector fields to label/value pairs
        const sectorFields: { key: keyof CompanySector; label: string }[] = [
          { key: "communication_services", label: "Communication Services" },
          { key: "consumer_discretionary", label: "Consumer Discretionary" },
          { key: "consumer_staples", label: "Consumer Staples" },
          { key: "energy", label: "Energy" },
          { key: "financials", label: "Financials" },
          { key: "health_care", label: "Health Care" },
          { key: "industrials", label: "Industrials" },
          { key: "information_technology", label: "Information Technology" },
          { key: "materials", label: "Materials" },
          { key: "real_estate", label: "Real Estate" },
          { key: "utilities", label: "Utilities" },
        ];

        const rawSectorWeights: WeightBar[] = [];
        sectorFields.forEach(({ key, label }) => {
          const v = sectorData[key];
          let num: number | null = null;

          if (typeof v === "number") {
            num = v;
          } else if (typeof v === "string") {
            const parsed = parseFloat(v);
            if (!Number.isNaN(parsed)) {
              num = parsed;
            }
          }

          if (num !== null && num > 0) {
            rawSectorWeights.push({ label, value: num });
          }
        });

        // Normalize to 100%
        const sectorTotal = rawSectorWeights.reduce((sum, s) => sum + s.value, 0) || 1;
        const normalizedSectors = rawSectorWeights.map((s) => ({
          label: s.label,
          value: (s.value / sectorTotal) * 100,
        }));
        setSectorWeights(normalizedSectors);

        // Optionally fetch industry group weights
        if (showIndustryGroups) {
          const igRes = await fetch("http://127.0.0.1:5000/company_industry_group");
          const igData: CompanyIndustryGroup[] = await igRes.json();
          const filtered = igData.filter((ig) => ig.isin === selectedIsin);

          const rawIGWeights: WeightBar[] = filtered.map((ig) => ({
            label: ig.gics_industry_group,
            value: ig.confidence,
          }));

          const igTotal = rawIGWeights.reduce((sum, s) => sum + s.value, 0) || 1;
          const normalizedIG = rawIGWeights.map((s) => ({
            label: s.label,
            value: (s.value / igTotal) * 100,
          }));
          setIndustryGroupWeights(normalizedIG);
        } else {
          setIndustryGroupWeights([]);
        }
      } catch (e) {
        console.error("Error fetching weights for company:", e);
        setSectorWeights([]);
        setIndustryGroupWeights([]);
        setSectorConfidence(null);
      }
    };

    fetchWeights();
  }, [selectedIsin, showIndustryGroups]);

  const selectedCompanyName = companies.find((c) => c.isin === selectedIsin)?.name || "";

  const sectorLayout = {
    title: {
      text: "Sector Weights for Selected Stock",
      font: { size: 16 },
    },
    barmode: "group" as const,
    yaxis: {
      title: "Weight (%)",
      range: [0, 100],
    },
    margin: { l: 50, r: 20, t: 60, b: 80 },
  };

  const igLayout = {
    title: {
      text: "Industry Group Weights (Selected Stock)",
      font: { size: 16 },
    },
    barmode: "group" as const,
    yaxis: {
      title: "Weight (%)",
      range: [0, 100],
    },
    margin: { l: 50, r: 20, t: 60, b: 80 },
  };

  return (
    <Card>
      <CardContent>
        <Box display="flex" flexDirection="column" gap={2}>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">Absolute Weights Analysis</Typography>
            {sectorConfidence !== null && (
              <Box
                sx={{
                  px: 1.5,
                  py: 0.25,
                  borderRadius: 999,
                  bgcolor: "#E5F3FF",
                  color: "#1D4ED8",
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                Confidence: {sectorConfidence.toFixed(1)}%
              </Box>
            )}
          </Box>

          {/* Controls */}
          <Box display="grid" gridTemplateColumns={{ xs: "1fr", md: "repeat(2, minmax(0, 1fr))" }} gap={2}>
            <FormControl size="small" fullWidth>
              <InputLabel id="stock-select-label">Selected stock</InputLabel>
              <Select
                labelId="stock-select-label"
                label="Selected stock"
                value={selectedIsin}
                onChange={(e) => setSelectedIsin(e.target.value as string)}
              >
                {companies.map((c) => (
                  <MenuItem key={c.isin} value={c.isin}>
                    {c.name} ({c.isin})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl size="small" fullWidth>
              <InputLabel id="benchmark-select-label">Benchmark</InputLabel>
              <Select
                labelId="benchmark-select-label"
                label="Benchmark"
                value={benchmark}
                // Single fixed option for now
                onChange={() => {}}
              >
                <MenuItem value="World">World</MenuItem>
              </Select>
            </FormControl>

            <FormControlLabel
              control={
                <Switch
                  checked={showIndustryGroups}
                  onChange={(e) => setShowIndustryGroups(e.target.checked)}
                  color="primary"
                />
              }
              label="Display Industry Groups"
            />
          </Box>

          {/* Sector weights bar chart */}
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              {selectedCompanyName ? `Sector weights for ${selectedCompanyName}` : "Sector weights"}
            </Typography>
            <Plot
              data={[
                {
                  x: sectorWeights.map((s) => s.label),
                  y: sectorWeights.map((s) => s.value),
                  type: "bar" as const,
                  marker: { color: "#4285F4" },
                  name: "Sector weight",
                },
              ]}
              layout={sectorLayout as any}
              style={{ width: "100%", height: 350 }}
              config={{ displayModeBar: false, responsive: true }}
              useResizeHandler
            />
          </Box>

          {/* Industry group weights (optional) */}
          {showIndustryGroups && (
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Industry group weights
              </Typography>
              <Plot
                data={[
                  {
                    x: industryGroupWeights.map((s) => s.label),
                    y: industryGroupWeights.map((s) => s.value),
                    type: "bar" as const,
                    marker: { color: "#0F9D58" },
                    name: "Industry group weight",
                  },
                ]}
                layout={igLayout as any}
                style={{ width: "100%", height: 350 }}
                config={{ displayModeBar: false, responsive: true }}
                useResizeHandler
              />
            </Box>
          )}
        </Box>
      </CardContent>
    </Card>
  );
};

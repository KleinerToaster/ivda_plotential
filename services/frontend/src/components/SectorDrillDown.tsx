import React, { useState, useEffect } from "react";
import { Card, CardContent, Typography, Box, Button, Chip } from "@mui/material";
import { ExpandMore, ChevronRight } from "@mui/icons-material";
import { CompanySector, CompanyIndustryGroup } from "./types";

interface SectorStock {
  isin: string;
  name: string;
  weight: number; // weight within its group
}

interface IndustryGroup {
  name: string;
  weight: number; // aggregate weight of all stocks in this group
  stocks: SectorStock[];
  expanded: boolean;
}

interface Sector {
  name: string; // e.g. country or sector name
  weight: number; // aggregate weight of all industry groups in this sector
  industryGroups: IndustryGroup[];
  expanded: boolean;
}

interface SectorDrillDownProps {
  selectedCategory: string;
}

export const SectorDrillDown: React.FC<SectorDrillDownProps> = ({ selectedCategory }) => {
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [cutoff] = useState(50);
  const subset = selectedCategory.toLowerCase() === "portfolio" ? "Portfolio" : "All companies";

  // Build sector / industry group structure from backend data
  // Re-run whenever the selectedCategory (All vs Portfolio) changes
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [sectorRes, igRes, isinRes] = await Promise.all([
          fetch("http://127.0.0.1:5000/companies_sector"),
          fetch("http://127.0.0.1:5000/company_industry_group"),
          fetch("http://127.0.0.1:5000/companies_isin"),
        ]);

        const sectorData: CompanySector[] = await sectorRes.json();
        const igData: CompanyIndustryGroup[] = await igRes.json();
        const isinData: any[] = await isinRes.json();

        if (!Array.isArray(sectorData) || sectorData.length === 0) {
          setSectors([]);
          return;
        }

        // Determine which ISINs are visible given the selectedCategory
        const visibleIsins = new Set<string>();
        isinData.forEach((c) => {
          const stocksOwned = c.stocks_owned ?? 0;
          if (selectedCategory.toLowerCase() === "portfolio") {
            if (stocksOwned > 0 && c.isin) {
              visibleIsins.add(c.isin);
            }
          } else {
            if (c.isin) {
              visibleIsins.add(c.isin);
            }
          }
        });

        // Map industry-group docs by ISIN
        const igByIsin = new Map<string, CompanyIndustryGroup>();
        igData.forEach((ig) => {
          if (ig.isin) {
            igByIsin.set(ig.isin, ig);
          }
        });

        // sectorsMap: sector name -> (industry group name -> list of stocks with raw weights)
        const sectorsMap = new Map<
          string,
          Map<string, { stocks: SectorStock[]; totalWeight: number }>
        >();

        sectorData.forEach((item) => {
          // Only include companies that are visible in the scatter plot
          if (!visibleIsins.has(item.isin)) {
            return;
          }
          const sectorName = item.gics_sector || "Unknown sector";
          const igDoc = igByIsin.get(item.isin);
          const igName = igDoc?.gics_industry_group || "Unknown Industry Group";

          const rawWeight = igDoc?.confidence ?? item.confidence ?? 1;

          if (!sectorsMap.has(sectorName)) {
            sectorsMap.set(sectorName, new Map());
          }
          const igMap = sectorsMap.get(sectorName)!;

          if (!igMap.has(igName)) {
            igMap.set(igName, { stocks: [], totalWeight: 0 });
          }
          const entry = igMap.get(igName)!;
          entry.stocks.push({
            isin: item.isin,
            name: item.name,
            weight: rawWeight,
          });
          entry.totalWeight += rawWeight;
        });

        const builtSectors: Sector[] = [];

        sectorsMap.forEach((igMap, sectorName) => {
          let sectorTotal = 0;

          const industryGroups: IndustryGroup[] = [];

          igMap.forEach((entry) => {
            sectorTotal += entry.totalWeight;
          });

          igMap.forEach((entry, igName) => {
            const igTotal = entry.totalWeight || 1;
            const normalizedStocks = entry.stocks.map((s) => ({
              ...s,
              weight: (s.weight / igTotal) * 100,
            }));

            const igWeight = (entry.totalWeight / (sectorTotal || 1)) * 100;

            industryGroups.push({
              name: igName,
              weight: igWeight,
              stocks: normalizedStocks,
              expanded: false,
            });
          });

          const sector: Sector = {
            name: sectorName,
            weight: 100,
            industryGroups,
            expanded: false,
          };

          builtSectors.push(sector);
        });

        setSectors(builtSectors);
      } catch (error) {
        console.error("Error fetching sector drill-down data:", error);
        setSectors([]);
      }
    };
    fetchData();
  }, [selectedCategory]);

  const toggleSector = (sectorIndex: number) => {
    setSectors((prev) =>
      prev.map((s, i) =>
        i === sectorIndex
          ? { ...s, expanded: !s.expanded }
          : s
      )
    );
  };

  const toggleIndustryGroup = (sectorIndex: number, igIndex: number) => {
    setSectors((prev) =>
      prev.map((s, si) =>
        si === sectorIndex
          ? {
              ...s,
              industryGroups: s.industryGroups.map((ig, gi) =>
                gi === igIndex ? { ...ig, expanded: !ig.expanded } : ig
              ),
            }
          : s
      )
    );
  };

  return (
    <Card>
      <CardContent>
        <Box display="flex" flexDirection="column" gap={2} height="100%">
          <Box>
            <Typography variant="h6" gutterBottom>
              Drill-Down from Sectors to Stocks
            </Typography>
            <Box display="flex" gap={2} mb={2} flexWrap="wrap">
              <Box display="flex" alignItems="center" gap={1}>
                <Typography variant="body2" color="textSecondary">
                  Subset:
                </Typography>
                <Chip label={subset} variant="outlined" size="small" />
              </Box>
              <Box display="flex" alignItems="center" gap={1}>
                <Typography variant="body2" color="textSecondary">
                  Cutoff:
                </Typography>
                <Chip label={`${cutoff}%`} variant="outlined" size="small" />
              </Box>
            </Box>
          </Box>

          <Box maxHeight={400} overflow="auto" display="flex" flexDirection="column" gap={1}>
            {sectors.map((sector, sectorIndex) => (
              <Box key={sectorIndex} border={1} borderColor="divider" borderRadius={1}>
                <Button
                  variant="text"
                  fullWidth
                  onClick={() => toggleSector(sectorIndex)}
                  sx={{ justifyContent: "space-between", textTransform: "none", p: 1.5 }}
                >
                  <Box display="flex" alignItems="center" gap={1}>
                    {sector.expanded ? <ExpandMore fontSize="small" /> : <ChevronRight fontSize="small" />}
                    <Typography variant="body2" fontWeight={600}>
                      {sector.name}
                    </Typography>
                  </Box>
                  <Typography variant="body2" fontWeight={500}>
                    {sector.weight.toFixed(1)}%
                  </Typography>
                </Button>

                {sector.expanded && (
                  <Box pl={3} pb={1} display="flex" flexDirection="column" gap={0.5}>
                    {sector.industryGroups.map((ig, igIndex) => (
                      <Box key={igIndex}>
                        <Button
                          variant="text"
                          fullWidth
                          onClick={() => toggleIndustryGroup(sectorIndex, igIndex)}
                          sx={{ justifyContent: "space-between", textTransform: "none", p: 1 }}
                          size="small"
                        >
                          <Box display="flex" alignItems="center" gap={1}>
                            {ig.expanded ? <ExpandMore fontSize="small" /> : <ChevronRight fontSize="small" />}
                            <Typography variant="body2">{ig.name}</Typography>
                          </Box>
                          <Typography variant="body2" color="textSecondary">
                            {ig.weight.toFixed(1)}%
                          </Typography>
                        </Button>

                        {ig.expanded && (
                          <Box pl={3} display="flex" flexDirection="column" gap={0.5}>
                            {ig.stocks.map((stock, stockIndex) => (
                              <Box
                                key={stockIndex}
                                display="flex"
                                justifyContent="space-between"
                                alignItems="center"
                                p={0.5}
                              >
                                <Box display="flex" flexDirection="column">
                                  <Typography variant="body2" fontWeight={500}>
                                    {stock.name}
                                  </Typography>
                                  <Typography variant="caption" color="textSecondary">
                                    {stock.isin}
                                  </Typography>
                                </Box>
                                <Typography variant="body2" fontWeight={500}>
                                  {stock.weight.toFixed(1)}%
                                </Typography>
                              </Box>
                            ))}
                          </Box>
                        )}
                      </Box>
                    ))}
                  </Box>
                )}
              </Box>
            ))}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

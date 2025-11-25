import React, { useMemo, useState } from "react";
import {
  Box,
  Typography,
  Modal,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  ToggleButtonGroup,
  ToggleButton,
  Paper,
  Divider,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import rawDataByIsin from "../all_u_per_row.json";

interface DataValidityOverlayProps {
  open: boolean;
  onClose: () => void;
  companies: { isin: string; name: string }[];
}

interface CompanyUData {
  confidence: number | null;
  industries: { [industryGroup: string]: number };
}

const dataByIsin = rawDataByIsin as { [isin: string]: CompanyUData };

const DataValidityOverlay: React.FC<DataValidityOverlayProps> = ({
  open,
  onClose,
  companies,
}) => {
  const [companyIsin, setCompanyIsin] = useState(companies[0]?.isin || "");
  const [infoType, setInfoType] = useState<"summary" | "news">("summary");

  const selectedCompany = useMemo(
    () => companies.find((c) => c.isin === companyIsin) || companies[0],
    [companies, companyIsin]
  );

  const companyData: CompanyUData | undefined = useMemo(
    () => (selectedCompany ? dataByIsin[selectedCompany.isin] : undefined),
    [selectedCompany]
  );

  const sortedIndustries = useMemo(() => {
    if (!companyData) return [];
    return Object.entries(companyData.industries || {}).sort(
      (a, b) => b[1] - a[1]
    );
  }, [companyData]);

  const topIndustries = sortedIndustries.slice(0, 3);

  const confidencePct =
    companyData?.confidence == null
      ? null
      : companyData.confidence > 1.5
      ? companyData.confidence
      : companyData.confidence * 100;

  const totalU =
    sortedIndustries.length > 0
      ? sortedIndustries.reduce((acc, [, v]) => acc + v, 0)
      : 0;

  const avgU =
    sortedIndustries.length > 0 ? totalU / sortedIndustries.length : 0;

  return (
    <Modal open={open} onClose={onClose}>
      <Box
        sx={{
          position: "fixed",
          top: 20,
          right: 20,
          width: 380,
          bgcolor: "white",
          borderRadius: 2,
          p: 2,
          boxShadow: 4,
          display: "flex",
          flexDirection: "column",
          gap: 2,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center" }}>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Data Validity
          </Typography>
          <IconButton size="small" onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Box>

        <FormControl fullWidth size="small">
          <InputLabel>Company</InputLabel>
          <Select
            value={selectedCompany?.isin || ""}
            label="Company"
            onChange={(e) => setCompanyIsin(e.target.value)}
          >
            {companies.map((c) => (
              <MenuItem key={c.isin} value={c.isin}>
                {c.name} ({c.isin})
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Box>
          <Typography variant="caption" sx={{ mb: 1, display: "block" }}>
            Information Type
          </Typography>
          <ToggleButtonGroup
            value={infoType}
            exclusive
            size="small"
            onChange={(_, v) => v && setInfoType(v)}
          >
            <ToggleButton value="summary">Summary</ToggleButton>
          </ToggleButtonGroup>
        </Box>

        {infoType === "summary" ? (
          <>
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Summary
              </Typography>
              <Paper
                sx={{ height: 140, p: 1, overflow: "auto" }}
                variant="outlined"
              >
                {!companyData ? (
                  <Typography variant="body2" color="text.secondary">
                    No data available for {selectedCompany?.name} (
                    {selectedCompany?.isin}).
                  </Typography>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    For <strong>{selectedCompany?.name}</strong> (
                    {selectedCompany?.isin}), the model
                    {confidencePct !== null ? (
                      <>
                        {" "}
                        reports an overall confidence of{" "}
                        <strong>{confidencePct.toFixed(1)}%</strong>.
                      </>
                    ) : (
                      " did not report an overall confidence score."
                    )}{" "}
                    The top{" "}
                    {topIndustries.length > 0 ? topIndustries.length : ""}{" "}
                    industry exposure
                    {topIndustries.length === 1 ? " is" : "s are"}:
                    {topIndustries.length === 0 ? (
                      " none detected."
                    ) : (
                      <>
                        {" "}
                        {topIndustries
                          .map(
                            ([ig, u]) =>
                              `${ig} (${Math.round(u * 100)}%)`
                          )
                          .join(", ")}
                        .
                      </>
                    )}{" "}
                    Average classification strength across all assigned
                    industries is approximately{" "}
                    <strong>{(avgU * 100).toFixed(1)}%</strong>.
                  </Typography>
                )}
              </Paper>
            </Box>

            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Descriptive Statistics
              </Typography>

              <Box
                sx={{
                  border: "1px solid #ddd",
                  borderRadius: 1,
                  p: 1.5,
                  fontSize: 13,
                  bgcolor: "#fafafa",
                  height: 140,
                  overflow: "auto",
                }}
              >
                {!companyData || sortedIndustries.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    No classification breakdown available.
                  </Typography>
                ) : (
                  (() => {
                    const values = sortedIndustries.map(([, u]) => u);
                    const count = values.length;
                    const sortedValues = [...values].sort((a, b) => a - b);

                    const min = Math.min(...values);
                    const max = Math.max(...values);
                    const mean =
                      values.reduce((a, b) => a + b, 0) / count;
                    const median =
                      count % 2
                        ? sortedValues[Math.floor(count / 2)]
                        : (sortedValues[count / 2 - 1] +
                            sortedValues[count / 2]) /
                          2;
                    const variance =
                      values.reduce(
                        (sum, v) => sum + (v - mean) ** 2,
                        0
                      ) / count;
                    const std = Math.sqrt(variance);
                    const sum = values.reduce((a, b) => a + b, 0);

                    return (
                      <>
                        <Box sx={{ mb: 1 }}>
                          <Box
                            sx={{
                              display: "flex",
                              justifyContent: "space-between",
                            }}
                          >
                            <span>Industries:</span>{" "}
                            <strong>{count}</strong>
                          </Box>
                          <Box
                            sx={{
                              display: "flex",
                              justifyContent: "space-between",
                            }}
                          >
                            <span>Min [u]:</span>{" "}
                            <strong>{min.toFixed(4)}</strong>
                          </Box>
                          <Box
                            sx={{
                              display: "flex",
                              justifyContent: "space-between",
                            }}
                          >
                            <span>Max [u]:</span>{" "}
                            <strong>{max.toFixed(4)}</strong>
                          </Box>
                          <Box
                            sx={{
                              display: "flex",
                              justifyContent: "space-between",
                            }}
                          >
                            <span>Mean [u]:</span>{" "}
                            <strong>{mean.toFixed(4)}</strong>
                          </Box>
                          <Box
                            sx={{
                              display: "flex",
                              justifyContent: "space-between",
                            }}
                          >
                            <span>Median [u]:</span>{" "}
                            <strong>{median.toFixed(4)}</strong>
                          </Box>
                          <Box
                            sx={{
                              display: "flex",
                              justifyContent: "space-between",
                            }}
                          >
                          </Box>
                          <Box
                            sx={{
                              display: "flex",
                              justifyContent: "space-between",
                            }}
                          >
                          </Box>
                        </Box>

                        <Divider sx={{ my: 1 }} />

                        <Typography
                          variant="caption"
                          sx={{
                            fontWeight: "bold",
                            display: "block",
                            mb: 1,
                          }}
                        >
                          Industry Breakdown
                        </Typography>

                        {sortedIndustries.map(([ig, u]) => (
                          <Box
                            key={ig}
                            sx={{
                              display: "flex",
                              justifyContent: "space-between",
                              mb: 0.3,
                            }}
                          >
                            <span>{ig}</span>
                            <span>{u.toFixed(4)}</span>
                          </Box>
                        ))}
                      </>
                    );
                  })()
                )}
              </Box>
            </Box>
          </>
        ) : (
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Recent News
            </Typography>
            <Paper sx={{ height: 220, p: 1 }} variant="outlined">
              <Typography variant="body2" color="text.secondary">
                Hook this up to your news backend using ISIN{" "}
                <strong>{selectedCompany?.isin}</strong>.
              </Typography>
            </Paper>
          </Box>
        )}
      </Box>
    </Modal>
  );
};

export default DataValidityOverlay;

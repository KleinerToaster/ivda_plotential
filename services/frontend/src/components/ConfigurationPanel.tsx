import React, { useState, useEffect } from "react";
import { Container, Typography, Box, CardContent, Card, Button } from "@mui/material";
import ScatterPlot from "./ScatterPlot";
import SelectableCard from "./SelectableCard";
import { AIPromptComponent } from "./AIPromptComponent";
import { SectorDrillDown } from "./SectorDrillDown";
import { CompanyWeightsAnalysis } from "./CompanyWeightsAnalysis";
import { CompanyISIN } from "./types";

function ConfigurationPanel() {
  // State for poem display
  const [poem, setPoem] = useState<string | null>(null);
  const [additionalInformation, setAdditionalInformation] = useState<
    string | null
  >(null);

  const [categories, setCategories] = useState({
    values: ["All", "Portfolio"],
    selectedValue: "All",
  });

  // Control visibility of AI overlays
  const [showPoemOverlay, setShowPoemOverlay] = useState(false);

  // State for companies with name and ID information
  const [companies, setCompanies] = useState({
    values: [] as CompanyISIN[],
    selectedValue: 1,
  });

  // Fetch companies data when component mounts
  useEffect(() => {
    fetchCompanies();
  }, []);

  // Function to fetch companies from the backend
  const fetchCompanies = async () => {
    try {
      const response = await fetch("http://127.0.0.1:5000/companies_isin");
      const data = await response.json();

      if (Array.isArray(data) && data.length > 0) {
        const mapped: CompanyISIN[] = data.map((item: any) => ({
          id: item.id,
          name: item.name,
          description: item.description,
          country: item.country,
          market_cap: item.market_cap,
          stocks_owned: item.stocks_owned,
          isin: item.isin,
        }));

        setCompanies({
          values: mapped,
          selectedValue: mapped[0].id || 1,
        });
      }
    } catch (error) {
      console.error("Error fetching companies:", error);
    }
  };

  const [algorithm, setAlgorithm] = useState({
    values: ["none", "random", "regression"],
    selectedValue: "none",
  });

  // Function to handle company selection from ScatterPlot
  const changeCurrentlySelectedCompany = (companyId: number) => {
    // Find if company exists in our fetched list
    const companyExists = companies.values.some(
      (company) => company.id === companyId
    );

    if (companyExists) {
      setCompanies((prev) => ({ ...prev, selectedValue: companyId }));

      // Fetch poem for the selected company
      fetchPoem(companyId);
      fetchAdditionalInformation(companyId);
    } else {
      console.warn(
        `Company with ID ${companyId} not found in the fetched companies list`
      );
    }
  };

  const fetchPoem = async (companyId: number, keywords?: string) => {
    try {
      console.log(
        `Fetching poem for company ID: ${companyId}${
          keywords ? " with keywords: " + keywords : ""
        }`
      );
      let url = `http://127.0.0.1:5000/llm/groq/poem/${companyId}`;

      // Add keywords as query parameter if provided
      if (keywords) {
        url += `?keywords=${encodeURIComponent(keywords)}`;
      }

      const response = await fetch(url);
      const data = await response.json();
      console.log("Poem API response:", data);

      if (data && data.poem) {
        setPoem(data.poem);
      } else if (data && data.error) {
        console.error("Error from API:", data.error);
        setPoem("Could not generate poem. Please try again later.");
      } else {
        setPoem(JSON.stringify(data));
      }
    } catch (error) {
      console.error("Error fetching the poem:", error);
      setPoem(
        "Error fetching poem. Please check if the backend server is running."
      );
    }
  };

  const fetchAdditionalInformation = async (
    companyId: number,
    qualifications?: string
  ) => {
    try {
      console.log(
        `Fetching additional information for company ID: ${companyId}${
          qualifications ? " with qualifications: " + qualifications : ""
        }`
      );
      let url = `http://127.0.0.1:5000/llm/groq/additional_information/${companyId}`;

      // Add qualifications as query parameter if provided
      if (qualifications) {
        url += `?qualifications=${encodeURIComponent(qualifications)}`;
      }

      const response = await fetch(url);
      const data = await response.json();
      console.log("Additional Information API response:", data);

      if (data && data.additional_information) {
        setAdditionalInformation(data.additional_information);
      } else if (data && data.error) {
        console.error("Error from API:", data.error);
        setAdditionalInformation(
          "Could not generate qualification list. Please try again later."
        );
      } else {
        setAdditionalInformation(JSON.stringify(data));
      }
    } catch (error) {
      console.error("Error fetching the additional information:", error);
      setAdditionalInformation(
        "Error fetching qualifications. Please check if the backend server is running."
      );
    }
  };

  // Keys for triggering re-renders
  const [scatterPlotKey, setScatterPlotKey] = useState(0);

  return (
    <Container maxWidth={false} sx={{ mt: 2 }}>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "1fr 3fr" },
          gap: 2,
        }}
      >



        </Box>

        {/* Right side with all visualizations */}
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 3,
            height: "calc(100vh - 50px)",
            overflowY: "auto",
            pr: 1,
          }}
        >
          {/* Visualization section */}
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {/* Top row with scatter plot and sector drill-down */}
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "2fr 1fr",
                gap: 2,
                minHeight: "300px",
              }}
            >
              <Box sx={{ height: "100%", border: "1px solid #eee", borderRadius: 1 }}>
                <ScatterPlot
                  key={scatterPlotKey}
                  selectedCategory={categories.selectedValue}
                  onCompanyChange={changeCurrentlySelectedCompany}
                />
              </Box>
              <Box sx={{ height: "100%" }}>
                <SectorDrillDown selectedCategory={categories.selectedValue} />
              </Box>
            </Box>

            {/* Company weights analysis below */}
            <Box>
              <CompanyWeightsAnalysis />
            </Box>
                      <Box sx={{ mt: 2 }}>
            <Button
              variant="outlined"
              size="small"
              onClick={() => setShowPoemOverlay(true)}
            >
              Sector reasoning
            </Button>
            <AIPromptComponent
              title="AI Generated Poem"
              content={poem || "No poem yet. Select a company to generate one."}
              inputLabel="Add keywords to customize the poem"
              onSubmitPrompt={(keywords) => {
                if (companies.selectedValue) {
                  fetchPoem(companies.selectedValue, keywords);
                }
              }}
              open={showPoemOverlay}
              onClose={() => setShowPoemOverlay(false)}
            />
          </Box>
          </Box>
        </Box>
    </Container>
  );
}

export default ConfigurationPanel;

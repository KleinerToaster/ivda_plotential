import React, { useState, useEffect } from "react";
import { Container, Typography, Box, CardContent, Card } from "@mui/material";
import ScatterPlot from "./ScatterPlot";
import LinePlot from "./LinePlot";
import SelectableCard from "./SelectableCard";
import BarPlot from "./BarPlot";
import { AIPromptComponent } from "./AIPromptComponent";

function ConfigurationPanel() {
  // State for poem display
  const [poem, setPoem] = useState<string | null>(null);
  const [additionalInformation, setAdditionalInformation] = useState<
    string | null
  >(null);

  const [categories, setCategories] = useState({
    values: ["All", "tech", "health", "bank"],
    selectedValue: "All",
  });

  // Define a proper company type
  interface Company {
    id: number;
    name: string;
    category: string;
    founding_year: number;
    employees: number;
  }

  // State for companies with name and ID information
  const [companies, setCompanies] = useState({
    values: [] as Company[],
    selectedValue: 1,
  });

  // Fetch companies data when component mounts
  useEffect(() => {
    fetchCompanies();
  }, []);

  // Function to fetch companies from the backend
  const fetchCompanies = async () => {
    try {
      const response = await fetch("http://127.0.0.1:5000/companies");
      const data = await response.json();

      if (data && data.length > 0) {
        setCompanies({
          values: data,
          selectedValue: data[0].id || 1,
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
      // Trigger plots update
      setLinePlotKey((prev) => prev + 1);
      setBarPlotKey((prev) => prev + 1);

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
  const [linePlotKey, setLinePlotKey] = useState(0);
  const [barPlotKey, setBarPlotKey] = useState(0);

  return (
    <Container maxWidth={false} sx={{ mt: 2 }}>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "1fr 3fr" },
          gap: 2,
        }}
      >
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
          <Box>
            <Box sx={{ mt: 3 }}>
              <Typography
                variant="h6"
                sx={{
                  fontSize: "16px",
                  fontWeight: 600,
                  color: "#111827",
                  mb: 1,
                }}
              >
                Company Overview
              </Typography>

              <SelectableCard
                title="Select Category"
                value={categories.selectedValue}
                options={categories.values.map((category) => ({
                  label: category,
                  value: category,
                }))}
                onChange={(newValue) => {
                  setCategories((prev) => ({
                    ...prev,
                    selectedValue: newValue,
                  }));
                  setScatterPlotKey((prev) => prev + 1);
                }}
                showValueDisplay={false}
              />
            </Box>
            <Box sx={{ mt: 3 }}>
              <Typography
                variant="h6"
                sx={{
                  fontSize: "16px",
                  fontWeight: 600,
                  color: "#111827",
                  mb: 1,
                }}
              >
                Profit View
              </Typography>
              <SelectableCard
                title="Select a company"
                value={companies.selectedValue}
                options={companies.values.map((company) => ({
                  label: company.name,
                  value: company.id,
                }))}
                onChange={(newValue) => {
                  setCompanies((prev) => ({
                    ...prev,
                    selectedValue: newValue,
                  }));
                  setLinePlotKey((prev) => prev + 1);
                  setBarPlotKey((prev) => prev + 1);

                  // Fetch poem and additional information for the selected company
                  fetchPoem(newValue);
                  fetchAdditionalInformation(newValue);
                }}
              />
              <SelectableCard
                title="Select an Algorithm"
                value={algorithm.selectedValue}
                options={algorithm.values.map((algo) => ({
                  label: algo,
                  value: algo,
                }))}
                onChange={(newValue) => {
                  setAlgorithm((prev) => ({
                    ...prev,
                    selectedValue: newValue,
                  }));
                  setLinePlotKey((prev) => prev + 1);
                }}
                showValueDisplay={false}
              />
            </Box>
          </Box>

          {poem && (
            <AIPromptComponent
              title="AI Generated Poem"
              content={poem}
              inputLabel="Add keywords to customize the poem"
              onSubmitPrompt={(keywords) => {
                if (companies.selectedValue) {
                  fetchPoem(companies.selectedValue, keywords);
                }
              }}
            />
          )}
        </Box>

        {/* Right side with all visualizations */}
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 4,
            height: "100%",
          }}
        >
          {/* Visualization section */}
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {/* Top row with scatter and line plots */}
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
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
              <Box sx={{ height: "100%", border: "1px solid #eee", borderRadius: 1 }}>
                <LinePlot
                  key={linePlotKey}
                  selectedCompany={companies.selectedValue}
                  selectedCompanyName={
                    companies.values.find(
                      (company) => company.id === companies.selectedValue
                    )?.name || ""
                  }
                  selectedAlgorithm={algorithm.selectedValue}
                />
              </Box>
            </Box>
            
            {/* Bar plot */}
            <Box sx={{ minHeight: "250px", border: "1px solid #eee", borderRadius: 1 }}>
              <BarPlot
                key={`bar-${barPlotKey}-${scatterPlotKey}`}
                selectedCompany={companies.selectedValue}
                selectedCompanyName={
                  companies.values.find(
                    (company) => company.id === companies.selectedValue
                  )?.name || ""
                }
                selectedCategory={categories.selectedValue}
              />
            </Box>
          </Box>
          
          {/* AI Generated content */}
          {additionalInformation && (
            <Box sx={{ mb: 2 }}>
              <AIPromptComponent
                title="AI Generated Qualification List"
                content={additionalInformation}
                inputLabel="Add your qualifications or background information"
                onSubmitPrompt={(qualifications) => {
                  if (companies.selectedValue) {
                    fetchAdditionalInformation(
                      companies.selectedValue,
                      qualifications
                    );
                  }
                }}
              />
            </Box>
          )}
        </Box>
      </Box>
    </Container>
  );
}

export default ConfigurationPanel;

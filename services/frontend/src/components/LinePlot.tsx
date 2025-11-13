import React, { useState, useEffect } from "react";
import { Card, CardContent, Typography } from "@mui/material";
import Plot from "react-plotly.js";

interface LinePlotProps {
  selectedCompany: number;
  selectedCompanyName: string;
  selectedAlgorithm: string;
}

function LinePlot({ selectedCompany, selectedCompanyName, selectedAlgorithm }: LinePlotProps) {
  // Enhanced state to store both actual and predicted values separately
  const [lineData, setLineData] = useState({
    x: [] as number[],
    actual: [] as (number | null)[],
    predicted: [] as (number | null)[],
    hasPredictions: false,
  });

  // Use selectedCompany and selectedAlgorithm in useEffect dependency
  useEffect(() => {
    fetchData();
  }, [selectedCompany, selectedAlgorithm]);

  const fetchData = async () => {
    try {
      // req URL to retrieve single company from backend
      const reqUrl = `http://127.0.0.1:5000/companies/${selectedCompany}?algorithm=${selectedAlgorithm}`;
      console.log("ReqURL " + reqUrl);

      // await response and data
      const response = await fetch(reqUrl);
      const responseData = await response.json();

      // transform data to usable by lineplot
      const xData: number[] = [];
      const actualData: (number | null)[] = [];
      const predictedData: (number | null)[] = [];
      let hasPredictions = false;

      // Determine if we need to separate actual vs predicted values
      const shouldSplitData =
        selectedAlgorithm === "random" || selectedAlgorithm === "regression";

      if (shouldSplitData) {
        // For algorithms with predictions, separate actual vs predicted
        hasPredictions = true;
        const predictionStartYear = 2022;

        responseData.profit.forEach((profit: any) => {
          const year = profit.year;
          xData.push(year);

          console.log("Year " + year + " " + profit.value);

          if (year < predictionStartYear) {
            // Actual values (years before 2021)
            actualData.push(profit.value);
            predictedData.push(null); // No prediction for historical years
          } else {
            // Predicted values (2021 and after)
            predictedData.push(profit.value);
            actualData.push(null); // No actual value for prediction years
          }
        });
      } else {
        responseData.profit.forEach((profit: any) => {
          xData.push(profit.year);
          actualData.push(profit.value);
          predictedData.push(null); // No predictions for 'none' algorithm
        });
      }

      setLineData({
        x: xData,
        actual: actualData,
        predicted: predictedData,
        hasPredictions,
      });
    } catch (error) {
      console.error("Error fetching company profit data:", error);
    }
  };

  // Create traces based on the algorithm selection
  const createTraces = () => {
    const traces = [];

    // Add predicted values trace if we have predictions
    if (lineData.hasPredictions) {
      // Find the index of year 2021 in the x array
      const index2021 = lineData.x.findIndex((year) => year === 2021);

      // Create a combined array for visualization (last actual value + predictions)
      const dataWithPrediction = [...lineData.actual];

      // If we found 2021, use its value as starting point for predictions
      if (index2021 !== -1 && lineData.actual[index2021] !== null) {
        // Copy predictions starting after 2021
        for (let i = 0; i < lineData.predicted.length; i++) {
          if (lineData.predicted[i] !== null) {
            dataWithPrediction[i] = lineData.predicted[i];
          }
        }
      }

      traces.push({
        x: lineData.x,
        y: dataWithPrediction,
        mode: "lines+markers" as const,
        type: "scatter" as const,
        name: "Predicted Profit",
        line: {
          color: "#DB4437", // Red for predicted values
          width: 3,
          dash: "dash", // Add dashed style for predictions
        },
        marker: {
          size: 8,
          color: "#DB4437",
          symbol: "diamond", // Different symbol for predictions
        },
      });
    }

    // Create the actual values trace
    traces.push({
      x: lineData.x,
      y: lineData.actual,
      mode: "lines+markers" as const,
      type: "scatter" as const,
      name: "Actual Profit",
      line: {
        color: "#4285F4", // Blue for actual values
        width: 3,
      },
      marker: {
        size: 8,
        color: "#4285F4",
        symbol: "circle",
      },
    });

    return traces;
  };

  const data = createTraces();

  const layout = {
    title: {
      text: `Profit View of ${selectedCompanyName}`,
      font: {
        size: 18,
      },
    },
    height: window.innerHeight * 0.9,
    xaxis: {
      title: {
        text: "Year",
        font: { size: 14 },
        standoff: 15, // Add some padding
      },
    },
    yaxis: {
      title: {
        text: "Profit",
        font: { size: 14 },
        standoff: 15, // Add some padding
      },
    },
    margin: { l: 60, r: 30, t: 80, b: 60 }, // Add margins for labels
  };

  const config = {
    responsive: true,
    displayModeBar: false,
  };

  return (
    <Card>
      <CardContent sx={{ p: 1 }}>
        <Plot
          data={data as any}
          layout={layout as any}
          config={config}
          style={{ width: "100%", height: "90vh" }}
          useResizeHandler={true}
        />
      </CardContent>
    </Card>
  );
}

export default LinePlot;

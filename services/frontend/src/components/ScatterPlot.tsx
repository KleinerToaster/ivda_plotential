import React, { useState, useEffect } from 'react';
import { Card, CardContent, Typography } from '@mui/material';
import Plot from 'react-plotly.js';

interface ScatterPlotProps {
  selectedCategory: string;
  onCompanyChange?: (companyId: number) => void;
}

// Define consistent colors for categories
const categoryColors = {
  tech: '#4285F4', // Google Blue
  health: '#0F9D58', // Google Green
  bank: '#F4B400', // Google Yellow
  default: '#DB4437' // Google Red
};

function ScatterPlot({ selectedCategory, onCompanyChange }: ScatterPlotProps) {
  const [scatterPlotKey, setScatterPlotKey] = useState(0);
  const [scatterData, setScatterData] = useState({
    x: [] as number[],
    y: [] as number[],
    name: [] as string[],
    category: [] as string[], // Add category information
    rawData: [] as any[] // Store the raw company data
  });
  
  // State to track selected company index
  const [selectedCompanyIndex, setSelectedCompanyIndex] = useState<number | null>(null);

  useEffect(() => {
    fetchData();
  }, [selectedCategory]); // Re-fetch when category changes

  const fetchData = async () => {
    try {
      // Retrieve companies from backend (ISIN-based data)
      const reqUrl = `http://127.0.0.1:5000/companies_isin`;
      console.log("ReqURL " + reqUrl);

      // await response and data
      const response = await fetch(reqUrl);
      const responseData = await response.json();

      // transform data to usable by scatterplot
      const xData: number[] = [];
      const yData: number[] = [];
      const nameData: string[] = [];
      const categoryData: string[] = [];

      responseData.forEach((company: any) => {
        nameData.push(company.name);
        // X-axis: market cap, Y-axis: stocks owned
        xData.push(company.mkt_cap);
        yData.push(company.stocks_owned);
        // No explicit categories in ISIN data; use a default category
        categoryData.push('default');
      });

      setScatterData({
        x: xData,
        y: yData,
        name: nameData,
        category: categoryData,
        rawData: responseData
      });
    } catch (error) {
      console.error('Error fetching company data:', error);
    }
  };

  const createTraces = () => {
    // Determine indices for portfolio vs non-portfolio companies
    const portfolioIndices = scatterData.rawData
      .map((company, i) => ((company.stocks_owned ?? 0) > 0 ? i : -1))
      .filter((i) => i !== -1);

    const otherIndices = scatterData.rawData
      .map((company, i) => ((company.stocks_owned ?? 0) > 0 ? -1 : i))
      .filter((i) => i !== -1);

    const buildTrace = (indices: number[], name: string, baseColor: string) => {
      if (indices.length === 0) return null;

      const xValues = indices.map((i) => scatterData.x[i]);
      const yValues = indices.map((i) => scatterData.y[i]);
      const textValues = indices.map((i) => scatterData.name[i]);
      const colors = indices.map((i) =>
        i === selectedCompanyIndex ? '#800080' : baseColor
      );

      return {
        x: xValues,
        y: yValues,
        mode: 'markers' as const,
        type: 'scatter' as const,
        text: textValues,
        hoverinfo: 'text' as const,
        name,
        marker: {
          color: colors,
          size: 12,
        },
      };
    };

    const traces: any[] = [];

    if (selectedCategory.toLowerCase() === 'portfolio') {
      const portfolioTrace = buildTrace(portfolioIndices, 'Portfolio', '#0F9D58');
      if (portfolioTrace) traces.push(portfolioTrace);
    } else {
      const allTrace = buildTrace(otherIndices, 'All', '#DB4437');
      const portfolioTrace = buildTrace(portfolioIndices, 'Portfolio', '#0F9D58');
      if (allTrace) traces.push(allTrace);
      if (portfolioTrace) traces.push(portfolioTrace);
    }

    return traces;
  };
  
  // filter ability
  const data = createTraces();
  // const data = [
  //   {
  //     x: scatterData.x,
  //     y: scatterData.y,
  //     mode: 'markers' as const,
  //     type: 'scatter' as const,
  //     text: scatterData.name,
  //     hoverinfo: 'text' as const,
  //     name: 'Companies',
  //     marker: {
  //       color: markerColors,
  //       size: 12
  //     }      
  //   }
  // ];

  const layout = {
    title: {
      text: `Market Cap vs Stocks Owned`,
      font: {
        size: 18,
      },
    },
    height: window.innerHeight * 0.85, // Slightly reduce height to make room for title
    xaxis: { 
      title: {
        text: 'Market Cap (EUR)',
        font: { size: 14 },
        standoff: 15  // Add some padding
      }
    },
    yaxis: { 
      title: {
        text: 'Stocks Owned',
        font: { size: 14 },
        standoff: 15  // Add some padding
      }
    },
    margin: { l: 60, r: 30, t: 80, b: 60 }, // Add margins for labels
    showlegend: true
  };

  const config = {
    responsive: true,
    displayModeBar: false
  };

  return (
    <Card>
      <CardContent sx={{ p: 1 }}>
        <Plot
          data={data as any}
          layout={layout as any}
          config={config}
          style={{ width: '100%', height: '90vh' }}
          useResizeHandler={true}
          onClick={(plotData) => {
            if (onCompanyChange && plotData.points && plotData.points.length > 0) {
              const clickedPoint = plotData.points[0];
              
              // Get the company name from the text property of the clicked point
              const companyName = clickedPoint.text;
              console.log(`Clicked on company: ${companyName}`);
              
              // In 'All' category mode, we need to handle multiple traces
              if (selectedCategory === 'All') {
                // curveNumber tells us which trace was clicked
                const curveNumber = clickedPoint.curveNumber;
                const pointIndex = clickedPoint.pointNumber;
                
                // Find the corresponding category for this trace
                const categories = ['tech', 'health', 'bank'];
                const categoryForTrace = categories[curveNumber] || 'default';
                console.log(`Category: ${categoryForTrace}, Trace: ${curveNumber}, PointIndex: ${pointIndex}`);
                
                // Find all companies in this category
                const companiesInCategory = scatterData.rawData.filter(
                  company => company.category === categoryForTrace
                );
                
                // Get the specific company that was clicked
                if (companiesInCategory && companiesInCategory[pointIndex]) {
                  const companyData = companiesInCategory[pointIndex];
                  console.log(`Found company in category data:`, companyData);
                  
                  // Find this company in the original raw data to get its index
                  const globalIndex = scatterData.rawData.findIndex(
                    c => c.id === companyData.id
                  );
                  
                  if (globalIndex !== -1) {
                    setSelectedCompanyIndex(globalIndex);
                  }
                  
                  // Call the change handler with the company ID
                  onCompanyChange(companyData.id);
                  return;
                }
              }
              
              // For single category mode or fallback
              // Find the company by name in raw data
              const companyData = scatterData.rawData.find(c => c.name === companyName);
              
              if (companyData) {
                // Find the index of this company in the raw data array
                const index = scatterData.rawData.indexOf(companyData);
                setSelectedCompanyIndex(index);
                
                // Call the change handler with the company ID
                onCompanyChange(companyData.id);
              } else {
                // If we couldn't find by name, use the point index as before
                const pointIndex = clickedPoint.pointNumber;
                
                // Update the selected company index
                setSelectedCompanyIndex(pointIndex);
                
                // Get the actual company ID from the stored raw data
                const pointData = scatterData.rawData[pointIndex];
                if (pointData && pointData.id) {
                  onCompanyChange(pointData.id);
                } else {
                  // Fallback to 1-indexed position if ID not available
                  console.warn('Could not find company data, using index as fallback');
                  onCompanyChange(pointIndex + 1);
                }
              }
            }
          }}
        />
      </CardContent>
    </Card>
  );
}

export default ScatterPlot;
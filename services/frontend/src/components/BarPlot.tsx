import React, { useState, useEffect } from 'react';
import { Card, CardContent, CircularProgress, Box } from '@mui/material';
import Plot from 'react-plotly.js';

interface BarPlotProps {
  selectedCompany: number;
  selectedCompanyName: string;
  selectedCategory: string;
}

// Define consistent colors for categories (same as in ScatterPlot)
const categoryColors = {
  tech: '#4285F4', // Blue
  health: '#0F9D58', // Green
  bank: '#F4B400', // Yellow
  default: '#DB4437' // Red
};

function BarPlot({ selectedCompany, selectedCompanyName, selectedCategory }: BarPlotProps) {
  const [plotData, setPlotData] = useState({
    companies: [] as string[],
    employees: [] as number[],
    categories: [] as string[],
    selectedCompanyIndex: -1,
  });
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchCompaniesData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCompany, selectedCategory]);

  const fetchCompaniesData = async () => {
    setLoading(true);
    setError('');
    try {
      // First get the selected company to determine its category
      console.log(`Fetching details for company ID: ${selectedCompany}`);
      const companyResponse = await fetch(`http://127.0.0.1:5000/companies/${selectedCompany}`);
      const companyData = await companyResponse.json();
      
      if (!companyData) {
        throw new Error('Could not fetch selected company data');
      }
      
      // Get the category of the selected company
      const categoryToFetch = companyData.category || 'default';
      console.log(`Selected company category: ${categoryToFetch}`);
      
      // Now fetch all companies in the same category
      const reqUrl = `http://127.0.0.1:5000/companies?category=${categoryToFetch}`;
      console.log(`Fetching all companies with category: ${reqUrl}`);
      const response = await fetch(reqUrl);
      const companiesData = await response.json();
      console.log(`Received ${companiesData.length} companies in category ${categoryToFetch}`);

      if (!companiesData || companiesData.length === 0) {
        throw new Error(`No companies found in category: ${categoryToFetch}`);
      }

      // Transform data for bar chart
      const companyNames: string[] = [];
      const employeeCounts: number[] = [];
      const categories: string[] = [];
      let selectedIndex = -1;

      companiesData.forEach((company: any, index: number) => {
        companyNames.push(company.name);
        employeeCounts.push(company.employees);
        categories.push(company.category || 'default');
        
        if (company.id === selectedCompany) {
          selectedIndex = index;
          console.log(`Found selected company at index ${index}: ${company.name}`);
        }
      });

      setPlotData({
        companies: companyNames,
        employees: employeeCounts,
        categories: categories,
        selectedCompanyIndex: selectedIndex
      });
      setLoading(false);
    } catch (error) {
      console.error('Error fetching companies data for bar chart:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch company data');
      setLoading(false);
    }
  };

  // Calculate average employees for the category
  const calculateAverage = () => {
    if (plotData.employees.length === 0) return 0;
    const sum = plotData.employees.reduce((acc, val) => acc + val, 0);
    return sum / plotData.employees.length;
  };

  const average = calculateAverage();
  
  // Get the employee count of the selected company
  const selectedCompanyEmployees = plotData.selectedCompanyIndex >= 0 ? 
    plotData.employees[plotData.selectedCompanyIndex] : 0;

  // Create bar colors - highlight the selected company
  const getBarColors = () => {
    const category = plotData.categories[0] || 'default';
    const categoryColor = categoryColors[category as keyof typeof categoryColors] || categoryColors.default;
    
    return plotData.companies.map((_, index) => 
      index === plotData.selectedCompanyIndex ? '#800080' : categoryColor
    );
  };

  // Create traces for the plot
  const createTraces = () => {
    if (plotData.companies.length === 0) {
      return [];
    }
    
    const barColors = getBarColors();
    
    // Company employees bars
    const companiesTrace = {
      x: plotData.companies,
      y: plotData.employees,
      type: 'bar' as const,
      name: 'Employees',
      marker: {
        color: barColors
      },
      text: plotData.employees.map(count => count.toString()),
      textposition: 'auto' as const,
    };
    
    // Average line
    const averageLine = {
      x: plotData.companies,
      y: Array(plotData.companies.length).fill(average),
      type: 'scatter' as const,
      mode: 'lines' as const,
      name: 'Category Average',
      line: {
        color: '#DB4437',
        width: 2,
        dash: 'dash'
      }
    };
    
    return [companiesTrace, averageLine];
  };

  const data = createTraces();

  // Get the category name for display
  const displayCategory = selectedCategory !== 'All' ? selectedCategory : 
    (plotData.categories[0] || 'Unknown');
  
  // Get the selected company name for display
  const companyForDisplay = selectedCompanyName || 'Selected Company';
  
  const layout = {
    title: `Employee Count: ${selectedCompanyName} vs Other ${selectedCategory} Companies`,
    autosize: true,
    margin: { l: 60, r: 30, t: 60, b: 100 }, // Extra bottom margin for company names
    bargap: 0.3,
    barmode: 'group' as const,
    xaxis: {
      title: {
        text: '',
        font: { size: 14 },
        standoff: 10
      },
      tickangle: -45,
    },
    yaxis: {
      title: {
        text: 'Number of Employees',
        font: { size: 14 },
        standoff: 10
      },
      gridwidth: 1,
    },
    annotations: selectedCompanyEmployees ? [
      // Add annotation for the selected company
      {
        x: selectedCompanyName,
        y: selectedCompanyEmployees,
        xref: 'x' as const,
        yref: 'y' as const,
        text: `${selectedCompanyEmployees}`,
        showarrow: true,
        arrowhead: 7,
        ax: 0,
        ay: -40
      },
      // Add annotation for the average
      {
        x: plotData.companies[Math.floor(plotData.companies.length / 2)],
        y: average,
        xref: 'x' as const,
        yref: 'y' as const,
        text: `Avg: ${Math.round(average)}`,
        showarrow: true,
        arrowhead: 7,
        ax: 0,
        ay: -20
      }
    ] : []
  };

  const config = {
    responsive: true,
    displayModeBar: false
  };

  if (loading) {
    return (
      <Card>
        <CardContent sx={{ p: 4, display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px' }}>
          <CircularProgress />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent sx={{ p: 4, display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px' }}>
          <Box component="span" sx={{ color: 'error.main' }}>
            Error loading chart: {error}
          </Box>
        </CardContent>
      </Card>
    );
  }
  
  if (plotData.companies.length === 0) {
    return (
      <Card>
        <CardContent sx={{ p: 4, display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px' }}>
          No company data available to display
        </CardContent>
      </Card>
    );
  }

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent sx={{ p: 1, height: '100%' }}>
        <Plot
          data={data as any}
          layout={layout as any}
          config={config}
          style={{ width: '100%', height: '100%' }}
          useResizeHandler={true}
        />
      </CardContent>
    </Card>
  );
}

export default BarPlot;

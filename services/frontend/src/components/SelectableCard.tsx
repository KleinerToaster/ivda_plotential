import React from 'react';
import { Card, CardContent, Typography, Select, MenuItem, SelectChangeEvent } from '@mui/material';

interface SelectableCardProps<T> {
  title: string;
  value: T;
  options: { label: string; value: T }[];
  onChange: (value: T) => void;
  displayValue?: string;
  showValueDisplay?: boolean;
}

function SelectableCard<T extends string | number>({
  title,
  value,
  options,
  onChange,
  displayValue,
  showValueDisplay = true
}: SelectableCardProps<T>) {
  
  const handleChange = (event: SelectChangeEvent) => {
    // Handle type conversion for number values
    const newValue = typeof value === 'number' 
      ? Number(event.target.value) as T
      : event.target.value as T;
    
    onChange(newValue);
  };

  return (
    <Card sx={{ 
      overflow: 'hidden', 
      borderRadius: 2,
      boxShadow: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)',
      backgroundColor: '#ffffff'
    }}>
      <CardContent sx={{ p: '16px 20px' }}>
        <Typography 
          sx={{ 
            fontSize: '14px',
            fontWeight: 500,
            color: '#6b7280',
            mb: 1
          }}
        >
          {title}
        </Typography>
        
        {showValueDisplay && displayValue && (
          <Typography 
            sx={{ 
              fontSize: '24px',
              fontWeight: 600,
              color: '#111827',
              mb: 2,
              textTransform: typeof value === 'string' ? 'capitalize' : 'none'
            }}
          >
            {displayValue}
          </Typography>
        )}
        
        <Select
          fullWidth
          value={value.toString()}
          onChange={handleChange}
          size="small"
          sx={{ 
            mt: showValueDisplay ? 0 : 1,
            '.MuiOutlinedInput-notchedOutline': {
              borderColor: '#e5e7eb'
            },
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: '#d1d5db'
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: '#6366f1'
            }
          }}
        >
          {options.map((option) => (
            <MenuItem key={option.value.toString()} value={option.value.toString()}>
              {option.label}
            </MenuItem>
          ))}
        </Select>
      </CardContent>
    </Card>
  );
}

export default SelectableCard;
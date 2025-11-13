import { AppBar, Toolbar, Typography, Box } from '@mui/material';
import ConfigurationPanel from './components/ConfigurationPanel';
import './App.css';

function App() {
  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static" color="primary">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Frederik Bomheuer 25-720-533
          </Typography>
        </Toolbar>
      </AppBar>
      <ConfigurationPanel />
    </Box>
  );
}

export default App;
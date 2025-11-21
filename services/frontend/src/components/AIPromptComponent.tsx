import { useState } from "react";
import { Box, CardContent, Card, Typography, TextField, Button, Collapse, IconButton } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

interface AIPromptComponentProps {
  title: string;
  content: string;
  inputLabel?: string;
  onSubmitPrompt?: (promptText: string) => void;
  open: boolean;
  onClose?: () => void;
}

export const AIPromptComponent = ({
  title,
  content,
  inputLabel = "Add more context (keywords, preferences, etc.)",
  onSubmitPrompt,
  open,
  onClose,
}: AIPromptComponentProps) => {
  const [expanded, setExpanded] = useState(false);
  const [promptText, setPromptText] = useState("");

  if (!open) {
    return null;
  }

  return (
    <Box
      sx={{
        position: "fixed",
        inset: 0,
        zIndex: 1300,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "rgba(0,0,0,0.4)",
        px: 2,
      }}
    >
      <Card
        sx={{
          borderRadius: "8px",
          boxShadow: "0 4px 6px rgba(0,0,0,0.2)",
          background: "#fafafa",
          maxWidth: 700,
          width: "100%",
          maxHeight: "80vh",
          overflowY: "auto",
        }}
      >
        <CardContent>
          <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
            <Typography
              variant="h6"
              sx={{
                fontFamily: '"Open Sans", verdana, arial, sans-serif',
                fontSize: "18px",
                fontWeight: 600,
                color: "#333",
              }}
            >
              {title}
            </Typography>
            <IconButton
              size="small"
              color="primary"
              onClick={() => onClose && onClose()}
              aria-label="Close AI prompt overlay"
              title="Close AI prompt overlay"
            >
              <CloseIcon />
            </IconButton>
          </Box>
        
        {/* Collapsible prompt input area */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <IconButton 
            onClick={() => setExpanded(!expanded)} 
            sx={{ 
              transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.3s'
            }}
            size="small"
          >
            ▼
          </IconButton>
          <Typography variant="body2" color="text.secondary">
            {expanded ? "Hide prompt options" : "Customize prompt"}
          </Typography>
        </Box>
        
        <Collapse in={expanded}>
          <Box sx={{ mb: 2, display: 'flex', alignItems: 'flex-end' }}>
            <TextField
              fullWidth
              label={inputLabel}
              variant="outlined"
              size="small"
              multiline
              rows={2}
              value={promptText}
              onChange={(e) => setPromptText(e.target.value)}
              sx={{
                '& .MuiOutlinedInput-root': {
                  '& fieldset': {
                    borderColor: '#e0e0e0',
                  },
                  '&:hover fieldset': {
                    borderColor: '#1976d2',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: '#1976d2',
                  },
                },
              }}
            />
            <Button
              variant="contained"
              color="primary"
              onClick={() => onSubmitPrompt && onSubmitPrompt(promptText)}
              sx={{ ml: 1, minWidth: 100, height: 40 }}
              disabled={!promptText.trim() || !onSubmitPrompt}
            >
              Submit
            </Button>
          </Box>
        </Collapse>
        <Typography
          variant="body1"
          sx={{
            whiteSpace: "pre-line",
            fontSize: "15px",
            fontFamily: '"Georgia", serif',
            lineHeight: 1.8,
            p: 1,
          }}
        >
          {content}
        </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};

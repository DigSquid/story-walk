# Story Walk - AI Coding Agent Instructions

## Project Overview
Story Walk is a location-based storytelling web app that generates narrative segments as users move through the real world. The app uses What3Words to map GPS coordinates to three-word addresses, then uses AI (Claude) to weave those words into a continuous story.

**Architecture**: Serverless JAMstack app deployed on Netlify
- **Frontend**: Single-page vanilla HTML/CSS/JavaScript (`public/index.html`)
- **Backend**: Netlify Function (`netlify/functions/generateStory.js`)
- **External APIs**: What3Words (geolocation), Anthropic Claude (story generation)

## Key Technical Patterns

### Serverless Function Architecture
- Netlify Functions are Node.js modules in `netlify/functions/`
- Export a `handler` function: `exports.handler = async (event, context) => {}`
- CORS headers are manually configured in every response (see `generateStory.js` lines 3-7)
- Function URL is `/.netlify/functions/[filename]` (automatically handled by Netlify)

### State Management
The app maintains story continuity through client-side state:
- `currentWords`: Last What3Words address (prevents duplicate segments)
- `storyContext`: Accumulated story text sent to AI for context
- `isFirstSegment`: Flag to differentiate opening vs. continuation prompts

**Critical**: AI prompts differ based on whether it's the first segment or a continuation (see `generateStory.js` lines 53-55)

### Geolocation Flow
Uses `navigator.geolocation.watchPosition()` for continuous location updates:
1. Frontend watches position with high accuracy enabled
2. On location change, posts `{latitude, longitude, previousWords, storyContext}` to function
3. Function converts coords → What3Words → Claude story segment
4. Frontend appends new paragraph only if What3Words address changed

## Environment Variables
Required in Netlify dashboard (not in repo):
- `WHAT3WORDS_API_KEY`: API key from what3words.com
- `ANTHROPIC_API_KEY`: Claude API key from console.anthropic.com

**Important**: Never commit API keys. They're accessed via `process.env` in serverless functions.

## Development Workflow

### Local Testing
```powershell
# Install Netlify CLI globally (first time only)
npm install -g netlify-cli

# Run local dev server with Functions support
netlify dev
```
This serves the site at `http://localhost:8888` with Functions at `/.netlify/functions/`

### Deployment
```powershell
# Deploy to Netlify (automatic on git push if connected)
netlify deploy --prod
```
Or push to `main` branch for automatic deployment via Netlify Git integration.

## Code Conventions

### No Build Step
This is a vanilla JavaScript project with zero dependencies or build tools. All code runs directly in the browser or Node.js runtime.

### API Response Structure
Netlify Functions return objects with `statusCode`, `headers`, `body`:
```javascript
return {
  statusCode: 200,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ data })
};
```

### Error Handling Pattern
Both frontend and backend follow this pattern:
1. Wrap async operations in try/catch
2. Display user-friendly error messages (see `showError()` function)
3. Log technical details to console
4. Return 500 status with error message in function

## Critical Integration Points

### What3Words API
- Endpoint: `https://api.what3words.com/v3/convert-to-3wa`
- Query params: `coordinates={lat},{lng}&key={apiKey}`
- Returns `{words: "word1.word2.word3"}` format
- **Location cell granularity**: 3m x 3m squares

### Anthropic Claude API
- Model: `claude-sonnet-4-20250514` (specified in `generateStory.js` line 63)
- API version: `2023-06-01` (header requirement)
- Max tokens: 200 (tuned for 2-3 sentence responses)
- Prompt engineering: Uses previous story context for continuity

## Common Modifications

### Changing Story Length
Adjust `max_tokens` in `generateStory.js` (line 64) and update prompt instructions (lines 53-55)

### Styling Updates
All CSS is in `<style>` tag of `index.html`. Uses CSS custom properties for gradient: `#667eea` and `#764ba2`

### Location Update Sensitivity
Modify `navigator.geolocation.watchPosition()` options (lines 173-177) to adjust GPS accuracy vs. battery tradeoff

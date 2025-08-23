# MedGuard AI MCP Server Setup for Claude Desktop

This document explains how to configure Claude Desktop to use the MedGuard AI MCP server for drug interaction checking and normalization.

## What is the MCP Server?

The MedGuard AI MCP (Model Context Protocol) server provides standardized access to:
- **Drug Normalization**: Using RxNorm API to standardize drug names
- **Drug Interaction Checking**: Using FDA OpenFDA database for adverse event analysis
- **Batch Processing**: Normalize multiple drugs simultaneously
- **Comprehensive Drug Information**: Get detailed drug data from RxNorm
- **Smart Caching**: Reduces API calls and improves performance

## Prerequisites

1. **Claude Desktop**: Make sure you have Claude Desktop installed
2. **Node.js**: Ensure Node.js is installed on your system
3. **MedGuard AI Dependencies**: The MCP server dependencies should be installed

## Setup Instructions

### Step 1: Install MCP Server Dependencies

```bash
cd /Users/bivasb/Documents/medguard-ai
npm install
```

### Step 2: Configure Claude Desktop

1. **Locate Claude Desktop Config Directory**:
   - **macOS**: `~/Library/Application Support/Claude/`
   - **Windows**: `%APPDATA%\Claude\`
   - **Linux**: `~/.config/Claude/`

2. **Copy the Configuration File**:
   Copy the `claude_desktop_config.json` from this project to your Claude Desktop config directory:

   ```bash
   # For macOS
   cp /Users/bivasb/Documents/medguard-ai/claude_desktop_config.json ~/Library/Application\ Support/Claude/claude_desktop_config.json
   ```

   Or manually copy the following configuration to your Claude Desktop config file:

   ```json
   {
     "mcpServers": {
       "medguard-ai": {
         "command": "node",
         "args": [
           "/Users/bivasb/Documents/medguard-ai/src/mcp/server.js",
           "--stdio"
         ],
         "env": {
           "NODE_ENV": "production"
         }
       }
     }
   }
   ```

### Step 3: Test the MCP Server

Before using with Claude Desktop, test the server standalone:

```bash
cd /Users/bivasb/Documents/medguard-ai
node src/mcp/server.js --stdio
```

You can also test the HTTP interface:

```bash
# Start HTTP server (runs on port 3001 by default)
node src/mcp/server.js

# Test health endpoint
curl http://localhost:3001/health
```

### Step 4: Restart Claude Desktop

After configuring the MCP server, restart Claude Desktop completely:

1. Quit Claude Desktop
2. Relaunch Claude Desktop
3. The MCP server should automatically connect

## Available MCP Tools

Once connected, Claude Desktop will have access to these tools:

### 1. `normalize_drug`
Normalize drug names using RxNorm API
```javascript
{
  "drug_name": "tylenol",
  "include_relations": true
}
```

### 2. `check_interaction`
Check drug-drug interactions using FDA data
```javascript
{
  "drug1": {"name": "warfarin", "rxcui": "11289"},
  "drug2": {"name": "aspirin", "rxcui": "1191"}
}
```

### 3. `batch_normalize`
Normalize multiple drugs at once
```javascript
{
  "drug_names": ["warfarin", "aspirin", "metformin"]
}
```

### 4. `get_drug_info`
Get comprehensive drug information
```javascript
{
  "rxcui": "11289"
}
```

## Available MCP Resources

### 1. `medguard://cache/drugs`
Access cached drug normalization data

### 2. `medguard://cache/interactions`
Access cached interaction data

## Usage in Claude Desktop

Once configured, you can ask Claude Desktop to:

- **"Normalize the drug name 'tylenol' using the MedGuard MCP server"**
- **"Check for interactions between warfarin and aspirin"**
- **"Get comprehensive information about RxCUI 11289"**
- **"Batch normalize these drugs: warfarin, aspirin, metformin"**

## Troubleshooting

### MCP Server Not Connecting

1. **Check Node.js Installation**:
   ```bash
   node --version
   npm --version
   ```

2. **Check File Permissions**:
   ```bash
   ls -la /Users/bivasb/Documents/medguard-ai/src/mcp/server.js
   ```

3. **Test Server Manually**:
   ```bash
   cd /Users/bivasb/Documents/medguard-ai
   node src/mcp/server.js --stdio
   ```

4. **Check Dependencies**:
   ```bash
   cd /Users/bivasb/Documents/medguard-ai
   npm install
   ```

### Claude Desktop Not Recognizing Tools

1. **Verify Configuration Path**: Make sure the config file is in the correct Claude Desktop directory
2. **Check JSON Syntax**: Validate that your `claude_desktop_config.json` has valid JSON syntax
3. **Restart Claude Desktop**: Completely quit and relaunch Claude Desktop

### Rate Limiting Issues

The MCP server includes built-in rate limiting:
- **RxNorm**: 100 requests per minute
- **FDA OpenFDA**: 240 requests per minute

If you hit rate limits, the server will automatically wait and retry.

### Cache Management

The server includes intelligent caching:
- **Cache Duration**: 24 hours
- **Cache Size Limit**: 1000 entries (auto-cleanup)
- **Cache Stats**: Available via `/api/cache-stats` endpoint

## API Endpoints (HTTP Interface)

If you prefer direct HTTP access:

- **Health Check**: `GET /health`
- **Normalize Drug**: `POST /api/normalize`
- **Check Interaction**: `POST /api/interaction`
- **Batch Normalize**: `POST /api/batch-normalize`
- **Cache Stats**: `GET /api/cache-stats`
- **Clear Cache**: `POST /api/cache-clear`

## Security Notes

- The MCP server only makes outbound requests to official FDA and NIH APIs
- No sensitive data is stored permanently
- Cache entries expire after 24 hours
- All API calls are rate-limited to respect external service limits

## Support

For issues with the MedGuard AI MCP server:

1. Check the console output when starting Claude Desktop
2. Test the server independently using the troubleshooting steps
3. Review the server logs for error messages

The MCP server provides comprehensive drug interaction checking capabilities directly within Claude Desktop, making it a powerful tool for medical professionals and developers working with pharmaceutical data.
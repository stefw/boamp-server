# boamp-server MCP Server

Un serveur MCP pour interroger l&#39;API BOAMP et récupérer les avis de marchés publics

This is a TypeScript-based MCP server that implements a simple notes system. It demonstrates core MCP concepts by providing:

- Resources representing text notes with URIs and metadata
- Tools for creating new notes
- Prompts for generating summaries of notes

## Features

### Resources
- List and access notes via `note://` URIs
- Each note has a title, content and metadata
- Plain text mime type for simple content access

### Outils

#### get_public_markets
Récupère les avis de marchés publics selon divers critères

**Paramètres:**
- **keywords*** : Liste de mots-clés à rechercher
- **type** : Type de marché (SERVICES, TRAVAUX, FOURNITURES)
- **limit** : Nombre maximum de résultats à retourner
- **sort_by** : Champ de tri (dateparution, datelimitereponse)
- **departments** : Liste des départements (codes)

#### get_market_details
Récupère les détails complets d'un marché spécifique

**Paramètres:**
- **idweb*** : Identifiant du marché


### Exemples
** Recherche les marchés publics contenant les mots-clés "communication" et "digital" **



## Development

Install dependencies:
```bash
npm install
```

Build the server:
```bash
npm run build
```

For development with auto-rebuild:
```bash
npm run watch
```

## Installation

To use with Claude Desktop, add the server config:

On MacOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
On Windows: `%APPDATA%/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "boamp-server": {
      "command": "/path/to/boamp-server/build/index.js"
    }
  }
}
```

### Debugging

Since MCP servers communicate over stdio, debugging can be challenging. We recommend using the [MCP Inspector](https://github.com/modelcontextprotocol/inspector), which is available as a package script:

```bash
npm run inspector
```

The Inspector will provide a URL to access debugging tools in your browser.

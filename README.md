# boamp-server MCP Server

Un serveur MCP (Model Context Protocol) pour interroger l'API BOAMP et récupérer les avis de marchés publics. Ce serveur permet de rechercher des marchés publics en utilisant divers critères et d'obtenir des détails complets sur des marchés spécifiques.



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
**Recherche les marchés publics contenant les mots-clés "communication" et "digital"**
**Recherche les marchés publics contenant les mots-clés "construction d'un hôpital", exporte les résultats dans un CSV**



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

#!/usr/bin/env node

/**
 * Serveur MCP pour interroger l'API BOAMP et récupérer les avis de marchés publics.
 * Ce serveur expose des outils et des ressources pour interagir avec l'API BOAMP.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ErrorCode,
  ListResourcesRequestSchema,
  ListResourceTemplatesRequestSchema,
  ListToolsRequestSchema,
  McpError,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import axios from "axios";

// URL de base de l'API BOAMP
const BOAMP_API_URL = "https://boamp-datadila.opendatasoft.com/api/explore/v2.1/catalog/datasets/boamp/records";

/**
 * Interface pour les résultats de l'API BOAMP
 */
interface BoampResult {
  idweb: string;
  objet: string;
  dateparution: string;
  datelimitereponse: string;
  datefindiffusion: string;
  nomacheteur: string;
  code_departement: string;
  procedure_libelle: string;
  nature_libelle: string;
  type_marche_facette: string;
  descripteur_libelle: string;
  famille_libelle: string;
  donnees: string;
  [key: string]: any;
}

/**
 * Interface pour les paramètres de recherche
 */
interface SearchParams {
  keywords?: string[];
  type?: string;
  limit?: number;
  sort_by?: string;
  departments?: string[];
}

/**
 * Classe principale du serveur BOAMP
 */
class BoampServer {
  private server: Server;
  private axiosInstance;

  constructor() {
    // Initialisation du serveur MCP
    this.server = new Server(
      {
        name: "boamp-server",
        version: "0.1.0",
      },
      {
        capabilities: {
          resources: {},
          tools: {},
        },
      }
    );

    // Initialisation du client HTTP
    this.axiosInstance = axios.create({
      baseURL: BOAMP_API_URL,
    });

    // Configuration des gestionnaires de requêtes
    this.setupResourceHandlers();
    this.setupToolHandlers();
    
    // Gestion des erreurs
    this.server.onerror = (error) => console.error("[MCP Error]", error);
    process.on("SIGINT", async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  /**
   * Configuration des gestionnaires de ressources
   */
  private setupResourceHandlers() {
    // Gestionnaire pour les modèles de ressources
    this.server.setRequestHandler(
      ListResourceTemplatesRequestSchema,
      async () => ({
        resourceTemplates: [
          {
            uriTemplate: "boamp://market/{idweb}",
            name: "Détails d'un marché public",
            mimeType: "application/json",
            description: "Détails complets d'un avis de marché public par son identifiant",
          },
        ],
      })
    );

    // Gestionnaire pour la lecture des ressources
    this.server.setRequestHandler(
      ReadResourceRequestSchema,
      async (request) => {
        const match = request.params.uri.match(/^boamp:\/\/market\/([^/]+)$/);
        if (!match) {
          throw new McpError(
            ErrorCode.InvalidRequest,
            `Format d'URI invalide: ${request.params.uri}`
          );
        }
        
        const idweb = match[1];
        console.error(`[API] Récupération des détails du marché: ${idweb}`);

        try {
          // Requête à l'API BOAMP pour récupérer les détails du marché
          const response = await this.axiosInstance.get("", {
            params: {
              where: `idweb="${idweb}"`,
            },
          });

          if (!response.data.results || response.data.results.length === 0) {
            throw new McpError(
              ErrorCode.InvalidParams,
              `Marché avec l'identifiant ${idweb} non trouvé`
            );
          }

          const marketDetails = response.data.results[0];

          return {
            contents: [
              {
                uri: request.params.uri,
                mimeType: "application/json",
                text: JSON.stringify(marketDetails, null, 2),
              },
            ],
          };
        } catch (error) {
          if (axios.isAxiosError(error)) {
            console.error(`[Error] Erreur API BOAMP: ${error.message}`);
            throw new McpError(
              ErrorCode.InternalError,
              `Erreur API BOAMP: ${error.response?.data?.message || error.message}`
            );
          }
          throw error;
        }
      }
    );
  }

  /**
   * Configuration des gestionnaires d'outils
   */
  private setupToolHandlers() {
    // Gestionnaire pour lister les outils disponibles
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: "get_public_markets",
          description: "Récupère les avis de marchés publics selon divers critères",
          inputSchema: {
            type: "object",
            properties: {
              keywords: {
                type: "array",
                items: {
                  type: "string"
                },
                description: "Liste de mots-clés à rechercher",
              },
              type: {
                type: "string",
                description: "Type de marché (SERVICES, TRAVAUX, FOURNITURES)",
                enum: ["SERVICES", "TRAVAUX", "FOURNITURES"],
              },
              limit: {
                type: "number",
                description: "Nombre maximum de résultats à retourner",
                minimum: 1,
                maximum: 100,
              },
              sort_by: {
                type: "string",
                description: "Champ de tri (dateparution, datelimitereponse)",
                enum: ["dateparution ASC", "dateparution DESC", "datelimitereponse ASC", "datelimitereponse DESC"],
              },
              departments: {
                type: "array",
                items: {
                  type: "string"
                },
                description: "Liste des départements (codes)",
              },
            },
            required: ["keywords"],
          },
        },
        {
          name: "get_market_details",
          description: "Récupère les détails complets d'un marché spécifique",
          inputSchema: {
            type: "object",
            properties: {
              idweb: {
                type: "string",
                description: "Identifiant du marché",
              },
            },
            required: ["idweb"],
          },
        },
      ],
    }));

    // Gestionnaire pour l'exécution des outils
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      switch (request.params.name) {
        case "get_public_markets": {
          console.error(`[API] Recherche de marchés publics`);
          
          const params: SearchParams = {
            keywords: request.params.arguments?.keywords as string[],
            type: request.params.arguments?.type as string,
            limit: request.params.arguments?.limit as number,
            sort_by: request.params.arguments?.sort_by as string,
            departments: request.params.arguments?.departments as string[],
          };

          try {
            const results = await this.searchMarkets(params);
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(results, null, 2),
                },
              ],
            };
          } catch (error) {
            console.error(`[Error] Erreur lors de la recherche: ${error}`);
            return {
              content: [
                {
                  type: "text",
                  text: `Erreur lors de la recherche: ${error}`,
                },
              ],
              isError: true,
            };
          }
        }

        case "get_market_details": {
          const idweb = request.params.arguments?.idweb as string;
          console.error(`[API] Récupération des détails du marché: ${idweb}`);

          try {
            const marketDetails = await this.getMarketDetails(idweb);
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(marketDetails, null, 2),
                },
              ],
            };
          } catch (error) {
            console.error(`[Error] Erreur lors de la récupération des détails: ${error}`);
            return {
              content: [
                {
                  type: "text",
                  text: `Erreur lors de la récupération des détails: ${error}`,
                },
              ],
              isError: true,
            };
          }
        }

        default:
          throw new McpError(
            ErrorCode.MethodNotFound,
            `Outil inconnu: ${request.params.name}`
          );
      }
    });
  }

  /**
   * Recherche des marchés publics selon les critères spécifiés
   */
  private async searchMarkets(params: SearchParams): Promise<BoampResult[]> {
    console.error(`[API] Paramètres de recherche: ${JSON.stringify(params)}`);
    
    // Construction de la requête
    const currentDate = new Date().toISOString().split("T")[0];
    let whereClause = "";

    // Ajout des mots-clés à la requête
    if (params.keywords && params.keywords.length > 0) {
      const keywordConditions = params.keywords.map(keyword => 
        `(objet LIKE '%${keyword}%' OR descripteur_libelle LIKE '%${keyword}%')`
      );
      whereClause = `(${keywordConditions.join(" OR ")})`;
    }

    // Ajout de la condition sur la date limite de réponse
    if (whereClause) {
      whereClause += ` AND datelimitereponse >= date'${currentDate}'`;
    } else {
      whereClause = `datelimitereponse >= date'${currentDate}'`;
    }

    // Paramètres de la requête
    const requestParams: any = {
      where: whereClause,
      limit: params.limit || 20,
    };

    // Ajout du tri
    if (params.sort_by) {
      requestParams.order_by = params.sort_by;
    } else {
      requestParams.order_by = "datelimitereponse ASC";
    }

    // Ajout du type de marché
    if (params.type) {
      requestParams.refine = `type_marche:${params.type}`;
    }

    // Ajout des départements
    if (params.departments && params.departments.length > 0) {
      const deptConditions = params.departments.map(dept => 
        `code_departement="${dept}"`
      );
      if (whereClause) {
        whereClause += ` AND (${deptConditions.join(" OR ")})`;
      } else {
        whereClause = `(${deptConditions.join(" OR ")})`;
      }
      requestParams.where = whereClause;
    }

    try {
      console.error(`[API] Requête: ${JSON.stringify(requestParams)}`);
      const response = await this.axiosInstance.get("", { params: requestParams });
      console.error(`[API] Nombre de résultats: ${response.data.results?.length || 0}`);
      return response.data.results || [];
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error(`[Error] Erreur API BOAMP: ${error.message}`);
        throw new Error(`Erreur API BOAMP: ${error.response?.data?.message || error.message}`);
      }
      throw error;
    }
  }

  /**
   * Récupération des détails d'un marché spécifique
   */
  private async getMarketDetails(idweb: string): Promise<BoampResult> {
    try {
      const response = await this.axiosInstance.get("", {
        params: {
          where: `idweb="${idweb}"`,
        },
      });

      if (!response.data.results || response.data.results.length === 0) {
        throw new Error(`Marché avec l'identifiant ${idweb} non trouvé`);
      }

      return response.data.results[0];
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error(`[Error] Erreur API BOAMP: ${error.message}`);
        throw new Error(`Erreur API BOAMP: ${error.response?.data?.message || error.message}`);
      }
      throw error;
    }
  }

  /**
   * Démarrage du serveur
   */
  async run() {
    console.error("[Setup] Démarrage du serveur BOAMP MCP");
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("[Setup] Serveur BOAMP MCP démarré");
  }
}

// Création et démarrage du serveur
const server = new BoampServer();
server.run().catch(error => {
  console.error("[Error] Erreur fatale:", error);
  process.exit(1);
});

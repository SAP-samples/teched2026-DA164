using { API_PRODUCT_SRV } from './external/API_PRODUCT_SRV';
using { products }         from '../db/schema';

@mcp
@protocol: 'odata'
service ProductService {
  entity Products as projection on products.ProductExtension
    excluding { Embedding };

  action getProducts(top: Integer default 20) returns array of {
    Product:     String;
    ProductType: String;
    BaseUnit:    String;
  };

  action syncProducts()
    returns { synced: Integer };

  action hybridSearch(query: String, top: Integer default 5)
    returns array of Products;

  action askAdvisor(question: String)
    returns { answer: String };
}

annotate ProductService with @mcp.instructions: 'You are a service charge advisor for a logistics company. The service charge data originates from SAP S/4HANA Cloud. Use "describe" first to learn what data and actions are available. Use "query" for structured lookups, e.g. SELECT * FROM Products WHERE ProductType = ''SERV''. Use "hybridSearch" to find service charges using natural language - it combines keyword and semantic search. Use "askAdvisor" for open-ended customer questions that need a full answer. Always include the charge code in your answers. Only recommend service charges that the tools return - never invent charges.';

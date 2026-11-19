import cds from '@sap/cds'
import aiCoreClient from './ai-core-client.js'

const { chatCompletion } = aiCoreClient

const EMBED_MODEL = 'SAP_GXY.20250407'

export default class ProductService extends cds.ApplicationService {

  async init() {
    const s4 = await cds.connect.to('API_PRODUCT_SRV')
    const db = await cds.connect.to('db')

    this.on('getProducts', async (req) => {
      const { top = 20 } = req.data
      return s4.run(
        SELECT.from('API_PRODUCT_SRV.A_Product')
          .columns('Product', 'ProductType', 'BaseUnit', 'CreationDate')
          .limit(top)
      )
    })

    this.on('syncProducts', async (req) => {
      const rawProducts = await s4.run(
        SELECT.from('API_PRODUCT_SRV.A_Product')
          .columns('Product', 'ProductType', 'BaseUnit')
          .limit(50)
      )

      let synced = 0
      for (const p of rawProducts) {
        const [desc] = await s4.run(
          SELECT.from('API_PRODUCT_SRV.A_ProductDescription')
            .columns('ProductDescription')
            .where({ Product: p.Product, Language: 'EN' })
        )

        await UPSERT.into('products.ProductExtension').entries({
          Product:     p.Product,
          ProductType: p.ProductType,
          BaseUnit:    p.BaseUnit,
          Description: desc?.ProductDescription ?? p.Product
        })
        synced++
      }

      return { synced }
    })

    this.on('hybridSearch', async (req) => {
      const { query, top = 5 } = req.data
      const likePattern = `%${query}%`

      const results = await db.run(
        `SELECT TOP ${top}
           PRODUCT, PRODUCTTYPE, DESCRIPTION, BASEUNIT,
           ROUND(
             0.6 * COSINE_SIMILARITY(EMBEDDING, VECTOR_EMBEDDING(?, 'QUERY', '${EMBED_MODEL}'))
             + 0.4 * CASE WHEN LOWER(DESCRIPTION) LIKE LOWER(?) THEN 1.0 ELSE 0.0 END
           , 4) AS HYBRID_SCORE
         FROM PRODUCTS_PRODUCTEXTENSION
         WHERE EMBEDDING IS NOT NULL
         ORDER BY HYBRID_SCORE DESC`,
        [query, likePattern]
      )

      return results.map(r => ({
        Product:     r.PRODUCT,
        ProductType: r.PRODUCTTYPE,
        Description: r.DESCRIPTION,
        BaseUnit:    r.BASEUNIT
      }))
    })

    this.on('askAdvisor', async (req) => {
      const { question } = req.data
      const likePattern = `%${question}%`

      const context = await db.run(
        `SELECT TOP 3
           PRODUCT, DESCRIPTION
         FROM PRODUCTS_PRODUCTEXTENSION
         WHERE EMBEDDING IS NOT NULL
         ORDER BY ROUND(
           0.6 * COSINE_SIMILARITY(EMBEDDING, VECTOR_EMBEDDING(?, 'QUERY', '${EMBED_MODEL}'))
           + 0.4 * CASE WHEN LOWER(DESCRIPTION) LIKE LOWER(?) THEN 1.0 ELSE 0.0 END
         , 4) DESC`,
        [question, likePattern]
      )

      const contextText = context.map(r =>
        `Charge ${r.PRODUCT}: ${r.DESCRIPTION || ''}`
      ).join('\n')

      const answer = await chatCompletion([
        {
          role: 'system',
          content: 'You are a service charge advisor for a logistics company. Answer questions using only the service charge data provided. Always include charge codes in your answers.'
        },
        {
          role: 'user',
          content: `Relevant service charges:\n${contextText}\n\nCustomer question: ${question}`
        }
      ])

      return { answer }
    })

    return super.init()
  }
}

const cds = require('@sap/cds')
const { getEmbedding } = require('../srv/ai-core-client')

async function main() {
  const db = await cds.connect.to('db')

  const products = await db.run(
    SELECT.from('products.ProductExtension')
      .columns('Product', 'Description')
      .where('Embedding is null')
  )

  console.log(`Generating embeddings for ${products.length} products...`)

  for (const p of products) {
    const id   = p.PRODUCT
    const desc = p.DESCRIPTION ?? ''
    const vector = await getEmbedding(`Product: ${id}. ${desc}`)
    const vectorStr = '[' + vector.map(n => n.toFixed(8)).join(',') + ']'
    await db.run(
      `UPDATE PRODUCTS_PRODUCTEXTENSION SET EMBEDDING = TO_REAL_VECTOR('${vectorStr}') WHERE PRODUCT = '${id}'`
    )
    process.stdout.write('.')
  }

  console.log('\nDone.')
}

main().catch(console.error)

export function generateSampleData(type){
  const sampleSizes = { sales: 500, customers: 300, inventory: 200 }
  const size = sampleSizes[type] || 100
  const rawData = []
  if (type === 'sales'){
    const products = ['Laptop','Mouse','Keyboard','Monitor','Tablet','Phone','Headphones']
    const regions = ['North','South','East','West']
    for (let i=0;i<size;i++){
      const price = Math.round((Math.random()*1000+100)*100)/100
      const quantity = Math.floor(Math.random()*50)+1
      rawData.push({
        id: i+1,
        product: products[Math.floor(Math.random()*products.length)],
        quantity, price,
        region: regions[Math.floor(Math.random()*regions.length)],
        date: new Date(2025, Math.floor(Math.random()*12), Math.floor(Math.random()*28)+1).toISOString().split('T')[0],
        revenue: Math.random()<0.15 ? null : Math.round(price*quantity*100)/100,
        customer_id: Math.random()<0.1 ? '' : Math.floor(Math.random()*1000)+1
      })
    }
  } else if (type === 'customers') {
    const segments = ['Enterprise','SMB','Startup']
    for (let i=0;i<size;i++){
      rawData.push({
        customer_id: i+1,
        name: `Customer ${i+1}`,
        segment: segments[Math.floor(Math.random()*segments.length)],
        ltv: Math.round(Math.random()*50000+5000),
        acquisition_cost: Math.random()<0.15 ? null : Math.round(Math.random()*2000+100),
        churn_risk: Math.random()<0.2 ? '' : (Math.random()*0.3).toFixed(2)
      })
    }
  } else {
    const categories = ['Electronics','Office','Accessories']
    for (let i=0;i<size;i++){
      rawData.push({
        sku:`SKU${i+1}`, product_name:`Product ${i+1}`,
        category: categories[Math.floor(Math.random()*categories.length)],
        stock_level: Math.floor(Math.random()*200),
        reorder_point: Math.random()<0.1 ? null : Math.floor(Math.random()*50)+10,
        unit_cost: Math.round(Math.random()*100*100)/100
      })
    }
  }
  return rawData
}

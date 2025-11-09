export function parseCSV(csvText){
  const lines = csvText.split('\n').filter(l => l.trim())
  if (lines.length < 2) throw new Error('CSV needs header + rows')
  const headers = lines[0].split(',').map(s => s.trim())
  const data = []
  for (let i=1;i<lines.length;i++){
    const values = lines[i].split(',')
    if (values.length === headers.length){
      const row = {}
      headers.forEach((h, idx) => row[h] = values[idx]?.trim())
      data.push(row)
    }
  }
  return data
}

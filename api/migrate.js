import pg from 'pg';
const { Client } = pg;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  try {
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();

    await client.query("ALTER TABLE projects ADD COLUMN IF NOT EXISTS goals TEXT[] DEFAULT '{}'");
    await client.query("ALTER TABLE projects ADD COLUMN IF NOT EXISTS features TEXT[] DEFAULT '{}'");
    await client.query("ALTER TABLE projects ADD COLUMN IF NOT EXISTS architecture TEXT");

    await client.end();
    return res.status(200).json({ success: true, message: 'Migration complete' });
  } catch (err) {
    console.error('Migration error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}

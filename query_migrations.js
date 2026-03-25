const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgresql://postgres:postgres@localhost:54322/postgres'
});
async function run() {
  try {
    await client.connect();
    const res = await client.query('SELECT version FROM supabase_migrations.schema_migrations');
    console.log(JSON.stringify(res.rows));
  } catch (e) {
    console.error(e);
  } finally {
    await client.end();
  }
}
run();

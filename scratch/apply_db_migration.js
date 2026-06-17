const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const migrationsDir = path.join(__dirname, '..', 'supabase', 'migrations');
const tempDir = path.join(__dirname, '..', 'supabase', 'migrations_temp');

// リモート適用済みまたは今回適用するファイル名プレフィックス
const allowedPrefixes = [
  '20260107',
  '20260109',
  '20260115',
  '20260201_add_announcement_attachments', // 20260201 の中でこれだけが適用済み
  '20260602',
  '20260603',
  '20260604',
  '20260605120000',
  '20260606000000',
  '20260607'
];

function run() {
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir);
  }

  const files = fs.readdirSync(migrationsDir);
  const movedFiles = [];

  console.log('--- Moving unneeded migrations to temp folder ---');
  files.forEach(file => {
    // 拡張子が .sql 以外のものはスキップ
    if (!file.endsWith('.sql')) return;

    const shouldKeep = allowedPrefixes.some(prefix => file.startsWith(prefix));
    if (!shouldKeep) {
      const src = path.join(migrationsDir, file);
      const dest = path.join(tempDir, file);
      fs.renameSync(src, dest);
      movedFiles.push(file);
      console.log(`Moved to temp: ${file}`);
    }
  });

  try {
    console.log('\n--- Running supabase db push ---');
    execSync('npx supabase db push', { stdio: 'inherit', cwd: path.join(__dirname, '..') });
    console.log('Migration pushed successfully!');
  } catch (error) {
    console.error('Error during db push:', error);
  } finally {
    console.log('\n--- Restoring migrations from temp folder ---');
    movedFiles.forEach(file => {
      const src = path.join(tempDir, file);
      const dest = path.join(migrationsDir, file);
      if (fs.existsSync(src)) {
        fs.renameSync(src, dest);
        console.log(`Restored: ${file}`);
      }
    });
    
    // 一時フォルダの削除を試みる
    try {
      fs.rmdirSync(tempDir);
    } catch (e) {
      // フォルダが空でない場合は無視
    }
  }
}

run();

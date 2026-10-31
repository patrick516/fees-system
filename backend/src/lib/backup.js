const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");
const util = require("util");
const execPromise = util.promisify(exec);

const BACKUP_DIR = path.join(__dirname, "../../backups");

if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

const backupDatabase = async () => {
  try {
    console.log(
      `[backup] Starting database backup at ${new Date().toISOString()}`,
    );

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `schoolpay_backup_${timestamp}.sql`;
    const filepath = path.join(BACKUP_DIR, filename);

    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) throw new Error("DATABASE_URL is not set.");

    const cmd = `pg_dump -Fc -d "${dbUrl}" -f "${filepath}"`;
    await execPromise(cmd);

    console.log(`[backup] Success: ${filename}`);

    const files = fs.readdirSync(BACKUP_DIR);
    const now = Date.now();
    const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

    files.forEach((file) => {
      const filePath = path.join(BACKUP_DIR, file);
      const stats = fs.statSync(filePath);
      if (now - stats.mtimeMs > SEVEN_DAYS_MS) {
        fs.unlinkSync(filePath);
        console.log(`[backup] 🗑️ Deleted old backup: ${file}`);
      }
    });
  } catch (err) {
    console.error("[backup] ❌ Failed:", err.message);
  }
};

module.exports = { backupDatabase };

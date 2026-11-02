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

    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) throw new Error("DATABASE_URL is not set.");

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `schoolpay_backup_${timestamp}.sql`;
    const filepath = path.join(BACKUP_DIR, filename);

    // Write to a temp file first — if pg_dump fails, existing backups stay intact
    const tmpFile = `${filepath}.tmp`;
    const cleanDbUrl = dbUrl.split("?")[0];
    const cmd = `pg_dump -Fc -d "${cleanDbUrl}" -f "${tmpFile}"`;
    await execPromise(cmd);

    // Verify the file has content (reject partial dumps)
    const stats = fs.statSync(tmpFile);
    if (stats.size < 1000) {
      fs.unlinkSync(tmpFile);
      throw new Error(`Backup too small: ${stats.size} bytes`);
    }

    // Move valid file into place
    fs.renameSync(tmpFile, filepath);
    console.log(
      `[backup] ✅ Success: ${filename} (${(stats.size / 1024).toFixed(0)} KB)`,
    );

    //  Delete stale .tmp files (leftover from failed dumps)
    fs.readdirSync(BACKUP_DIR)
      .filter((f) => f.endsWith(".tmp"))
      .forEach((f) => {
        fs.unlinkSync(path.join(BACKUP_DIR, f));
        console.log(`[backup] 🗑️ Deleted stale temp file: ${f}`);
      });

    //  Keep only the 2 most recent .sql backups
    const files = fs
      .readdirSync(BACKUP_DIR)
      .filter((f) => f.endsWith(".sql"))
      .map((f) => ({
        name: f,
        mtime: fs.statSync(path.join(BACKUP_DIR, f)).mtimeMs,
      }))
      .sort((a, b) => b.mtime - a.mtime);

    files.slice(2).forEach((f) => {
      fs.unlinkSync(path.join(BACKUP_DIR, f.name));
      console.log(`[backup] 🗑️ Deleted old backup: ${f.name}`);
    });
  } catch (err) {
    console.error("[backup]  Failed:", err.message);
    // Clean up temp file if the dump failed mid-write
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const tmp = path.join(
        BACKUP_DIR,
        `schoolpay_backup_${timestamp}.sql.tmp`,
      );
      if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
    } catch {}
  }
};

module.exports = { backupDatabase };

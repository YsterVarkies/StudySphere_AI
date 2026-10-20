const db = require('../config/db');

async function inspectSchema() {
  const [[database]] = await db.query('SELECT DATABASE() AS selected_database');
  const [[table]] = await db.query(
    `SELECT TABLE_NAME
     FROM INFORMATION_SCHEMA.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'AI_CHAT_USAGE'`
  );

  if (!table) {
    return {
      connectedDatabaseMatches: database.selected_database === process.env.DB_NAME,
      tableExists: false,
    };
  }

  const [columns] = await db.query(
    `SELECT DATA_TYPE, CHARACTER_MAXIMUM_LENGTH, IS_NULLABLE
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'AI_CHAT_USAGE'
       AND COLUMN_NAME = 'request_id'`
  );
  const [indexes] = await db.query(
    `SELECT INDEX_NAME, NON_UNIQUE,
            GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) AS column_names
     FROM INFORMATION_SCHEMA.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'AI_CHAT_USAGE'
     GROUP BY INDEX_NAME, NON_UNIQUE`
  );

  return {
    connectedDatabaseMatches: database.selected_database === process.env.DB_NAME,
    tableExists: true,
    requestIdColumn: columns[0] || null,
    requestIdUniqueIndex: indexes.find((index) => (
      Number(index.NON_UNIQUE) === 0 && index.column_names === 'user_id,request_id'
    )) || null,
    namedIndex: indexes.find((index) => index.INDEX_NAME === 'uq_ai_chat_usage_user_request') || null,
  };
}

function columnIsCompatible(column) {
  return column
    && column.DATA_TYPE.toLowerCase() === 'char'
    && Number(column.CHARACTER_MAXIMUM_LENGTH) === 36
    && column.IS_NULLABLE === 'YES';
}

function reportSchema(schema) {
  console.log(`Connected database matches DB_NAME: ${schema.connectedDatabaseMatches}`);
  console.log(`AI_CHAT_USAGE table: ${schema.tableExists ? 'present' : 'missing'}`);
  console.log(`request_id CHAR(36) NULL: ${columnIsCompatible(schema.requestIdColumn) ? 'present' : schema.requestIdColumn ? 'incompatible definition' : 'missing'}`);
  console.log(`Unique (user_id, request_id) index: ${schema.requestIdUniqueIndex ? 'present' : 'missing'}`);
}

async function applyMigration(schema) {
  if (!schema.tableExists) {
    throw new Error('AI_CHAT_USAGE is missing. Apply backend/migrations/001_dashboard_data.sql first.');
  }

  if (schema.requestIdColumn && !columnIsCompatible(schema.requestIdColumn)) {
    throw new Error('request_id exists with an incompatible definition; no changes were applied.');
  }

  if (schema.namedIndex && !schema.requestIdUniqueIndex) {
    throw new Error('The expected index name is already used by a different index; no changes were applied.');
  }

  if (!schema.requestIdColumn) {
    await db.query(
      'ALTER TABLE AI_CHAT_USAGE ADD COLUMN request_id CHAR(36) NULL AFTER user_id'
    );
    console.log('Added nullable request_id; existing usage records were preserved.');
    schema = await inspectSchema();
  }

  if (!schema.requestIdUniqueIndex) {
    const [[duplicates]] = await db.query(
      `SELECT COUNT(*) AS duplicate_groups
       FROM (
         SELECT user_id, request_id
         FROM AI_CHAT_USAGE
         WHERE request_id IS NOT NULL
         GROUP BY user_id, request_id
         HAVING COUNT(*) > 1
       ) AS duplicate_requests`
    );
    if (Number(duplicates.duplicate_groups) > 0) {
      throw new Error('Duplicate non-null request IDs exist; no index was added and no rows were changed.');
    }

    await db.query(
      'ALTER TABLE AI_CHAT_USAGE ADD UNIQUE KEY uq_ai_chat_usage_user_request (user_id, request_id)'
    );
    console.log('Added unique (user_id, request_id) index.');
  }
}

async function main() {
  const mode = process.argv[2];
  if (!['--check', '--apply'].includes(mode)) {
    throw new Error('Usage: node backend/scripts/apply-ai-chat-usage-idempotency.js --check|--apply');
  }

  let schema = await inspectSchema();
  reportSchema(schema);
  if (!schema.connectedDatabaseMatches) {
    throw new Error('Connected database does not match configured DB_NAME.');
  }

  if (mode === '--apply') {
    await applyMigration(schema);
    schema = await inspectSchema();
    reportSchema(schema);
    if (!columnIsCompatible(schema.requestIdColumn) || !schema.requestIdUniqueIndex) {
      throw new Error('The migration did not produce the required column and unique index.');
    }
  } else if (!schema.tableExists || !columnIsCompatible(schema.requestIdColumn) || !schema.requestIdUniqueIndex) {
    console.log('Migration is pending; --check made no database changes.');
    process.exitCode = 2;
  }
}

main()
  .catch((error) => {
    console.error(error.message || error.code || 'Migration check failed.');
    process.exitCode = 1;
  })
  .finally(() => db.end());
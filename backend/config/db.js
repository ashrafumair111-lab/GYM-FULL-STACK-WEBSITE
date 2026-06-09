/**
 * ============================================================
 *  MySQL Connection Pool
 *  Handles connection pooling and query execution
 * ============================================================
 */
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'gym_store',
  connectionLimit: process.env.DB_CONNECTION_LIMIT || 10,
  waitForConnections: true,
  enableKeepAlive: true,
  keepAliveInitialDelayMs: 0
});

/**
 * Execute a SQL query with parameters
 * @param {string} sql - SQL query with ? placeholders
 * @param {array} params - Parameter values
 * @returns {Promise<array>} [rows, fields]
 */
const query = async (sql, params = []) => {
  const connection = await pool.getConnection();
  try {
    const [rows, fields] = await connection.query(sql, params);
    return [rows, fields];
  } finally {
    connection.release();
  }
};

/**
 * Execute queries within a transaction
 * @param {function} callback - Async function receiving connection object
 * @returns {Promise} Transaction result
 */
const withTransaction = async (callback) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
};

module.exports = { pool, query, withTransaction };

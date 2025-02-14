import { connect } from "odbc";

export const connectionConfig = { connectionString: "DSN=EasyFattNode" };

export const closeConnection = async (conn) => await conn.close();

export const openConnection = async () => await connect(connectionConfig);

export const executeQuery = async (conn, query) => await conn.query(query);

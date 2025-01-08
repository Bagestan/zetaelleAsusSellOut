const odbc = require("odbc");
const connectionConfig = { connectionString: "DSN=EasyFattNode" };

async function openConnection() {
  return await odbc.connect(connectionConfig);
}

async function closeConnection(connection) {
  connection.close();
}

async function executeQuery(connection, query) {
  const result = await connection.query(query);
  return result;
}

async function main() {
  const connection = await openConnection();

  try {
    await findRighe(connection);
  } catch (err) {
    console.log(`Erro!!!`, err);
  } finally {
    console.log("Done, closing connection...");
    await closeConnection(connection);
  }
}

async function findRighe(connection) {
  const selectRighe = (IDDocRiga) => `
    SELECT 
      IDDocRiga,
      Qta AS QtaDocRighe,
      CodArticolo, 
      IDArticoloScaricato as IDArticolo, 
      MovMagazz
    FROM 
      TDocRighe
    WHERE 
      IDDocRiga = ${IDDocRiga}
    AND
      CodArticolo IS NOT NULL;`;

  const allRighe = [];

  try {
    for (const IDDocRiga of IDDocRighe) {
      const result = await executeQuery(
        connection,
        selectRighe(IDDocRiga),
        null
      );

      allRighe.push(...result);
    }

    console.log(allRighe);

    // return findMovMagazz(connection, allRighe);
  } catch (err) {
    console.error("Erro ao buscar righe:", err);
    throw err;
  }
}

main();

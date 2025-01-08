const odbc = require("odbc");
const IDDocRighe = require("./IDDocRighe");

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

// 3 - Alterar a linha da tabela TMovMagazz para anular a quantidade de
// acordo com a Qta da tabela MovMagazz

async function findMovMagazz(connection, righe) {
  const selectMovMagazz = (riga) => `
    SELECT 
      IDMovMagazz, 
      IDArticolo, 
      Data, 
      QtaCaricata, 
      QtaScaricata, 
      IDDocRiga
    FROM 
      TMovMagazz
    WHERE 
      IDArticolo = ${riga.IDArticolo}
    ORDER BY 
      Data ASC;`;

  try {
    for (const riga of righe) {
      let movMagazz = await executeQuery(
        connection,
        selectMovMagazz(riga),
        null
      );

      if (movMagazz.length > 0) {
        for (const mov of movMagazz) {
          console.log(
            `
            
            `,
            "🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀",
            { mov: mov, RIGA: riga }
          );
          if (mov.QtaCaricata <= 0) {
            console.log("🚀 ~ FATTO NIENTE 1 ");
            continue;
            //
          } else if (riga.QtaDocRighe === 1) {
            if (mov.QtaCaricata > 1) {
              updateMagazz(
                connection,
                mov.IDMovMagazz,
                mov.QtaCaricata - riga.QtaDocRighe
              );
              console.log("🚀 ~ UPDATE");
              break;
              //
            } else {
              await deleteMovMagazz(connection, mov.IDMovMagazz);
              console.log("🚀 ~ DELETE");
              break;
              //
            }
          } else if (riga.QtaDocRighe > 1) {
            if (mov.QtaCaricata > riga.QtaDocRighe) {
              // update
              await updateMagazz(
                connection,
                mov.IDMovMagazz,
                mov.QtaCaricata - riga.QtaDocRighe
              );
              console.log("🚀 ~ UPDATE");
              break;
              //
            } else if (riga.QtaDocRighe === mov.QtaCaricata) {
              await deleteMovMagazz(connection, mov.IDMovMagazz);
              console.log("🚀 ~ DELETE");
              break;
              //
            } else {
              console.log("🚀 ~ FATTO NIENTE 2");
              continue;
              //
            }
          }
        }
      }
    }
  } catch (err) {
    console.error("Erro ao buscar movMagazz:", err);
    // throw err;
  }
}

async function deleteMovMagazz(connection, idMovMagazz) {
  let deleteSql = `DELETE FROM TMovMagazz WHERE IDMovMagazz = ${idMovMagazz};`;

  console.log("🚀 ~ deleteMovMagazz ~ deleteSql:", deleteSql);
  const result = await executeQuery(connection, deleteSql, null);
  return result;
}

async function updateMagazz(connection, rigaID, nuovaQta) {
  const updateMagazz = `
  UPDATE 
    TMovMagazz
  SET 
    QtaCaricata =  ${nuovaQta},
    Lotto = 'Fatto update'
  WHERE 
    IDMovMagazz = ${rigaID};`;

  console.log(updateMagazz);
  const result = await executeQuery(connection, updateMagazz, null);
  return result;
}

main();

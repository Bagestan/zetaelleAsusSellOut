const odbc = require("odbc");
const readXlsxFile = require("read-excel-file/node");

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

async function readExcel() {
  const path = "asusListino/asus.xlsx";
  const rows = await readXlsxFile(path);
  return await excelRowsNormalizer(rows);
}

async function excelRowsNormalizer(rows) {
  const columnNames = ["ModelName", "PartNumber", "EAN"];

  const normalizedData = rows.map((row) =>
    columnNames.reduce((acc, key, index) => {
      acc[key] = row[index];
      return acc;
    }, {})
  );

  return normalizedData;
}

async function main() {
  const connection = await openConnection();

  try {
    const asusData = await readExcel();

    const DaneaProducts = await findAllArticles(connection, asusData);

    await updateAsusData(connection, DaneaProducts, asusData);
  } catch (err) {
    console.error(`Error!!!`, err);
  } finally {
    console.info("Done, closing connection...");
    await closeConnection(connection);
  }
}

async function updateAsusData(connection, DaneaProducts, asusData) {
  for (const article of DaneaProducts) {
    const asusInfo = asusData.find((item) => item.EAN == article.CodArticolo);

    // const commandSelect = `SELECT CodArticolo, CodArticoloForn, CodBarre, Extra1, Extra2 FROM TArticoli WHERE CodArticolo = '${article.CodArticolo}';`;
    if (asusInfo) {
      const commandUpdate = `UPDATE TArticoli SET
      CodArticoloForn = '${asusInfo.PartNumber}',
      CodBarre = '${asusInfo.ModelName}'
      WHERE CodArticolo = '${article.CodArticolo}';`;

      try {
        await executeQuery(connection, commandUpdate).finally(() =>
          console.info(
            "✅ CodArticolo:",
            article.CodArticolo,
            " | CodBarre:",
            article.CodBarre,
            " | CodArticoloForn:",
            asusInfo.PartNumber
          )
        );
      } catch (err) {
        console.error(`Error!!!`, err);
      }
    }
  }
}

async function findAllArticles(connection, asusData) {
  console.info("Searching for articles...");

  let result = [];

  for (const row of asusData) {
    const query = await findArticleByEanCode(connection, row.EAN);
    if (query) result.push(query);
  }

  const missingArticles = asusData.filter((article) => {
    // have to search what article in articles are not in result
    return !result.find((query) => {
      return query.CodArticolo == article.CodArticolo;
    });
  });

  if (missingArticles.length > 0) {
    for (const article of missingArticles) {
      const query = await findArticleByModelName(connection, article.ModelName);
      if (query) result.push(query);
      // else console.info("❌ CodBarre:", article.Modello);
    }
  }

  return result;
}

async function findArticleByEanCode(connection, CodArticolo) {
  fields = "IDArticolo, CodArticolo, Desc, CodBarre, CodIva, PrezzoNetto1";

  const command = `SELECT ${fields} FROM TArticoli WHERE CodArticolo = '${CodArticolo}';`;
  let result = await executeQuery(connection, command);

  return result.filter((item) => item.CodArticolo)[0];
}

async function findArticleByModelName(connection, Desc) {
  fields =
    "IDArticolo, CodArticolo, Desc, CodBarre, Tipologia, CodIva, PrezzoNetto1";

  const command = `SELECT ${fields} FROM TArticoli WHERE Desc LIKE '%${Desc}%';`;
  let result = await executeQuery(connection, command);

  return result.filter((item) => item.CodArticolo)[0] || null;
}

const formatDate = (date) => {
  const options = { day: "2-digit", month: "2-digit", year: "numeric" };
  return new Date(date).toLocaleDateString("it-IT", options);
};

const formatValue = (value) => {
  return `${Number(value).toFixed(2)}`;
};

const removeIVA = (price) => price / 1.22;

main();

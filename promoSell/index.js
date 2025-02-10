const odbc = require("odbc");
const readXlsxFile = require("read-excel-file/node");
const fs = require("fs");

const connectionConfig = { connectionString: "DSN=EasyFattNode" };

async function openConnection() {
  return await odbc.connect(connectionConfig);
}

const closeConnection = (connection) => connection.close();

async function executeQuery(connection, query) {
  const result = await connection.query(query);
  return result;
}

async function readExcel() {
  function excelRowsNormalizer(rows) {
    const columnNames = [
      "CodBarre",
      "CodArticoloForn",
      "CodArticolo",
      "DATE_START",
      "DATE_END",
      "PrezzoNettoForn",
      "Extra2",
      "Extra4",
      "PrezzoIvato1",
      "PrezzoIvato4",
      "Extra3",
    ];

    const normalizedData = rows.map((row) =>
      columnNames.reduce((acc, key, index) => {
        acc[key] = row[index];
        return acc;
      }, {})
    );

    return normalizedData;
  }

  const path = "promoSell/file.xlsx";
  const rows = await readXlsxFile(path);
  return await excelRowsNormalizer(rows);
}

function formatStringNumbers(asusData) {
  const fieldsToFormat = [
    "PrezzoNettoForn",
    "PrezzoIvato1",
    "PrezzoIvato4",
    "Extra2",
    "Extra4",
  ];

  function formatNumber(value) {
    if (typeof value !== "string") return NaN;
    let cleaned = value
      .replace(/[€\s]/g, "")
      .replace(/\./g, "")
      .replace(",", ".");

    let number = parseFloat(cleaned);
    return isNaN(number) ? null : number;
  }

  return asusData.map((product) => ({
    ...product,
    ...Object.fromEntries(
      fieldsToFormat.map((field) => [field, formatNumber(product[field])])
    ),
  }));
}

async function main() {
  const connection = await openConnection();

  try {
    let asusData = await readExcel();
    asusData = formatStringNumbers(asusData);
    await clearPreviousPromo(connection);

    const DaneaProducts = await findAsusArticles(connection, asusData);
    await updateAsusData(connection, DaneaProducts, asusData);
  } catch (err) {
    console.error(`Error!!!`, err);
  } finally {
    console.info("Done, closing connection...");
    closeConnection(connection);
  }
}

async function clearPreviousPromo(connection) {
  const previousPromo = await getPreviousPromo(connection);

  previousPromo.forEach(
    async (product) => await clearProduct(connection, product)
  );
}

async function getPreviousPromo(connection) {
  const selExpiredPromo = `
  SELECT 
    TArticoli.IDArticolo,
    TArticoli.CodArticolo,
    TArticoli.Desc,
    TArticoli.CodBarre,
    TArticoli.Extra1,
    TArticoli.Extra2,
    TArticoli.Extra3,
    TArticoli.Extra4,
    TArticoliMagazz.QtaCaricata,
    TArticoliMagazz.QtaScaricata
  FROM 
    TArticoli 
  INNER JOIN 
    TArticoliMagazz 
  ON 
    TArticoli.IDArticolo = TArticoliMagazz.IDArticolo
  WHERE 
    TArticoli.Extra1 IS NOT NULL
  GROUP BY
    TArticoli.IDArticolo,
    TArticoli.CodArticolo,
    TArticoli.Desc,
    TArticoli.CodBarre,
    TArticoli.Extra1,
    TArticoli.Extra2,
    TArticoli.Extra3,
    TArticoli.Extra4,
    TArticoliMagazz.QtaCaricata,
    TArticoliMagazz.QtaScaricata;
    `;

  let result = await executeQuery(connection, selExpiredPromo);
  return result.map((i) => ({ ...i, QTA: i.QtaCaricata - i.QtaScaricata }));
}

async function clearProduct(connection, product) {
  if (product.Extra1.includes("scaduto")) return;

  const clearAll = `
    PrezzoIvato4 = 0,
    PrezzoNetto4 = 0,
    Extra2 = '',
    Extra4 = '',`;

  const updatePreviousPromo = `
  UPDATE 
    TArticoli 
  SET 
    ${product.QTA <= 0 ? clearAll : ""}
    Extra1 = '${product.Extra1} scaduto'
  WHERE 
    IDArticolo = ${product.IDArticolo};
  `;
  await executeQuery(connection, updatePreviousPromo);
}

async function updateAsusData(connection, DaneaProducts, asusData) {
  for (const article of DaneaProducts) {
    const asusInfo = asusData.find((item) => {
      return item.CodArticolo == article.CodArticolo;
    });

    const commandUpdate = `UPDATE TArticoli SET
       CodArticoloForn = '${asusInfo.CodArticoloForn}',
       CodBarre = '${asusInfo.CodBarre}',
       Extra1 = '${formatDate(asusInfo.DATE_START)} > ${formatDate(
      asusInfo.DATE_END
    )}',
       Extra2 = '€ ${formatValue(asusInfo.Extra2)}',
       Extra3 = '${asusInfo.Extra3}',
       Extra4 = '€ ${formatValue(asusInfo.Extra4)}',
       PrezzoIvato1 = '${asusInfo.PrezzoIvato1}',
       PrezzoIvato4 = '${asusInfo.PrezzoIvato4}',
       PrezzoNetto4 = '${formatValue(removeIVA(asusInfo.PrezzoIvato4))}',
       PrezzoNettoForn = '${asusInfo.PrezzoNettoForn}'
       WHERE CodArticolo = '${article.CodArticolo}';`;

    try {
      await executeQuery(connection, commandUpdate).finally(() => {
        console.info(" ✅ CodArticolo:", article.CodArticolo);
        console.info(" ✅ CodBarre:", article.CodBarre);
        console.info(" ✅ CodArticoloForn:", asusInfo.CodArticoloForn);
      });
    } catch (err) {
      console.error(`Error!!!`, err);
    }
  }
}

async function findAsusArticles(connection, asusData) {
  console.info("Searching for articles...");

  let result = [];

  for (const row of asusData) {
    const query = await findArticleByEanCode(connection, row.CodArticolo);
    if (query) result.push(query);
  }

  const missingArticles = asusData.filter((article) => {
    // have to search what article in articles are not in result
    return !result.find((query) => {
      return query.CodArticolo === article.CodArticolo;
    });
  });

  if (missingArticles.length > 0) {
    for (const article of missingArticles) {
      const query = await findArticleByModelName(connection, article.CodBarre);
      if (query) result.push(query);
      else console.info("❌ CodBarre:", article.CodBarre);
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
  const options = { day: "2-digit", month: "2-digit", year: "2-digit" };
  return new Date(date).toLocaleDateString("it-IT", options);
};

const formatValue = (value) => `${Number(value).toFixed(2)}`;

const removeIVA = (price) => price / 1.22;

main();

import {
  clearPreviousPromo,
  findAsusArticles,
  updateAsusData,
} from "./services/database.js";
import { formatStringNumbers } from "./services/format.js";
import {
  openConnection,
  closeConnection,
  executeQuery,
} from "./services/odbc.js";

import readXlsxFile from "read-excel-file";

export async function readExcel() {
  const path = "src/file.xlsx";
  const rows = await readXlsxFile(path);
  return await excelRowsNormalizer(rows);
}

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

main();

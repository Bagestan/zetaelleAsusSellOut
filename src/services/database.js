export async function clearPreviousPromo(connection) {
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

export async function updateAsusData(connection, DaneaProducts, asusData) {
  const asusMap = new Map(
    asusData.map((item) => [String(item.CodArticolo).trim(), item])
  );

  for (const article of DaneaProducts) {
    const asusInfo = asusMap.get(article.CodArticolo);

    if (!asusInfo) continue;

    const commandUpdate = `UPDATE OR INSERT INTO TArticoli (
      CodArticolo, 
      CodArticoloForn, 
      CodBarre, 
      Extra1, 
      Extra2, 
      Extra3, 
      Extra4, 
      PrezzoIvato1, 
      PrezzoIvato4, 
      PrezzoNetto4, 
      PrezzoNettoForn) VALUES (
      '${article.CodArticolo}',
      '${asusInfo.CodArticoloForn}',
      '${asusInfo.CodBarre}',
      '${formatDate(asusInfo.DATE_START)} > ${formatDate(asusInfo.DATE_END)}',
      '€ ${formatValue(asusInfo.Extra2)}',
      '${asusInfo.Extra3 ? asusInfo.Extra3 : ""}',
      '€ ${formatValue(asusInfo.Extra4)}',
      ${asusInfo.PrezzoIvato1},
      ${asusInfo.PrezzoIvato4},
      ${formatValue(removeIVA(asusInfo.PrezzoIvato4))},
      ${asusInfo.PrezzoNettoForn}
      ) MATCHING (CodArticolo);`;

    try {
      await executeQuery(connection, commandUpdate)
        .finally(() => {
          console.info(" ✅ CodArticolo:", article.CodArticolo);
        })
        .catch((error) => {
          console.log(`
          
          
          
          ${asusInfo}`);
          console.log("🚀 ~ awaitexecuteQuery ~ error:", error);
          console.log("🚀 ~ awaitexecuteQuery ~ commandUpdate:", commandUpdate);
        });
    } catch (err) {
      console.error(`Error!!!`, err);
    }
  }
}

export async function findAsusArticles(connection, asusData) {
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

export async function findArticleByEanCode(connection, CodArticolo) {
  fields = "IDArticolo, CodArticolo, Desc, CodBarre, CodIva, PrezzoNetto1";

  const command = `SELECT ${fields} FROM TArticoli WHERE CodArticolo = '${CodArticolo}';`;
  let result = await executeQuery(connection, command);

  return result.filter((item) => item.CodArticolo)[0];
}

export async function findArticleByModelName(connection, Desc) {
  fields =
    "IDArticolo, CodArticolo, Desc, CodBarre, Tipologia, CodIva, PrezzoNetto1";

  const command = `SELECT ${fields} FROM TArticoli WHERE Desc LIKE '%${Desc}%';`;
  let result = await executeQuery(connection, command);

  return result.filter((item) => item.CodArticolo)[0] || null;
}

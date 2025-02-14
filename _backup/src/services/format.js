export function formatNumber(value) {
  if (typeof value !== "string") return value;
  let cleaned = value
    .replace(/[€\s]/g, "")
    .replace(/\./g, "")
    .replace(",", ".");

  let number = parseFloat(cleaned);
  return isNaN(number) ? null : number;
}

export function formatStringNumbers(asusData) {
  const fieldsToFormat = [
    "PrezzoNettoForn",
    "PrezzoIvato1",
    "PrezzoIvato4",
    "Extra2",
    "Extra4",
  ];

  return asusData.map((product) => ({
    ...product,
    ...Object.fromEntries(
      fieldsToFormat.map((field) => [field, formatNumber(product[field])])
    ),
  }));
}

export const formatDate = (date) => {
  const options = { day: "2-digit", month: "2-digit", year: "2-digit" };
  return new Date(date).toLocaleDateString("it-IT", options);
};

export const formatValue = (value) => `${Number(value).toFixed(2)}`;

export const removeIVA = (price) => price / 1.22;

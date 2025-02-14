const fs = require("fs");
const path = require("path");

function criarArquivoJson(nomeDeJson, arrayDeObjetos) {
  const caminhoArquivo = path.join(__dirname, `${nomeDeJson}.json`);
  const dadosJson = JSON.stringify(arrayDeObjetos, null, 2);

  fs.writeFile(caminhoArquivo, dadosJson, (erro) => {
    if (erro) {
      console.error("Erro ao criar o arquivo JSON:", erro);
    } else {
      console.log(
        `Arquivo ${nomeDeJson}.json criado com sucesso na raiz do projeto!`
      );
    }
  });
}
export default criarArquivoJson;

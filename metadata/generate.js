const fs = require("fs");
const config = require('./config.json');

const generateFiles = async(arr) => {
  let count = 0;
  await arr.reduce(async(promise, tokenId) => {
    await promise;
    const tokenMetadata = {
      "description": config.description,
      "image": config.imageUrl,  
      "name": `${config.namePrefix}${tokenId + 1}`,
    }
    await fs.writeFile(`./tokens/${tokenId}.json`, JSON.stringify(tokenMetadata, null, 2), (err) => {
      if (err) throw err;
      count++;
    })
  }, Promise.resolve())
  return count;
}

(async () => {
  const arr = Array.from(Array(config.totalSupply).keys()).map(c => c);
  const files = await generateFiles(arr);
  console.log('Finished generating metadata')
})();

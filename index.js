const crypto = require('crypto');
const { exec } = require('child_process');
const express = require('express');

const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('public'));

function generateRandHexEncodedNamespaceID(seed) {
  const rand = crypto.createHash('sha3-256').update(seed.toString()).digest();
  return rand.slice(0, 8).toString('hex');
}

function generateRandMessage(seed) {
  const rand = crypto.createHash('sha3-256').update(seed.toString()).digest();
  const lenMsg = rand[0] % 100;
  return rand.slice(1, lenMsg + 1).toString('hex');
}

app.post('/', (req, res) => {
  const seed = parseInt(req.body.seed);
  if (!isNaN(seed)) {
    const namespace_id = generateRandHexEncodedNamespaceID(seed);
    const data = generateRandMessage(seed);
    const command = `curl --header "Content-Type: application/json" --request POST --data '{"namespace_id":"${namespace_id}","data":"${data}","gas_limit": 80000,"fee":2000}' http://localhost:26659/submit_pfb`;
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
        return;
      }
      console.log(stdout)
      try {
        const parsedOutput = JSON.parse(stdout);
        const { height, txhash } = parsedOutput;
        const signer = parsedOutput.logs[0].events[0].attributes[2].value
        res.status(200).send(`Block Height: ${height}\nTransaction Hash: ${txhash}\nNamespace ID: ${namespace_id}\nData Hex: ${data}\nSigner: ${signer}\n\n\n${JSON.stringify(parsedOutput, null, 2)}`)
      } catch (e) {
        res.status(500).send(`Namespace ID: ${namespace_id}\nData Hex: ${data}\n\n\n${stdout}`);
        console.log(e)
      }
    });
  } else {
    res.status(400).json({ message: 'Invalid request' });
  }
});

app.listen(3069, () => {
  console.log('Server is listening on port 3069');
});


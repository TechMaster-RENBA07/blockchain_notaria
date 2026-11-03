const fs = require("node:fs");
const path = require("node:path");
const solc = require("solc");
const { ethers } = require("ethers");

const root = path.resolve(__dirname, "..");
require("dotenv").config({ path: path.join(root, ".env") });

async function main() {
  const { CHAIN_RPC_URL, CHAIN_ID, BLOCKCHAIN_SIGNER_PRIVATE_KEY } = process.env;
  if (!CHAIN_RPC_URL || !CHAIN_ID) {
    throw new Error("Configura CHAIN_RPC_URL y CHAIN_ID en .env.");
  }
  if (!BLOCKCHAIN_SIGNER_PRIVATE_KEY) {
    throw new Error("Falta BLOCKCHAIN_SIGNER_PRIVATE_KEY en .env. Configúrala localmente; no la compartas.");
  }

  const sourcePath = path.join(root, "contracts", "NotarialDocumentRegistry.sol");
  const source = fs.readFileSync(sourcePath, "utf8");
  const input = {
    language: "Solidity",
    sources: { "NotarialDocumentRegistry.sol": { content: source } },
    settings: {
      optimizer: { enabled: true, runs: 200 },
      outputSelection: { "*": { "*": ["abi", "evm.bytecode.object"] } },
    },
  };
  const compiled = JSON.parse(solc.compile(JSON.stringify(input)));
  const errors = (compiled.errors || []).filter((entry) => entry.severity === "error");
  if (errors.length) {
    throw new Error(`No se pudo compilar el contrato:\n${errors.map((entry) => entry.formattedMessage).join("\n")}`);
  }

  const artifact = compiled.contracts["NotarialDocumentRegistry.sol"].NotarialDocumentRegistry;
  const provider = new ethers.JsonRpcProvider(CHAIN_RPC_URL);
  const wallet = new ethers.Wallet(BLOCKCHAIN_SIGNER_PRIVATE_KEY, provider);
  const network = await provider.getNetwork();
  if (network.chainId !== BigInt(CHAIN_ID)) {
    throw new Error(`La red respondió Chain ID ${network.chainId}; se esperaba ${CHAIN_ID}.`);
  }

  const balance = await provider.getBalance(wallet.address);
  if (balance === 0n) {
    throw new Error(`La wallet ${wallet.address} no tiene saldo para pagar el despliegue. Consigue fondos de prueba en HSK Testnet.`);
  }

  console.log(`Red verificada: Chain ID ${network.chainId}`);
  console.log(`Wallet de despliegue: ${wallet.address}`);
  console.log(`Saldo disponible: ${ethers.formatEther(balance)} HSK`);

  const factory = new ethers.ContractFactory(artifact.abi, `0x${artifact.evm.bytecode.object}`, wallet);
  const contract = await factory.deploy();
  await contract.waitForDeployment();
  const address = await contract.getAddress();
  if ((await provider.getCode(address)) === "0x") {
    throw new Error("La transacción terminó, pero no se encontró código del contrato en la dirección desplegada.");
  }

  const envPath = path.join(root, ".env");
  let envContent = fs.readFileSync(envPath, "utf8");
  const addressSetting = /^NOTARY_REGISTRY_ADDRESS=.*$/m;
  if (addressSetting.test(envContent)) {
    envContent = envContent.replace(addressSetting, `NOTARY_REGISTRY_ADDRESS=${address}`);
  } else {
    envContent = `${envContent.trimEnd()}\nNOTARY_REGISTRY_ADDRESS=${address}\n`;
  }
  fs.writeFileSync(envPath, envContent);

  const deploymentTransaction = contract.deploymentTransaction();
  console.log(`Contrato desplegado: ${address}`);
  console.log(`Transacción: ${deploymentTransaction.hash}`);
  console.log(`Explorador: https://testnet-explorer.hskchain.net/address/${address}`);
  console.log("La dirección se guardó en .env. Reinicia la API para activar el anclaje.");
}

main().catch((error) => {
  console.error(`Error de despliegue: ${error.message}`);
  process.exitCode = 1;
});

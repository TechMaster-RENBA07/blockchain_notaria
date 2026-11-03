const { ethers } = require("ethers");
const env = require("../config");

const ABI = [
  "function registerDocument(bytes32 publicId, bytes32 fileHash)",
  "function addVersion(bytes32 publicId, bytes32 fileHash)",
  "function getVersions(bytes32 publicId) view returns ((bytes32 fileHash,uint64 timestamp,address registeredBy)[])",
];

let contract;
let provider;

function getContract() {
  if (!env.CHAIN_RPC_URL || !env.NOTARY_REGISTRY_ADDRESS || !env.BLOCKCHAIN_SIGNER_PRIVATE_KEY) {
    return null;
  }
  if (!contract) {
    provider = new ethers.JsonRpcProvider(env.CHAIN_RPC_URL);
    const wallet = new ethers.Wallet(env.BLOCKCHAIN_SIGNER_PRIVATE_KEY, provider);
    contract = new ethers.Contract(env.NOTARY_REGISTRY_ADDRESS, ABI, wallet);
  }
  return contract;
}

function toBytes32(hex) {
  return `0x${hex.replace(/^0x/, "")}`;
}

function publicIdToBytes32(publicId) {
  return ethers.keccak256(ethers.toUtf8Bytes(publicId));
}

async function anchorDocument(publicId, fileHash, isNewDocument) {
  const registry = getContract();
  if (!registry) {
    return { status: "PENDING", transactionHash: null, blockNumber: null, chainId: env.CHAIN_ID || null };
  }

  const network = await provider.getNetwork();
  if (env.CHAIN_ID && network.chainId !== BigInt(env.CHAIN_ID)) {
    throw new Error(`La red configurada tiene Chain ID ${network.chainId}; se esperaba ${env.CHAIN_ID}.`);
  }

  const id = publicIdToBytes32(publicId);
  const hash = toBytes32(fileHash);
  const tx = isNewDocument
    ? await registry.registerDocument(id, hash)
    : await registry.addVersion(id, hash);
  const receipt = await tx.wait();
  if (receipt.status !== 1) throw new Error("La transacción blockchain no se confirmó correctamente.");

  return {
    status: "ANCHORED",
    transactionHash: receipt.hash,
    blockNumber: BigInt(receipt.blockNumber),
    chainId: network.chainId.toString(),
  };
}

async function verifyLatest(publicId) {
  const registry = getContract();
  if (!registry) return { available: false, matches: null, latestHash: null, chainId: env.CHAIN_ID || null };
  const network = await provider.getNetwork();
  if (env.CHAIN_ID && network.chainId !== BigInt(env.CHAIN_ID)) {
    throw new Error(`La red configurada tiene Chain ID ${network.chainId}; se esperaba ${env.CHAIN_ID}.`);
  }
  const versions = await registry.getVersions(publicIdToBytes32(publicId));
  const latest = versions.at(-1);
  return {
    available: true,
    matches: latest ? latest.fileHash.slice(2).toLowerCase() : false,
    latestHash: latest ? latest.fileHash.slice(2).toLowerCase() : null,
    chainId: network.chainId.toString(),
    timestamp: latest ? Number(latest.timestamp) : null,
    registeredBy: latest?.registeredBy || null,
  };
}

function isConfigured() {
  return Boolean(env.CHAIN_RPC_URL && env.NOTARY_REGISTRY_ADDRESS && env.BLOCKCHAIN_SIGNER_PRIVATE_KEY);
}

module.exports = { anchorDocument, verifyLatest, isConfigured };

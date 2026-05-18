const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const selfsigned = require("selfsigned");

const certDir = path.join(__dirname, "certs");
const keyPath = path.join(certDir, "buscapet-local-key.pem");
const certPath = path.join(certDir, "buscapet-local-cert.pem");
const hosts = process.argv.slice(2).filter(Boolean);

function altName(host) {
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) {
    return { type: 7, ip: host };
  }

  return { type: 2, value: host };
}

async function garantirCertificado() {
  fs.mkdirSync(certDir, { recursive: true });

  if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
    return false;
  }

  const nomes = Array.from(new Set(["localhost", "127.0.0.1", ...hosts]));
  const attrs = [{ name: "commonName", value: "BuscaPet Local HTTPS" }];
  const pems = await selfsigned.generate(attrs, {
    algorithm: "sha256",
    days: 825,
    keySize: 2048,
    extensions: [
      { name: "basicConstraints", cA: true },
      {
        name: "keyUsage",
        keyCertSign: true,
        digitalSignature: true,
        keyEncipherment: true
      },
      { name: "extKeyUsage", serverAuth: true },
      { name: "subjectAltName", altNames: nomes.map(altName) }
    ]
  });

  fs.writeFileSync(keyPath, pems.private || pems.privateKey, { mode: 0o600 });
  fs.writeFileSync(certPath, pems.cert);

  return true;
}

function confiarCertificadoNoWindows() {
  if (process.platform !== "win32") {
    return;
  }

  try {
    execFileSync("certutil", ["-user", "-addstore", "Root", certPath], {
      stdio: "ignore"
    });
  } catch {
    console.log("Nao foi possivel confiar automaticamente no certificado. O HTTPS ainda vai funcionar, mas o navegador pode mostrar um aviso.");
  }
}

garantirCertificado()
  .then((criado) => {
    if (criado) {
      confiarCertificadoNoWindows();
      console.log("Certificado HTTPS local criado automaticamente.");
    }

    console.log(JSON.stringify({ keyPath, certPath }));
  })
  .catch((err) => {
    console.error("Erro ao criar certificado HTTPS local:", err);
    process.exit(1);
  });

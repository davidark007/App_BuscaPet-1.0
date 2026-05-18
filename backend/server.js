const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
for (const envPath of [path.resolve(__dirname, "..", ".env"), path.resolve(__dirname, ".env")]) {
  if (fs.existsSync(envPath)) {
    require("dotenv").config({ path: envPath, override: false });
  }
}
const http = require("http");
const https = require("https");
const crypto = require("crypto");

const app = express();

app.use(cors());
app.use(express.json());

const ENCRYPTION_PREFIX = "enc:v1:";
const TUTOR_SENSITIVE_FIELDS = [
  "nome",
  "cpf",
  "telefone",
  "endereco",
  "bairro",
  "cep",
  "latitude",
  "longitude"
];

function carregarChaveCriptografia() {
  const chaveEnv = process.env.TUTOR_DATA_KEY || process.env.BUSCAPET_DATA_KEY;

  if (chaveEnv) {
    const chave = chaveEnv.length === 64
      ? Buffer.from(chaveEnv, "hex")
      : Buffer.from(chaveEnv, "base64");

    if (chave.length !== 32) {
      throw new Error("TUTOR_DATA_KEY precisa ter 32 bytes em base64 ou 64 caracteres hex.");
    }

    return chave;
  }

  const keyPath = path.join(__dirname, ".buscapet-data-key");

  if (fs.existsSync(keyPath)) {
    return Buffer.from(fs.readFileSync(keyPath, "utf8").trim(), "base64");
  }

  const novaChave = crypto.randomBytes(32);
  fs.writeFileSync(keyPath, novaChave.toString("base64"), { mode: 0o600 });
  console.log("Chave local de criptografia criada em backend/.buscapet-data-key");

  return novaChave;
}

const TUTOR_DATA_KEY = carregarChaveCriptografia();

function valorVazio(valor) {
  return valor === null || valor === undefined || valor === "";
}

function valorCriptografado(valor) {
  return typeof valor === "string" && valor.startsWith(ENCRYPTION_PREFIX);
}

function criptografarValor(valor) {
  if (valorVazio(valor) || valorCriptografado(valor)) {
    return valor ?? null;
  }

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", TUTOR_DATA_KEY, iv);
  const textoCriptografado = Buffer.concat([
    cipher.update(String(valor), "utf8"),
    cipher.final()
  ]);
  const tag = cipher.getAuthTag();

  return [
    ENCRYPTION_PREFIX.slice(0, -1),
    iv.toString("base64"),
    tag.toString("base64"),
    textoCriptografado.toString("base64")
  ].join(":");
}

function descriptografarValor(valor) {
  if (!valorCriptografado(valor)) {
    return valor;
  }

  try {
    const partes = valor.split(":");
    const iv = Buffer.from(partes[2], "base64");
    const tag = Buffer.from(partes[3], "base64");
    const textoCriptografado = Buffer.from(partes[4], "base64");
    const decipher = crypto.createDecipheriv("aes-256-gcm", TUTOR_DATA_KEY, iv);

    decipher.setAuthTag(tag);

    return Buffer.concat([
      decipher.update(textoCriptografado),
      decipher.final()
    ]).toString("utf8");
  } catch (err) {
    console.log("Erro ao descriptografar dado sensivel do tutor:", err.message);
    return "";
  }
}

function normalizarCpf(cpf) {
  return String(cpf || "").replace(/\D/g, "");
}

function gerarHashCpf(cpf) {
  const cpfLimpo = normalizarCpf(cpf);

  if (!cpfLimpo) {
    return null;
  }

  return crypto.createHmac("sha256", TUTOR_DATA_KEY).update(cpfLimpo).digest("hex");
}

function protegerTutorParaBanco(tutor) {
  const protegido = { ...tutor };

  for (const campo of TUTOR_SENSITIVE_FIELDS) {
    protegido[campo] = criptografarValor(protegido[campo]);
  }

  protegido.cpf_hash = gerarHashCpf(tutor.cpf);

  return protegido;
}

function abrirTutorDoBanco(tutor) {
  if (!tutor) {
    return tutor;
  }

  const aberto = { ...tutor };

  for (const campo of TUTOR_SENSITIVE_FIELDS) {
    aberto[campo] = descriptografarValor(aberto[campo]);
  }

  return aberto;
}

// Configuração do multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

// ROTA DE UPLOAD
app.post("/upload-foto", upload.single("foto"), (req, res) => {
  const email = req.body.email;

  if (!req.file) {
    return res.status(400).json({ erro: "Nenhuma imagem enviada" });
  }

  const caminho = `/uploads/${req.file.filename}`;

  const sql = "UPDATE tutor SET foto = ? WHERE email = ?";

  db.query(sql, [caminho, email], (err) => {
    if (err) {
      console.log(err);
      return res.status(500).json({ erro: "Erro ao salvar foto" });
    }

    res.json({ foto: caminho });
  });
});
app.use("/uploads", express.static("uploads"));

app.use(express.static("public"));

let ultimaLocalizacao = {
  latitude: -21.264321,
  longitude: -47.816942,
  bateria: 100
};

app.post("/localizacao", (req, res) => {

  ultimaLocalizacao = req.body;

  console.log("Nova localização:", ultimaLocalizacao);

  res.send("OK");
});

app.get("/localizacao", (req, res) => {
  res.json(ultimaLocalizacao);
});

// ========================
// CONEXÃO COM BANCO DO APP
// ========================

const mysql = require("mysql2");
const bcrypt = require("bcryptjs");

app.use(cors());
app.use(express.json());

const db = mysql.createConnection({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD ?? "",
  database: process.env.DB_NAME || "busca_pet",
  port: Number(process.env.DB_PORT || 3308)
});

function queryDb(sql, valores = []) {
  return new Promise((resolve, reject) => {
    db.query(sql, valores, (err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
  });
}

async function garantirSchemaSegurancaTutor() {
  const colunas = await queryDb("SHOW COLUMNS FROM tutor");
  const nomesColunas = new Set(colunas.map((coluna) => coluna.Field));

  const ajustes = [
    ["nome", "VARCHAR(512) NOT NULL"],
    ["cpf", "VARCHAR(512) NOT NULL"],
    ["telefone", "VARCHAR(512) NULL"],
    ["endereco", "TEXT NULL"],
    ["bairro", "VARCHAR(512) NULL"],
    ["cep", "VARCHAR(512) NULL"],
    ["latitude", "VARCHAR(512) NULL"],
    ["longitude", "VARCHAR(512) NULL"],
    ["foto", "VARCHAR(255) NULL"],
    ["cpf_hash", "CHAR(64) NULL"]
  ];

  for (const [coluna, tipo] of ajustes) {
    if (nomesColunas.has(coluna)) {
      await queryDb(`ALTER TABLE tutor MODIFY ${coluna} ${tipo}`);
    } else {
      await queryDb(`ALTER TABLE tutor ADD COLUMN ${coluna} ${tipo}`);
    }
  }

  const indices = await queryDb("SHOW INDEX FROM tutor WHERE Key_name = 'idx_tutor_cpf_hash'");
  if (indices.length === 0) {
    await queryDb("ALTER TABLE tutor ADD UNIQUE INDEX idx_tutor_cpf_hash (cpf_hash)");
  }
}

async function garantirSchemaStatusPet() {
  const colunas = await queryDb("SHOW COLUMNS FROM pet");
  const nomesColunas = new Set(colunas.map((coluna) => coluna.Field));

  if (!nomesColunas.has("perdido")) {
    await queryDb("ALTER TABLE pet ADD COLUMN perdido TINYINT(1) NOT NULL DEFAULT 0");
  }
}

async function migrarTutorsExistentesParaCriptografia() {
  const tutores = await queryDb(`
    SELECT id_tutor, nome, cpf, cpf_hash, telefone, endereco, bairro, cep, latitude, longitude
    FROM tutor
  `);
  let totalMigrado = 0;

  for (const tutor of tutores) {
    const precisaCriptografar = TUTOR_SENSITIVE_FIELDS.some((campo) => {
      return !valorVazio(tutor[campo]) && !valorCriptografado(tutor[campo]);
    });
    const precisaHashCpf = !tutor.cpf_hash && !valorVazio(tutor.cpf);

    if (!precisaCriptografar && !precisaHashCpf) {
      continue;
    }

    const tutorAberto = abrirTutorDoBanco(tutor);
    const tutorProtegido = protegerTutorParaBanco(tutorAberto);

    await queryDb(`
      UPDATE tutor
      SET nome=?, cpf=?, cpf_hash=?, telefone=?, endereco=?, bairro=?, cep=?, latitude=?, longitude=?
      WHERE id_tutor=?
    `, [
      tutorProtegido.nome,
      tutorProtegido.cpf,
      tutorProtegido.cpf_hash,
      tutorProtegido.telefone,
      tutorProtegido.endereco,
      tutorProtegido.bairro,
      tutorProtegido.cep,
      tutorProtegido.latitude,
      tutorProtegido.longitude,
      tutor.id_tutor
    ]);

    totalMigrado += 1;
  }

  if (totalMigrado > 0) {
    console.log(`Tutors migrados para dados criptografados: ${totalMigrado}`);
  }
}

function criarServidorHttpOuHttps() {
  if (process.env.BUSCAPET_DISABLE_HTTPS === "1") {
    console.log("HTTPS desativado por BUSCAPET_DISABLE_HTTPS=1.");
    return {
      protocolo: "http",
      servidor: http.createServer(app)
    };
  }

  const defaultKeyPath = path.join(__dirname, "certs", "buscapet-local-key.pem");
  const defaultCertPath = path.join(__dirname, "certs", "buscapet-local-cert.pem");
  const keyPath = process.env.SSL_KEY_PATH || process.env.TLS_KEY_PATH || defaultKeyPath;
  const certPath = process.env.SSL_CERT_PATH || process.env.TLS_CERT_PATH || defaultCertPath;

  if (keyPath && certPath && fs.existsSync(keyPath) && fs.existsSync(certPath)) {
    return {
      protocolo: "https",
      servidor: https.createServer({
        key: fs.readFileSync(keyPath),
        cert: fs.readFileSync(certPath),
        minVersion: "TLSv1.2"
      }, app)
    };
  }

  console.log("SSL/TLS nao configurado. Defina SSL_KEY_PATH e SSL_CERT_PATH para subir em HTTPS.");
  return {
    protocolo: "http",
    servidor: http.createServer(app)
  };
}

function iniciarServidor() {
  const PORT = process.env.PORT || 3000;
  const HOST = process.env.APP_HOST || process.env.HOST || "0.0.0.0";
  const { protocolo, servidor } = criarServidorHttpOuHttps();

  servidor.listen(PORT, HOST, () => {
    console.log(`Servidor ${protocolo.toUpperCase()} rodando em ${HOST}:${PORT}`);
  });
}

db.connect(async (err) => {
  if (err) {
    console.log("Erro ao conectar no banco:", err);
    iniciarServidor();
    return;
  }

  console.log("Banco conectado!");

  try {
    await garantirSchemaSegurancaTutor();
    await garantirSchemaStatusPet();
    await migrarTutorsExistentesParaCriptografia();
    console.log("Schema de seguranca do tutor e status do pet verificados.");
  } catch (schemaErr) {
    console.log("Erro ao ajustar schema do banco:", schemaErr);
  }

  iniciarServidor();
});

function removerAcentos(texto = "") {
  return String(texto)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function montarBusca(partes) {
  return removerAcentos(partes.filter(Boolean).join(", "));
}

async function esperar(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function buscarEnderecoPorCep(cep) {
  const cepLimpo = String(cep || "").replace(/\D/g, "");

  if (cepLimpo.length !== 8) {
    throw new Error("CEP invalido");
  }

  const resCep = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);

  if (!resCep.ok) {
    throw new Error("Erro ao buscar CEP");
  }

  const endereco = await resCep.json();

  if (endereco.erro) {
    throw new Error("CEP nao encontrado");
  }

  return { cepLimpo, endereco };
}

function montarEnderecoDoCep(cepLimpo, endereco) {
  return {
    cep: endereco.cep || cepLimpo.replace(/^(\d{5})(\d{3})$/, "$1-$2"),
    endereco: endereco.logradouro || "",
    bairro: endereco.bairro || "",
    cidade: endereco.localidade || "",
    uf: endereco.uf || ""
  };
}

function textoNormalizado(texto = "") {
  return removerAcentos(texto).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function enderecoBateComCep(enderecoDigitado, logradouroCep) {
  const digitado = textoNormalizado(enderecoDigitado);
  const logradouro = textoNormalizado(logradouroCep);

  return Boolean(digitado && logradouro && (digitado.includes(logradouro) || logradouro.includes(digitado)));
}

async function buscarCoordenadasPorEndereco(buscas) {
  const buscasUnicas = buscas.filter((busca, index, lista) => {
    return busca && lista.indexOf(busca) === index;
  });

  for (const busca of buscasUnicas) {
    const params = new URLSearchParams({
      format: "json",
      addressdetails: "1",
      countrycodes: "br",
      q: busca,
      limit: "1"
    });

    const resGeo = await fetch(
      `https://nominatim.openstreetmap.org/search?${params.toString()}`,
      {
        headers: {
          "User-Agent": "BuscaPet/1.0 (projeto academico local)",
          "Accept": "application/json",
          "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8"
        }
      }
    );

    if (!resGeo.ok) {
      throw new Error("Erro ao buscar coordenadas do endereco");
    }

    const geo = await resGeo.json();

    if (geo.length) {
      return {
        latitude: Number(geo[0].lat),
        longitude: Number(geo[0].lon)
      };
    }

    await esperar(1000);
  }

  throw new Error("Nao foi possivel localizar esse endereco no mapa");
}

async function buscarCoordenadasPorCep(cep, dadosEndereco = {}) {
  try {
    const { endereco } = await buscarEnderecoPorCep(cep);
    const enderecoDigitado = dadosEndereco.endereco || "";
    const enderecoValidado = enderecoBateComCep(enderecoDigitado, endereco.logradouro)
      ? enderecoDigitado
      : endereco.logradouro;
    const bairro = endereco.bairro || dadosEndereco.bairro;
    const cidade = endereco.localidade;
    const uf = endereco.uf;

    return buscarCoordenadasPorEndereco([
      montarBusca([enderecoValidado, bairro, cidade, uf, "Brasil"]),
      montarBusca([endereco.logradouro, bairro, cidade, uf, "Brasil"]),
      montarBusca([bairro, cidade, uf, "Brasil"]),
      montarBusca([cidade, uf, "Brasil"])
    ]);
  } catch (erroCep) {
    if (!dadosEndereco.endereco || !dadosEndereco.bairro) {
      throw erroCep;
    }

    return buscarCoordenadasPorEndereco([
      montarBusca([dadosEndereco.endereco, dadosEndereco.bairro, dadosEndereco.cidade, dadosEndereco.uf, "Brasil"]),
      montarBusca([dadosEndereco.endereco, dadosEndereco.bairro, "Brasil"]),
      montarBusca([dadosEndereco.bairro, dadosEndereco.cidade, dadosEndereco.uf, "Brasil"])
    ]);
  }
}

async function buscarDadosPorCep(cep) {
  const { cepLimpo, endereco } = await buscarEnderecoPorCep(cep);
  return montarEnderecoDoCep(cepLimpo, endereco);
}

// ========================
// LOGIN
// ========================
function senhaTemHashBcrypt(senhaBanco) {
  return /^\$2[aby]\$\d{2}\$/.test(String(senhaBanco || ""));
}

async function validarSenha(senhaDigitada, senhaBanco) {
  if (senhaTemHashBcrypt(senhaBanco)) {
    return bcrypt.compare(String(senhaDigitada || ""), senhaBanco);
  }

  return String(senhaDigitada || "") === String(senhaBanco || "");
}

async function atualizarSenhaLegadaSeNecessario(usuario, senhaDigitada) {
  if (senhaTemHashBcrypt(usuario.senha)) {
    return;
  }

  const senhaHash = await bcrypt.hash(String(senhaDigitada), 12);
  db.query("UPDATE usuario SET senha = ? WHERE id_usuario = ?", [senhaHash, usuario.id_usuario], (err) => {
    if (err) {
      console.log("Erro ao atualizar senha legada:", err);
    }
  });
}

app.post("/login", (req, res) => {
  const { email, senha } = req.body;

  const sql = "SELECT * FROM usuario WHERE email = ?";

  db.query(sql, [email], async (err, result) => {
    if (err) {
      return res.status(500).json({ erro: "Erro ao buscar usuario!" });
    }

    if (result.length === 0) {
      return res.status(401).json({ erro: "Email não cadastrado!" });
    }

    const usuario = result[0];

    try {
      const senhaCorreta = await validarSenha(senha, usuario.senha);

      if (!senhaCorreta) {
        return res.status(401).json({ erro: "Senha incorreta!" });
      }

      await atualizarSenhaLegadaSeNecessario(usuario, senha);
    } catch (erroSenha) {
      console.log("Erro ao validar senha:", erroSenha);
      return res.status(500).json({ erro: "Erro ao validar senha!" });
    }

    res.json({
      mensagem: "Login OK!",
      id_usuario: usuario.id_usuario,
      nome: usuario.nome,
      email: usuario.email,
      perfil: usuario.perfil
    });
  });
});

// ========================
// CADASTRO DE USUÁRIO
// ========================

app.post("/cadastro", (req, res) => {
  const { nome, senha, email } = req.body;

  const sqlCheck = "SELECT id_usuario FROM usuario WHERE email = ?";

  db.query(sqlCheck, [email], (err, result) => {
    if (err) {
      return res.status(500).json({ erro: "Erro ao verificar email!" });
    }

    if (result.length > 0) {
      return res.status(400).json({ erro: "Email já cadastrado!" });
    }

    const criarUsuario = async () => {
      const loginBase = String(email || "").split("@")[0];
      const login = `${loginBase}_${Date.now()}`;
      const perfil = "Tutor";
      const senhaHash = await bcrypt.hash(String(senha), 12);
      const sqlInsert = "INSERT INTO usuario (nome, login, senha, perfil, email) VALUES (?, ?, ?, ?, ?)";

      db.query(sqlInsert, [nome, login, senhaHash, perfil, email], (err) => {
        if (err) {
          return res.status(500).json({ erro: "Erro ao cadastrar usuario!" });
        }

        res.json({ mensagem: "Cadastro realizado com sucesso!" });
      });
    };

    criarUsuario().catch((erroHash) => {
      console.log("Erro ao proteger senha:", erroHash);
      res.status(500).json({ erro: "Erro ao proteger senha!" });
    });
  });
});

// ========================
// BUSCAR PERFIL DO TUTOR
// ========================

app.get("/tutor/:email", (req, res) => {
  const { email } = req.params;

  const sql = "SELECT * FROM tutor WHERE email = ?";

  db.query(sql, [email], (err, result) => {
    if (err || result.length === 0) {
      return res.status(404).json({ erro: "Tutor não encontrado!" });
    }
    res.json(abrirTutorDoBanco(result[0]));
  });
});

app.get("/cep/:cep", async (req, res) => {
  try {
    const dadosCep = await buscarDadosPorCep(req.params.cep);
    res.json(dadosCep);
  } catch (err) {
    res.status(400).json({ erro: err.message || "Erro ao buscar CEP" });
  }
});

app.post("/coordenadas-cep", async (req, res) => {
  try {
    const { cep, endereco, bairro, cidade, uf } = req.body;
    const coordenadas = await buscarCoordenadasPorCep(cep, { endereco, bairro, cidade, uf });
    res.json(coordenadas);
  } catch (err) {
    res.status(400).json({ erro: err.message || "Erro ao buscar coordenadas" });
  }
});

// ========================
// SALVAR / ATUALIZAR TUTOR
// ========================

app.post("/tutor", (req, res) => {
  const { nome, cpf, telefone, email, endereco, bairro, cep, latitude, longitude } = req.body;
  const tutorProtegido = protegerTutorParaBanco({
    nome,
    cpf,
    telefone,
    endereco,
    bairro,
    cep,
    latitude: latitude ?? null,
    longitude: longitude ?? null
  });

  const sqlCheck = "SELECT * FROM tutor WHERE email = ?";

  db.query(sqlCheck, [email], (err, result) => {
    if (err) {
      return res.status(500).json({ erro: "Erro ao verificar tutor!" });
    }

    if (result.length > 0) {
      // atualiza se já existe
      const sqlUpdate = `
        UPDATE tutor 
        SET nome=?, cpf=?, cpf_hash=?, telefone=?, endereco=?, bairro=?, cep=?, latitude=?, longitude=?
        WHERE email=?
      `;
      db.query(sqlUpdate, [
        tutorProtegido.nome,
        tutorProtegido.cpf,
        tutorProtegido.cpf_hash,
        tutorProtegido.telefone,
        tutorProtegido.endereco,
        tutorProtegido.bairro,
        tutorProtegido.cep,
        tutorProtegido.latitude,
        tutorProtegido.longitude,
        email
      ], (err) => {
        if (err && err.code === "ER_DUP_ENTRY") {
          return res.status(400).json({ erro: "CPF ja cadastrado!" });
        }
        if (err) return res.status(500).json({ erro: "Erro ao atualizar tutor!" });
        res.json({ mensagem: "Perfil atualizado!" });
      });
    } else {
      // insere novo
      const sqlInsert = `
        INSERT INTO tutor (nome, cpf, cpf_hash, telefone, email, endereco, bairro, cep, latitude, longitude)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      db.query(sqlInsert, [
        tutorProtegido.nome,
        tutorProtegido.cpf,
        tutorProtegido.cpf_hash,
        tutorProtegido.telefone,
        email,
        tutorProtegido.endereco,
        tutorProtegido.bairro,
        tutorProtegido.cep,
        tutorProtegido.latitude,
        tutorProtegido.longitude
      ], (err, result) => {
        if (err && err.code === "ER_DUP_ENTRY") {
          return res.status(400).json({ erro: "CPF ja cadastrado!" });
        }
        if (err) return res.status(500).json({ erro: "Erro ao salvar tutor!" });
        res.json({ mensagem: "Tutor salvo!", id_tutor: result.insertId });
      });
    }
  });
});

app.get("/area-segura/:email", (req, res) => {
  const { email } = req.params;

  const sql = "SELECT latitude, longitude FROM tutor WHERE email = ?";

  db.query(sql, [email], (err, result) => {
    if (err) {
      return res.status(500).json({ erro: "Erro ao buscar area segura" });
    }

    if (result.length === 0) {
      return res.status(404).json({ erro: "Area segura nao cadastrada" });
    }

    const tutor = abrirTutorDoBanco(result[0]);
    const latitude = Number(tutor.latitude);
    const longitude = Number(tutor.longitude);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return res.status(404).json({ erro: "Area segura nao cadastrada" });
    }

    res.json({
      lat: latitude,
      lon: longitude,
      raio: 250
    });
  });
});

// ========================
// BUSCAR PETS DO TUTOR
// ========================

app.get("/pets-geral", (req, res) => {
  const sql = `
    SELECT
      pet.*,
      tutor.email AS email_tutor,
      tutor.nome AS nome_tutor,
      usuario.nome AS nome_usuario
    FROM pet
    INNER JOIN tutor ON pet.id_tutor = tutor.id_tutor
    LEFT JOIN usuario ON usuario.email = tutor.email
    ORDER BY pet.nome ASC
  `;

  db.query(sql, (err, result) => {
    if (err) {
      return res.status(500).json({ erro: "Erro ao buscar pets" });
    }

    res.json(result.map((pet) => ({
      ...pet,
      nome_tutor: descriptografarValor(pet.nome_tutor) || pet.nome_usuario || ""
    })));
  });
});

app.get("/pets/:email", (req, res) => {
  const { email } = req.params;

  const sql = `
    SELECT pet.*
    FROM pet
    INNER JOIN tutor ON pet.id_tutor = tutor.id_tutor
    WHERE tutor.email = ?
  `;

  db.query(sql, [email], (err, result) => {
    if (err) {
      return res.status(500).json({ erro: "Erro ao buscar pets" });
    }

    res.json(result);
  });
});

app.put("/pet/:id_pet/alerta", (req, res) => {
  const { id_pet } = req.params;
  const { perdido, email_tutor } = req.body;
  const novoStatus = perdido ? 1 : 0;

  const sql = `
    UPDATE pet
    INNER JOIN tutor ON pet.id_tutor = tutor.id_tutor
    SET pet.perdido = ?
    WHERE pet.id_pet = ? AND tutor.email = ?
  `;

  db.query(sql, [novoStatus, id_pet, email_tutor], (err, result) => {
    if (err) {
      return res.status(500).json({ erro: "Erro ao atualizar alerta do pet" });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ erro: "Pet nao encontrado para este tutor" });
    }

    res.json({
      mensagem: novoStatus ? "Pet marcado como perdido!" : "Pet voltou ao normal!",
      perdido: novoStatus
    });
  });
});

// ========================
// SALVAR PET
// ========================

app.post("/pet", (req, res) => {
  const { nome, especie, raca, sexo, data_nascimento, cor, peso, email_tutor } = req.body;

  const sqlTutor = "SELECT id_tutor FROM tutor WHERE email = ?";

  db.query(sqlTutor, [email_tutor], (err, result) => {
    if (err || result.length === 0) {
      return res.status(404).json({ erro: "Tutor não encontrado!" });
    }

    const id_tutor = result[0].id_tutor;

    const sqlPet = `
      INSERT INTO pet (nome, especie, raca, sexo, data_nascimento, cor, peso, id_tutor)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.query(sqlPet, [nome, especie, raca, sexo, data_nascimento, cor, peso, id_tutor], (err, result) => {
      if (err) return res.status(500).json({ erro: "Erro ao salvar pet!" });
      res.json({ mensagem: "Pet salvo!", id_pet: result.insertId });
    });
  });
});

// Upload da foto do pet
app.post("/upload-foto-pet", upload.single("foto"), (req, res) => {
  const { id_pet } = req.body;

  if (!req.file) {
    return res.status(400).json({ erro: "Nenhuma imagem enviada" });
  }

  const fotoPath = `/uploads/${req.file.filename}`;

  const sql = "UPDATE pet SET foto = ? WHERE id_pet = ?";

  db.query(sql, [fotoPath, id_pet], (err) => {
    if (err) {
      return res.status(500).json({ erro: "Erro ao salvar foto do pet" });
    }

    res.json({ mensagem: "Foto do pet salva!", foto: fotoPath });
  });
});

//FICHA TECNICA DO PET

app.get("/ficha-pet/:id_pet", (req, res) => {
  const { id_pet } = req.params;

  const sql = `
    SELECT 
      p.*,

      hc.doencas,
      hc.cirurgias,
      hc.alergias,
      hc.medicamentos,
      hc.vacinas,
      hc.vermifugacao,

      c.id_consulta,
      c.data_consulta,
      c.motivo,
      c.sintomas,

      e.estado_geral,
      e.mucosas,
      e.hidratacao,
      e.respiratorio,
      e.digestivo,
      e.locomotor,
      e.outros,

      t.diagnostico,
      t.exames,
      t.medicacao,
      t.dosagem,
      t.duracao,
      t.observacoes AS observacoes_tratamento

    FROM pet p
    LEFT JOIN historico_clinico hc ON hc.id_pet = p.id_pet
    LEFT JOIN consulta c ON c.id_pet = p.id_pet
    LEFT JOIN exame_clinico e ON e.id_consulta = c.id_consulta
    LEFT JOIN tratamento t ON t.id_consulta = c.id_consulta
    WHERE p.id_pet = ?
  `;

  db.query(sql, [id_pet], (err, result) => {
    if (err) {
      console.log("Erro ficha técnica:", err);
      return res.status(500).json({ erro: "Erro ao buscar ficha técnica" });
    }

    res.json(result);
  });
});

app.put("/editar-pet-completo/:id_pet", (req, res) => {
  const { id_pet } = req.params;

  const {
    nome, especie, raca, sexo, data_nascimento, cor, peso,
    doencas, cirurgias, alergias, medicamentos, vacinas, vermifugacao,
    motivo, sintomas,
    estado_geral, mucosas, hidratacao, respiratorio, digestivo, locomotor, outros,
    diagnostico, exames, medicacao, dosagem, duracao, observacoes_tratamento
  } = req.body;

  const sqlPet = `
    UPDATE pet SET nome=?, especie=?, raca=?, sexo=?, data_nascimento=?, cor=?, peso=?
    WHERE id_pet=?
  `;

  db.query(sqlPet, [nome, especie, raca, sexo, data_nascimento || null, cor, peso || null, id_pet], (err) => {
    if (err) return res.status(500).json({ erro: "Erro ao atualizar pet" });

    const sqlHistorico = `
      UPDATE historico_clinico
      SET doencas=?, cirurgias=?, alergias=?, medicamentos=?, vacinas=?, vermifugacao=?
      WHERE id_pet=?
    `;

    db.query(sqlHistorico, [doencas, cirurgias, alergias, medicamentos, vacinas, vermifugacao || null, id_pet], (err) => {
      if (err) return res.status(500).json({ erro: "Erro ao atualizar histórico clínico" });

      const sqlConsulta = `
        UPDATE consulta
        SET motivo=?, sintomas=?
        WHERE id_pet=?
      `;

      db.query(sqlConsulta, [motivo, sintomas, id_pet], (err) => {
        if (err) return res.status(500).json({ erro: "Erro ao atualizar consulta" });

        const sqlExame = `
          UPDATE exame_clinico e
          INNER JOIN consulta c ON e.id_consulta = c.id_consulta
          SET e.estado_geral=?, e.mucosas=?, e.hidratacao=?, e.respiratorio=?, 
              e.digestivo=?, e.locomotor=?, e.outros=?
          WHERE c.id_pet=?
        `;

        db.query(sqlExame, [estado_geral, mucosas, hidratacao, respiratorio, digestivo, locomotor, outros, id_pet], (err) => {
          if (err) return res.status(500).json({ erro: "Erro ao atualizar exame clínico" });

          const sqlTratamento = `
            UPDATE tratamento t
            INNER JOIN consulta c ON t.id_consulta = c.id_consulta
            SET t.diagnostico=?, t.exames=?, t.medicacao=?, t.dosagem=?, 
                t.duracao=?, t.observacoes=?
            WHERE c.id_pet=?
          `;

          db.query(sqlTratamento, [diagnostico, exames, medicacao, dosagem, duracao, observacoes_tratamento, id_pet], (err) => {
            if (err) return res.status(500).json({ erro: "Erro ao atualizar tratamento" });

            res.json({ mensagem: "Dados atualizados com sucesso!" });
          });
        });
      });
    });
  });
});

app.delete("/pet/:id_pet", (req, res) => {
  const { id_pet } = req.params;

  const comandos = [
    ["DELETE FROM retorno WHERE id_consulta IN (SELECT id_consulta FROM consulta WHERE id_pet = ?)", [id_pet]],
    ["DELETE FROM tratamento WHERE id_consulta IN (SELECT id_consulta FROM consulta WHERE id_pet = ?)", [id_pet]],
    ["DELETE FROM exame_clinico WHERE id_consulta IN (SELECT id_consulta FROM consulta WHERE id_pet = ?)", [id_pet]],
    ["DELETE FROM consulta WHERE id_pet = ?", [id_pet]],
    ["DELETE FROM historico_clinico WHERE id_pet = ?", [id_pet]],
    ["DELETE FROM pet WHERE id_pet = ?", [id_pet]],
  ];

  db.beginTransaction((err) => {
    if (err) {
      return res.status(500).json({ erro: "Erro ao iniciar exclusao do pet" });
    }

    function desfazer(erro) {
      db.rollback(() => {
        console.log("Erro ao deletar pet:", erro);
        res.status(500).json({ erro: "Erro ao deletar pet" });
      });
    }

    function executar(indice) {
      if (indice >= comandos.length) {
        return db.commit((err) => {
          if (err) return desfazer(err);
          res.json({ mensagem: "Pet deletado com sucesso!" });
        });
      }

      const [sql, valores] = comandos[indice];

      db.query(sql, valores, (err, result) => {
        if (err) return desfazer(err);

        if (indice === comandos.length - 1 && result.affectedRows === 0) {
          return db.rollback(() => {
            res.status(404).json({ erro: "Pet nao encontrado" });
          });
        }

        executar(indice + 1);
      });
    }

    executar(0);
  });
});

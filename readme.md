# 🐾 BuscaPet

Sistema de rastreamento de pets em tempo real usando:

- React
- Node.js
- Leaflet
- ESP32 + GPS COM CHIP

## 🚀 Como rodar

1 - Primeiro Jogue isso no terminal:

node server.js

2 - Coloque isso em outro Terminal:

 CD APP-PET
 
Em seguida:

 npm run dev -- --host
 
-Isso ira subir no seu IP e LocalHost o projeto!!.

3 - Ou apenas exeute o script python, BuscaPet_Start.exe

## Seguranca dos dados

- As configuracoes locais ficam no arquivo `.env` da raiz do projeto.
- Use `.env.example` como modelo se precisar recriar o `.env`.
- Ajuste no `.env` a porta do backend (`PORT`), porta do frontend (`FRONTEND_PORT`), banco MySQL (`DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`) e chave `TUTOR_DATA_KEY`.
- Senhas de usuario sao salvas com hash bcrypt.
- Dados sensiveis do tutor (nome, CPF, telefone, endereco, bairro, CEP e coordenadas da area segura) sao salvos no banco com AES-256-GCM.
- A chave `TUTOR_DATA_KEY` nao deve ser enviada para o GitHub. Se trocar essa chave depois de salvar dados criptografados, esses dados nao poderao ser abertos.
- O HTTPS/TLS e automatico ao usar `BuscaPet_Start-local.py`, `BuscaPet_Start.py` ou o `.exe`: o certificado local e criado em `backend/certs/`, as variaveis `SSL_KEY_PATH` e `SSL_CERT_PATH` sao configuradas pelos scripts e o navegador ja abre em `https://`.
- Se o certificado ainda nao for confiado pelo Windows, o script tenta adicionar no repositório de certificados confiaveis do usuario atual. Caso o navegador mostre aviso, basta continuar para o site local.

Para rodar:

```powershell
python .\BuscaPet_Start-local.py
```

## Rodar no celular com Expo

1 - Instale o app Expo Go no celular.

2 - Deixe computador e celular na mesma rede Wi-Fi.

3 - Rode na raiz do projeto:

```powershell
python .\BuscaPet_Start-mobile.py
```

O script sobe backend e frontend em HTTP pela rede local, abre o Expo e mostra um QR Code no terminal. Escaneie esse QR Code pelo Expo Go para entrar no BuscaPet pelo celular.

### Usar IP de VPN/Tailscale

Se quiser acessar pelo IP da VPN, coloque no `.env`:

```env
BUSCAPET_MOBILE_HOST=100.120.203.85
```

Depois rode normalmente:

```powershell
python .\BuscaPet_Start-mobile.py
```

O app vai abrir o BuscaPet em `http://100.120.203.85:3001` e o backend em `http://100.120.203.85:3000`.

Se estiver usando Expo Go fora da rede local, tambem pode abrir manualmente:

```text
exp://100.120.203.85:8081
```

### Rodar no celular fora da rede local

Use este modo quando o celular estiver no 4G/5G ou em outro Wi-Fi. Ele cria:

- um tunel publico para o backend Node;
- um tunel publico para o frontend Vite;
- o Expo em modo tunnel.

Rode na raiz do projeto:

```powershell
python .\BuscaPet_Start-mobile-online.py
```

O script mostra as URLs publicas do frontend e do backend e, em seguida, o QR Code do Expo. Deixe a janela aberta enquanto estiver usando o app. Na primeira execucao, o `npx` pode baixar o `cloudflared`, que e usado para criar os tuneis temporarios do Cloudflare.

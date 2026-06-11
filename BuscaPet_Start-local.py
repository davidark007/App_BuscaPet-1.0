import subprocess
import socket
import time
import webbrowser
import os

backend = r"\PASTA DAVI - 2 MODULO\App BuscaPet\backend"
frontend = r"\PASTA DAVI - 2 MODULO\App BuscaPet\APP-PET"
base_dir = os.path.dirname(os.path.abspath(__file__))

def carregar_env(arquivo):
    variaveis = {}

    if not os.path.exists(arquivo):
        return variaveis

    with open(arquivo, "r", encoding="utf-8") as env_file:
        for linha in env_file:
            linha = linha.strip()

            if not linha or linha.startswith("#") or "=" not in linha:
                continue

            chave, valor = linha.split("=", 1)
            variaveis[chave.strip()] = valor.strip().strip('"').strip("'")

    return variaveis

hostname = socket.gethostname()
ip = socket.gethostbyname(hostname)

def garantir_https_local():
    cert_dir = os.path.join(backend, "certs")
    key_path = os.path.join(cert_dir, "buscapet-local-key.pem")
    cert_path = os.path.join(cert_dir, "buscapet-local-cert.pem")

    try:
        subprocess.run(
            ["node", "ensure-local-cert.js", ip, hostname],
            cwd=backend,
            check=True,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL
        )
    except Exception as erro:
        print(f"HTTPS automatico nao foi preparado: {erro}")

    return key_path, cert_path

ssl_key, ssl_cert = garantir_https_local()
env_app = os.environ.copy()
env_app.update(carregar_env(os.path.join(base_dir, ".env")))
if os.path.exists(ssl_key) and os.path.exists(ssl_cert):
    env_app["SSL_KEY_PATH"] = ssl_key
    env_app["SSL_CERT_PATH"] = ssl_cert

env_app["VITE_API_PORT"] = env_app.get("VITE_API_PORT") or env_app.get("PORT", "3000")
backend_port = int(env_app.get("PORT", "3000"))
frontend_port = int(env_app.get("FRONTEND_PORT", "3001"))
protocolo = "https" if os.path.exists(ssl_key) and os.path.exists(ssl_cert) else "http"

print(f"🚀 Iniciando sistema no IP: {ip}")

# 🔥 Mata processos antigos (ESSENCIAL)
import subprocess

def matar_porta(porta):
    try:
        # Pega o PID que está usando a porta
        resultado = subprocess.check_output(
            f'netstat -ano | findstr :{porta}',
            shell=True
        ).decode()

        linhas = resultado.strip().split("\n")

        for linha in linhas:
            if "LISTENING" in linha:
                partes = linha.split()
                pid = partes[-1]

                # Mata o processo pelo PID
                subprocess.run(
                    ["taskkill", "/PID", pid, "/F"],
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL
                )

                print(f"🔥 Processo na porta {porta} (PID {pid}) finalizado!")

    except subprocess.CalledProcessError:
        print(f"✅ Porta {porta} já está livre")

# chama a função

matar_porta(backend_port)
matar_porta(frontend_port)

# 🔹 BACKEND
subprocess.Popen(
    ["node", "server.js"],
    cwd=backend,
    env=env_app,
    creationflags=subprocess.CREATE_NO_WINDOW
)

time.sleep(3)

# 🔹 FRONTEND
subprocess.Popen(
    f"npm run dev -- --host --port {frontend_port}",
    cwd=frontend,
    shell=True,
    env=env_app,
    creationflags=subprocess.CREATE_NO_WINDOW
)

time.sleep(5)

# 🔹 ABRE NO NAVEGADOR
import subprocess

chrome_profile = os.path.join(
    os.environ.get("LOCALAPPDATA", os.getcwd()),
    "BuscaPetChromeProfile"
)
os.makedirs(chrome_profile, exist_ok=True)

subprocess.Popen([
    r"C:\Program Files\Google\Chrome\Application\chrome.exe",
    f"--user-data-dir={chrome_profile}",
    "--new-window",
    "--no-first-run",
    "--start-fullscreen",
    f"{protocolo}://{ip}:{frontend_port}"
])

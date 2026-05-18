import os
import socket
import subprocess
import time

base_dir = os.path.dirname(os.path.abspath(__file__))
backend = os.path.join(base_dir, "backend")
frontend = os.path.join(base_dir, "APP-PET")
mobile = os.path.join(base_dir, "APP-PET-MOBILE")


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


def descobrir_ip_lan():
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as sock:
            sock.connect(("8.8.8.8", 80))
            return sock.getsockname()[0]
    except OSError:
        return socket.gethostbyname(socket.gethostname())


def listar_ips_locais():
    ips = set()

    try:
        nome_host = socket.gethostname()
        for info in socket.getaddrinfo(nome_host, None, socket.AF_INET):
            ips.add(info[4][0])
    except OSError:
        pass

    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as sock:
            sock.connect(("8.8.8.8", 80))
            ips.add(sock.getsockname()[0])
    except OSError:
        pass

    return ips


def matar_porta(porta):
    try:
        resultado = subprocess.check_output(
            f"netstat -ano | findstr :{porta}",
            shell=True
        ).decode()

        for linha in resultado.strip().split("\n"):
            if "LISTENING" in linha:
                pid = linha.split()[-1]
                subprocess.run(
                    ["taskkill", "/PID", pid, "/F"],
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL
                )
                print(f"Porta {porta} liberada (PID {pid}).")
    except subprocess.CalledProcessError:
        print(f"Porta {porta} ja esta livre.")


def garantir_dependencias(pasta):
    if os.path.exists(os.path.join(pasta, "node_modules")):
        return

    print(f"Instalando dependencias em {pasta}...")
    subprocess.run(["npm", "install"], cwd=pasta, check=True)


env_app = os.environ.copy()
env_app.update(carregar_env(os.path.join(base_dir, ".env")))
env_app["BUSCAPET_DISABLE_HTTPS"] = "1"
env_app["VITE_API_PORT"] = env_app.get("VITE_API_PORT") or env_app.get("PORT", "3000")

backend_port = int(env_app.get("PORT", "3000"))
frontend_port = int(env_app.get("FRONTEND_PORT", "3001"))
ip_lan = descobrir_ip_lan()
host_publico = (env_app.get("BUSCAPET_MOBILE_HOST") or ip_lan).strip()
mobile_url = f"http://{host_publico}:{frontend_port}"

env_mobile = env_app.copy()
env_mobile["EXPO_PUBLIC_BUSCAPET_URL"] = mobile_url
env_mobile["EXPO_PUBLIC_BUSCAPET_API_PORT"] = str(backend_port)
env_mobile["REACT_NATIVE_PACKAGER_HOSTNAME"] = host_publico

print(f"Iniciando BuscaPet para celular em: {mobile_url}")
if host_publico != ip_lan and host_publico not in listar_ips_locais():
    print(f"Aviso: o IP {host_publico} nao apareceu nas interfaces locais agora.")
    print("Confira se a VPN esta conectada antes de escanear o QR Code.")
print("Use o Expo Go no celular e escaneie o QR Code que vai abrir no terminal.")

garantir_dependencias(frontend)
garantir_dependencias(mobile)

matar_porta(backend_port)
matar_porta(frontend_port)
matar_porta(8081)

subprocess.Popen(
    ["node", "server.js"],
    cwd=backend,
    env=env_app,
    creationflags=subprocess.CREATE_NO_WINDOW
)

time.sleep(3)

subprocess.Popen(
    f"npm run dev -- --host 0.0.0.0 --port {frontend_port}",
    cwd=frontend,
    shell=True,
    env=env_app,
    creationflags=subprocess.CREATE_NO_WINDOW
)

time.sleep(5)

subprocess.Popen(
    "cmd /k npm run start",
    cwd=mobile,
    shell=True,
    env=env_mobile
)

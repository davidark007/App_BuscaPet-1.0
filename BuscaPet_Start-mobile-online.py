import os
import queue
import re
import shutil
import signal
import subprocess
import sys
import threading
import time

base_dir = os.path.dirname(os.path.abspath(__file__))
backend = os.path.join(base_dir, "backend")
frontend = os.path.join(base_dir, "APP-PET")
mobile = os.path.join(base_dir, "APP-PET-MOBILE")

TUNNEL_URL_RE = re.compile(r"https://[-a-zA-Z0-9.]+\.trycloudflare\.com")


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


def comando_cloudflared():
    instalado = shutil.which("cloudflared")

    if instalado:
        return [instalado]

    if shutil.which("npx"):
        return ["npx", "--yes", "cloudflared"]

    raise RuntimeError("Instale Node.js/npm ou cloudflared para criar os tuneis publicos.")


def iniciar_processo(nome, comando, cwd, env=None, shell=False):
    print(f"Iniciando {nome}...")
    processo = subprocess.Popen(
        comando,
        cwd=cwd,
        env=env,
        shell=shell,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        stdin=subprocess.DEVNULL,
        text=True,
        bufsize=1,
        creationflags=subprocess.CREATE_NEW_PROCESS_GROUP if os.name == "nt" else 0
    )

    return processo


def acompanhar_saida(processo, nome, fila=None):
    def ler_saida():
        for linha in processo.stdout:
            texto = linha.rstrip()

            if texto:
                print(f"[{nome}] {texto}")

            if fila is not None:
                fila.put(texto)

    thread = threading.Thread(target=ler_saida, daemon=True)
    thread.start()
    return thread


def aguardar_tunel(processo, nome, fila, timeout=90):
    inicio = time.time()

    while time.time() - inicio < timeout:
        if processo.poll() is not None:
            raise RuntimeError(f"O tunel {nome} encerrou antes de gerar uma URL publica.")

        try:
            linha = fila.get(timeout=1)
        except queue.Empty:
            continue

        match = TUNNEL_URL_RE.search(linha or "")

        if match:
            return match.group(0).rstrip("/")

    raise RuntimeError(f"Tempo esgotado aguardando URL publica do tunel {nome}.")


def iniciar_tunel(nome, porta):
    fila = queue.Queue()
    comando = comando_cloudflared() + [
        "tunnel",
        "--url",
        f"http://localhost:{porta}"
    ]
    processo = iniciar_processo(f"tunel {nome}", comando, base_dir)
    acompanhar_saida(processo, f"tunel-{nome}", fila)
    url = aguardar_tunel(processo, nome, fila)
    print(f"URL publica do {nome}: {url}")
    return processo, url


def encerrar_processos(processos):
    for processo in reversed(processos):
        if processo.poll() is not None:
            continue

        try:
            processo.send_signal(signal.CTRL_BREAK_EVENT if os.name == "nt" else signal.SIGTERM)
        except Exception:
            processo.terminate()


env_app = os.environ.copy()
env_app.update(carregar_env(os.path.join(base_dir, ".env")))
env_app["BUSCAPET_DISABLE_HTTPS"] = "1"
env_app["VITE_API_PORT"] = env_app.get("VITE_API_PORT") or env_app.get("PORT", "3000")
env_app["EXPO_NO_TELEMETRY"] = "1"

backend_port = int(env_app.get("PORT", "3000"))
frontend_port = int(env_app.get("FRONTEND_PORT", "3001"))
processos = []
exit_code = 0

try:
    print("Iniciando BuscaPet para celular fora da rede local.")
    print("Este modo usa Cloudflare Tunnel para backend e frontend, e Expo em modo tunnel.")

    garantir_dependencias(frontend)
    garantir_dependencias(mobile)

    matar_porta(backend_port)
    matar_porta(frontend_port)
    matar_porta(8081)

    backend_proc = iniciar_processo(
        "backend Node",
        ["node", "server.js"],
        backend,
        env_app
    )
    processos.append(backend_proc)
    acompanhar_saida(backend_proc, "backend")

    time.sleep(3)

    backend_tunnel_proc, backend_public_url = iniciar_tunel("backend", backend_port)
    processos.append(backend_tunnel_proc)

    env_frontend = env_app.copy()
    env_frontend["VITE_API_BASE_URL"] = backend_public_url

    frontend_proc = iniciar_processo(
        "frontend Vite",
        f"npm run dev -- --host 0.0.0.0 --port {frontend_port}",
        frontend,
        env_frontend,
        shell=True
    )
    processos.append(frontend_proc)
    acompanhar_saida(frontend_proc, "frontend")

    time.sleep(5)

    frontend_tunnel_proc, frontend_public_url = iniciar_tunel("frontend", frontend_port)
    processos.append(frontend_tunnel_proc)

    env_mobile = env_app.copy()
    env_mobile["EXPO_PUBLIC_BUSCAPET_URL"] = frontend_public_url
    env_mobile["EXPO_PUBLIC_BUSCAPET_API_URL"] = backend_public_url
    env_mobile["EXPO_PUBLIC_BUSCAPET_API_PORT"] = str(backend_port)

    print("")
    print("URLs publicas prontas:")
    print(f"Frontend: {frontend_public_url}")
    print(f"Backend:  {backend_public_url}")
    print("")
    print("O Expo Go vai abrir em modo tunnel. Escaneie o QR Code exibido abaixo.")
    print("Deixe esta janela aberta enquanto estiver usando o app.")

    expo_proc = iniciar_processo(
        "Expo tunnel",
        ["npm", "run", "start:tunnel"],
        mobile,
        env_mobile
    )
    processos.append(expo_proc)
    acompanhar_saida(expo_proc, "expo")

    while any(processo.poll() is None for processo in processos):
        time.sleep(1)
except KeyboardInterrupt:
    print("\nEncerrando BuscaPet online...")
except Exception as erro:
    print(f"\nErro ao iniciar BuscaPet online: {erro}")
    exit_code = 1
finally:
    encerrar_processos(processos)

if exit_code:
    sys.exit(exit_code)

/* global L */

let map;
let marcadorPet;
let marcadorUsuario;
let trilhaUsuarioPet;

let alertaAtivo = false;
let bateriaBaixaAvisada = false;
let rotaEmAndamento = false;
let ultimaChaveRota = "";
let ultimoSinalGPS = Date.now();
let ultimaPosicaoPet = null;
let ultimaPosicaoUsuario = null;
let watchGeolocalizacaoWeb = null;

const API_BASE = window.BUSCAPET_API_BASE_URL ||
    localStorage.getItem("BUSCAPET_API_BASE_URL") ||
    `${window.location.protocol}//${window.location.hostname}:${window.BUSCAPET_API_PORT || "3000"}`;

const notificacoesDisponiveis = window.isSecureContext && "Notification" in window;
const serviceWorkerDisponivel = "serviceWorker" in navigator;

let areaSegura = {
    lat: -21.1775,
    lon: -47.8103,
    raio: 250
};

async function buscarAreaSegura() {
    const email = localStorage.getItem("email");

    if (!email) return;

    try {
        const res = await fetch(`${API_BASE}/area-segura/${encodeURIComponent(email)}`);
        const data = await res.json();

        if (res.ok) {
            areaSegura = data;
        }
    } catch (erro) {
        console.log("Erro ao buscar area segura:", erro);
    }
}

if (notificacoesDisponiveis && Notification.permission !== "granted") {
    Notification.requestPermission();
}

function mostrarErroMapa(mensagem) {
    const splash = document.getElementById("splash");
    const gpsStatus = document.getElementById("gpsStatus");

    if (splash) {
        splash.style.display = "flex";
        splash.textContent = mensagem;
    }

    if (gpsStatus) {
        gpsStatus.innerText = "GPS: Offline";
        gpsStatus.style.color = "red";
    }
}

function atualizarRotaStatus(mensagem) {
    const rotaStatus = document.getElementById("rotaStatus");

    if (rotaStatus) {
        rotaStatus.innerText = mensagem;
    }
}

function obterLocalizacaoDaPaginaPrincipal() {
    try {
        if (window.parent && window.parent !== window && window.parent.__BUSCAPET_USER_LOCATION__) {
            return window.parent.__BUSCAPET_USER_LOCATION__;
        }
    } catch (erro) {
        console.log("Nao foi possivel ler o GPS da pagina principal:", erro);
    }

    return null;
}

function avisarMapaPronto() {
    try {
        if (window.parent && window.parent !== window) {
            window.parent.postMessage({ type: "buscapet:map-ready" }, "*");
        }
    } catch (erro) {
        console.log("Nao foi possivel avisar que o mapa carregou:", erro);
    }
}

function coordenadaValida(lat, lon) {
    return Number.isFinite(lat) && Number.isFinite(lon);
}

function formatarDistancia(metros) {
    if (!Number.isFinite(metros)) {
        return "--";
    }

    if (metros < 1000) {
        return `${Math.round(metros)} m`;
    }

    return `${(metros / 1000).toFixed(1).replace(".", ",")} km`;
}

function formatarTempo(segundos) {
    if (!Number.isFinite(segundos)) {
        return "";
    }

    const minutos = Math.max(1, Math.round(segundos / 60));

    if (minutos < 60) {
        return `${minutos} min`;
    }

    const horas = Math.floor(minutos / 60);
    const resto = minutos % 60;

    return resto ? `${horas}h ${resto}min` : `${horas}h`;
}

function desenharTrilha(pontos, resumo) {
    if (!map || !pontos.length) {
        return;
    }

    if (trilhaUsuarioPet) {
        trilhaUsuarioPet.setLatLngs(pontos);
    } else {
        trilhaUsuarioPet = L.polyline(pontos, {
            color: "#f2b84b",
            weight: 6,
            opacity: 0.95,
            lineCap: "round",
            lineJoin: "round"
        }).addTo(map);
    }

    if (resumo) {
        trilhaUsuarioPet.bindPopup(resumo);
    }
}

async function buscarRotaPorRuas(origem, destino) {
    const url = [
        "https://router.project-osrm.org/route/v1/driving/",
        `${origem[1]},${origem[0]};${destino[1]},${destino[0]}`,
        "?overview=full&geometries=geojson&steps=false"
    ].join("");

    const resposta = await fetch(url);

    if (!resposta.ok) {
        throw new Error(`Erro OSRM ${resposta.status}`);
    }

    const dados = await resposta.json();
    const rota = dados.routes?.[0];
    const coordenadas = rota?.geometry?.coordinates || [];

    if (!coordenadas.length) {
        throw new Error("Rota vazia");
    }

    return {
        pontos: coordenadas.map(([lon, lat]) => [lat, lon]),
        distancia: rota.distance,
        duracao: rota.duration
    };
}

async function atualizarTrilhaUsuarioPet() {
    if (!map || !ultimaPosicaoUsuario || !ultimaPosicaoPet) {
        return;
    }

    const origem = [ultimaPosicaoUsuario.latitude, ultimaPosicaoUsuario.longitude];
    const destino = [ultimaPosicaoPet.latitude, ultimaPosicaoPet.longitude];

    desenharTrilha([origem, destino], "Trilha estimada ate o pet");

    const distanciaReta = map.distance(origem, destino);
    atualizarRotaStatus(`Trilha: ${formatarDistancia(distanciaReta)} ate o pet`);

    const chaveRota = [
        ultimaPosicaoUsuario.latitude.toFixed(4),
        ultimaPosicaoUsuario.longitude.toFixed(4),
        ultimaPosicaoPet.latitude.toFixed(4),
        ultimaPosicaoPet.longitude.toFixed(4)
    ].join("|");

    if (rotaEmAndamento || chaveRota === ultimaChaveRota) {
        return;
    }

    rotaEmAndamento = true;
    ultimaChaveRota = chaveRota;

    try {
        const rota = await buscarRotaPorRuas(origem, destino);
        const tempo = formatarTempo(rota.duracao);
        const resumo = `Rota ate o pet: ${formatarDistancia(rota.distancia)}${tempo ? ` - ${tempo}` : ""}`;

        desenharTrilha(rota.pontos, resumo);
        atualizarRotaStatus(`Trilha: ${formatarDistancia(rota.distancia)}${tempo ? ` - ${tempo}` : ""}`);
    } catch (erro) {
        console.log("Erro ao buscar rota por ruas:", erro);
        desenharTrilha([origem, destino], "Trilha em linha reta ate o pet");
    } finally {
        rotaEmAndamento = false;
    }
}

function atualizarLocalizacaoUsuario(dados) {
    const lat = Number(dados?.latitude);
    const lon = Number(dados?.longitude);

    if (!coordenadaValida(lat, lon)) {
        return;
    }

    ultimaPosicaoUsuario = {
        latitude: lat,
        longitude: lon
    };

    const posicao = [lat, lon];

    if (!map) {
        return;
    }

    if (marcadorUsuario) {
        marcadorUsuario.setLatLng(posicao);
    } else {
        marcadorUsuario = L.circleMarker(posicao, {
            radius: 9,
            color: "#0f766e",
            fillColor: "#22c55e",
            fillOpacity: 0.95,
            weight: 3
        }).addTo(map);
        marcadorUsuario.bindPopup("Voce esta aqui");
    }

    if (!ultimaPosicaoPet) {
        atualizarRotaStatus("Trilha: GPS do celular recebido, aguardando pet");
    }

    atualizarTrilhaUsuarioPet();
}

function iniciarGeolocalizacaoWeb() {
    if (!navigator.geolocation || watchGeolocalizacaoWeb !== null) {
        return;
    }

    watchGeolocalizacaoWeb = navigator.geolocation.watchPosition(
        (posicao) => {
            atualizarLocalizacaoUsuario({
                latitude: posicao.coords.latitude,
                longitude: posicao.coords.longitude
            });
        },
        (erro) => {
            console.log("GPS do navegador indisponivel:", erro.message);
        },
        {
            enableHighAccuracy: true,
            maximumAge: 5000,
            timeout: 10000
        }
    );
}

window.addEventListener("buscapet:user-location", (event) => {
    atualizarLocalizacaoUsuario(event.detail);
});

window.addEventListener("message", (event) => {
    const dados = event.data;

    if (dados?.type === "buscapet:user-location") {
        atualizarLocalizacaoUsuario(dados.location);
    }
});

if (window.__BUSCAPET_USER_LOCATION__) {
    atualizarLocalizacaoUsuario(window.__BUSCAPET_USER_LOCATION__);
}

const localizacaoPaginaPrincipal = obterLocalizacaoDaPaginaPrincipal();

if (localizacaoPaginaPrincipal) {
    atualizarLocalizacaoUsuario(localizacaoPaginaPrincipal);
}

setTimeout(async () => {
    try {
        if (!window.L) {
            throw new Error("Nao foi possivel carregar a biblioteca do mapa. Recarregue o app.");
        }

        document.getElementById("splash").style.display = "none";
        document.getElementById("map").style.display = "block";

        await buscarAreaSegura();

        map = L.map("map").setView([areaSegura.lat, areaSegura.lon], 16);

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            maxZoom: 19
        }).addTo(map);

        L.circle([areaSegura.lat, areaSegura.lon], {
            radius: areaSegura.raio,
            color: "red"
        }).addTo(map);

        avisarMapaPronto();
        iniciarGeolocalizacaoWeb();

        if (window.__BUSCAPET_USER_LOCATION__) {
            atualizarLocalizacaoUsuario(window.__BUSCAPET_USER_LOCATION__);
        }

        const localizacaoPai = obterLocalizacaoDaPaginaPrincipal();

        if (localizacaoPai) {
            atualizarLocalizacaoUsuario(localizacaoPai);
        }

        buscarLocalizacao();

        if (!window.intervaloAtivo) {
            window.intervaloAtivo = true;
            setInterval(buscarLocalizacao, 5000);
        }
    } catch (erro) {
        console.log("Erro ao iniciar mapa:", erro);
        mostrarErroMapa(erro.message || "Nao foi possivel carregar o mapa.");
    }

}, 3001);

async function buscarLocalizacao() {
    try {
        const resposta = await fetch(`${API_BASE}/localizacao`);

        if (!resposta.ok) {
            throw new Error(`Erro HTTP ${resposta.status}`);
        }

        const dados = await resposta.json();
        ultimoSinalGPS = Date.now();

        const lat = Number(dados.latitude);
        const lon = Number(dados.longitude);
        const bateria = Number(dados.bateria);

        if (!coordenadaValida(lat, lon)) {
            throw new Error("Coordenada do pet invalida");
        }

        document.getElementById("bateria").innerText =
            `Bateria: ${Number.isFinite(bateria) ? bateria : "--"}%`;
        verificarBateria(bateria);

        document.getElementById("gpsStatus").innerText = "GPS do pet: Online";
        document.getElementById("gpsStatus").style.color = "green";

        const posicao = [lat, lon];
        ultimaPosicaoPet = {
            latitude: lat,
            longitude: lon
        };

        if (marcadorPet) {
            marcadorPet.setLatLng(posicao);
        } else {
            marcadorPet = L.marker(posicao).addTo(map);
            marcadorPet.bindPopup("Pet localizado").openPopup();
        }

        if (!ultimaPosicaoUsuario) {
            map.flyTo(posicao, 16);
            atualizarRotaStatus("Trilha: aguardando GPS do celular");
        } else {
            const limites = L.latLngBounds([
                [ultimaPosicaoUsuario.latitude, ultimaPosicaoUsuario.longitude],
                posicao
            ]).pad(0.25);

            map.fitBounds(limites, {
                maxZoom: 16,
                animate: true
            });
        }

        atualizarTrilhaUsuarioPet();
        verificarArea(lat, lon);
    } catch (erro) {
        console.log("Erro:", erro);
        document.getElementById("gpsStatus").innerText = "GPS do pet: Offline";
        document.getElementById("gpsStatus").style.color = "red";
    }
}

function verificarArea(lat, lon) {
    const distancia = map.distance(
        [lat, lon],
        [areaSegura.lat, areaSegura.lon]
    );

    if (distancia > areaSegura.raio) {
        if (!alertaAtivo) {
            alert("O PET SAIU DA AREA SEGURA!");
            enviarNotificacao();
            alertaAtivo = true;
        }
    } else {
        alertaAtivo = false;
    }
}

function verificarBateria(bateria) {
    if (bateria <= 20) {
        if (!bateriaBaixaAvisada) {
            alert("Bateria da coleira abaixo de 20%!");
            enviarNotificacaoBateria();
            bateriaBaixaAvisada = true;
        }
    } else {
        bateriaBaixaAvisada = false;
    }
}

function enviarNotificacaoBateria() {
    if (notificacoesDisponiveis && serviceWorkerDisponivel && Notification.permission === "granted") {
        navigator.serviceWorker.ready.then(reg => {
            reg.showNotification("Bateria baixa!", {
                body: "A bateria da coleira esta abaixo de 20%",
                icon: "icone-192.png",
                vibrate: [200, 100, 200],
                tag: "bateria-pet"
            });
        });
    }
}

function enviarNotificacao() {
    if (notificacoesDisponiveis && serviceWorkerDisponivel && Notification.permission === "granted") {
        navigator.serviceWorker.ready.then(reg => {
            reg.showNotification("Alerta do Pet!", {
                body: "Seu pet saiu da area segura!",
                icon: "icone-192.png",
                vibrate: [200, 100, 200],
                tag: "alerta-pet"
            });
        });
    }
}

setInterval(() => {
    const agora = Date.now();

    if (agora - ultimoSinalGPS > 15000) {
        document.getElementById("gpsStatus").innerText = "GPS do pet: Offline";
        document.getElementById("gpsStatus").style.color = "red";
    }
}, 5000);

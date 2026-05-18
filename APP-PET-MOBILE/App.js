import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import * as Location from "expo-location";
import MapView, { Circle, Marker, Polyline } from "react-native-maps";
import { WebView } from "react-native-webview";

const enderecoInicial = process.env.EXPO_PUBLIC_BUSCAPET_URL || "";
const apiBaseInicial = process.env.EXPO_PUBLIC_BUSCAPET_API_URL || "";
const apiPortaInicial = process.env.EXPO_PUBLIC_BUSCAPET_API_PORT || "3000";

const areaSeguraPadrao = {
  lat: -21.1775,
  lon: -47.8103,
  raio: 250
};

function normalizarEndereco(valor) {
  const texto = String(valor || "").trim();

  if (!texto) {
    return "";
  }

  return /^https?:\/\//i.test(texto) ? texto : `http://${texto}`;
}

function normalizarLocalizacao(localizacao) {
  if (!localizacao?.coords) {
    return null;
  }

  return {
    latitude: localizacao.coords.latitude,
    longitude: localizacao.coords.longitude,
    accuracy: localizacao.coords.accuracy,
    timestamp: localizacao.timestamp || Date.now()
  };
}

function obterApiBase(url) {
  if (apiBaseInicial) {
    return apiBaseInicial.replace(/\/+$/, "");
  }

  try {
    const enderecoUrl = new URL(normalizarEndereco(url));
    return `${enderecoUrl.protocol}//${enderecoUrl.hostname}:${apiPortaInicial}`;
  } catch {
    return "";
  }
}

function coordenadaValida(latitude, longitude) {
  return Number.isFinite(latitude) && Number.isFinite(longitude);
}

function criarRegiaoInicial(localizacaoUsuario, localizacaoPet, areaSegura) {
  const centro = localizacaoPet ||
    localizacaoUsuario ||
    { latitude: areaSegura.lat, longitude: areaSegura.lon };

  return {
    latitude: centro.latitude,
    longitude: centro.longitude,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01
  };
}

function calcularDistanciaMetros(origem, destino) {
  if (!origem || !destino) {
    return null;
  }

  const raioTerra = 6371000;
  const lat1 = origem.latitude * Math.PI / 180;
  const lat2 = destino.latitude * Math.PI / 180;
  const deltaLat = (destino.latitude - origem.latitude) * Math.PI / 180;
  const deltaLon = (destino.longitude - origem.longitude) * Math.PI / 180;
  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) *
    Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);

  return raioTerra * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
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

function criarScriptLocalizacao(localizacao) {
  const payload = JSON.stringify(localizacao);

  return `
    (function () {
      var localizacao = ${payload};
      window.__BUSCAPET_USER_LOCATION__ = localizacao;

      window.__BUSCAPET_SEND_USER_LOCATION__ = function () {
        var dados = window.__BUSCAPET_USER_LOCATION__;
        var mensagem = { type: "buscapet:user-location", location: dados };
        var iframes = document.querySelectorAll("iframe");

        window.dispatchEvent(new CustomEvent("buscapet:user-location", { detail: dados }));

        for (var i = 0; i < iframes.length; i += 1) {
          try {
            if (iframes[i].contentWindow) {
              iframes[i].contentWindow.postMessage(mensagem, "*");
            }
          } catch (erro) {}
        }
      };

      if (!window.__BUSCAPET_USER_LOCATION_LISTENER__) {
        window.__BUSCAPET_USER_LOCATION_LISTENER__ = true;
        window.addEventListener("message", function (event) {
          if (event.data && event.data.type === "buscapet:map-ready") {
            window.__BUSCAPET_SEND_USER_LOCATION__();
          }
        });
      }

      window.__BUSCAPET_SEND_USER_LOCATION__();
      setTimeout(window.__BUSCAPET_SEND_USER_LOCATION__, 500);
      setTimeout(window.__BUSCAPET_SEND_USER_LOCATION__, 1500);
      setTimeout(window.__BUSCAPET_SEND_USER_LOCATION__, 3000);
    })();
    true;
  `;
}

function NativePetMap({ apiBase, emailTutor, localizacaoUsuario, onClose, statusLocalizacao }) {
  const mapRef = useRef(null);
  const alertaAreaRef = useRef(false);
  const alertaBateriaRef = useRef(false);
  const mapaAjustadoInicialRef = useRef(false);
  const usuarioInteragiuMapaRef = useRef(false);
  const [areaSegura, setAreaSegura] = useState(areaSeguraPadrao);
  const [localizacaoPet, setLocalizacaoPet] = useState(null);
  const [bateria, setBateria] = useState(null);
  const [statusPet, setStatusPet] = useState("GPS do pet: procurando sinal");
  const [rota, setRota] = useState([]);

  useEffect(() => {
    let ativo = true;

    async function carregarAreaSegura() {
      if (!apiBase || !emailTutor) {
        return;
      }

      try {
        const resposta = await fetch(`${apiBase}/area-segura/${encodeURIComponent(emailTutor)}`);
        const dados = await resposta.json();

        if (ativo && resposta.ok && coordenadaValida(Number(dados.lat), Number(dados.lon))) {
          setAreaSegura({
            lat: Number(dados.lat),
            lon: Number(dados.lon),
            raio: Number(dados.raio) || areaSeguraPadrao.raio
          });
        }
      } catch {
        if (ativo) {
          setAreaSegura(areaSeguraPadrao);
        }
      }
    }

    carregarAreaSegura();

    return () => {
      ativo = false;
    };
  }, [apiBase, emailTutor]);

  useEffect(() => {
    let ativo = true;
    let intervalo = null;

    async function buscarLocalizacaoPet() {
      if (!apiBase) {
        setStatusPet("GPS do pet: servidor nao configurado");
        return;
      }

      try {
        const resposta = await fetch(`${apiBase}/localizacao`);
        const dados = await resposta.json();
        const latitude = Number(dados.latitude);
        const longitude = Number(dados.longitude);
        const bateriaAtual = Number(dados.bateria);

        if (!resposta.ok || !coordenadaValida(latitude, longitude)) {
          throw new Error("Localizacao invalida");
        }

        if (!ativo) {
          return;
        }

        const novaLocalizacaoPet = { latitude, longitude };
        setLocalizacaoPet(novaLocalizacaoPet);
        setBateria(Number.isFinite(bateriaAtual) ? bateriaAtual : null);
        setStatusPet("GPS do pet: online");

        const distanciaArea = calcularDistanciaMetros(novaLocalizacaoPet, {
          latitude: areaSegura.lat,
          longitude: areaSegura.lon
        });

        if (Number.isFinite(distanciaArea) && distanciaArea > areaSegura.raio) {
          if (!alertaAreaRef.current) {
            Alert.alert("Alerta do Pet", "O pet saiu da area segura!");
            alertaAreaRef.current = true;
          }
        } else {
          alertaAreaRef.current = false;
        }

        if (Number.isFinite(bateriaAtual) && bateriaAtual <= 20) {
          if (!alertaBateriaRef.current) {
            Alert.alert("Bateria baixa", "A bateria da coleira esta abaixo de 20%.");
            alertaBateriaRef.current = true;
          }
        } else {
          alertaBateriaRef.current = false;
        }
      } catch {
        if (ativo) {
          setStatusPet("GPS do pet: offline");
        }
      }
    }

    buscarLocalizacaoPet();
    intervalo = setInterval(buscarLocalizacaoPet, 5000);

    return () => {
      ativo = false;
      clearInterval(intervalo);
    };
  }, [apiBase, areaSegura.lat, areaSegura.lon, areaSegura.raio]);

  useEffect(() => {
    let ativo = true;

    async function buscarRota() {
      if (!localizacaoUsuario || !localizacaoPet) {
        setRota([]);
        return;
      }

      const origem = localizacaoUsuario;
      const destino = localizacaoPet;

      try {
        const resposta = await fetch(
          [
            "https://router.project-osrm.org/route/v1/driving/",
            `${origem.longitude},${origem.latitude};${destino.longitude},${destino.latitude}`,
            "?overview=full&geometries=geojson&steps=false"
          ].join("")
        );
        const dados = await resposta.json();
        const coordenadas = dados.routes?.[0]?.geometry?.coordinates || [];

        if (!resposta.ok || !coordenadas.length) {
          throw new Error("Rota vazia");
        }

        if (ativo) {
          setRota(coordenadas.map(([longitude, latitude]) => ({ latitude, longitude })));
        }
      } catch {
        if (ativo) {
          setRota([origem, destino]);
        }
      }
    }

    buscarRota();

    return () => {
      ativo = false;
    };
  }, [localizacaoUsuario, localizacaoPet]);

  useEffect(() => {
    const pontos = [localizacaoUsuario, localizacaoPet].filter(Boolean);

    if (
      mapaAjustadoInicialRef.current ||
      usuarioInteragiuMapaRef.current ||
      !mapRef.current ||
      !localizacaoPet
    ) {
      return;
    }

    mapaAjustadoInicialRef.current = true;

    if (pontos.length > 1) {
      mapRef.current.fitToCoordinates(pontos, {
        edgePadding: { top: 90, right: 50, bottom: 170, left: 50 },
        animated: true
      });
      return;
    }

    mapRef.current.animateToRegion({
      latitude: pontos[0].latitude,
      longitude: pontos[0].longitude,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01
    }, 500);
  }, [localizacaoUsuario, localizacaoPet]);

  const distanciaPet = calcularDistanciaMetros(localizacaoUsuario, localizacaoPet);
  const regiaoInicial = criarRegiaoInicial(localizacaoUsuario, localizacaoPet, areaSegura);
  const pontosRota = rota.length ? rota : [localizacaoUsuario, localizacaoPet].filter(Boolean);

  return (
    <View style={styles.nativeMapScreen}>
      <View style={styles.nativeMapTopbar}>
        <View style={styles.nativeMapTopbarText}>
          <Text style={styles.nativeMapTitle}>Mapa em tempo real</Text>
          <Text style={styles.nativeMapSubtitle} numberOfLines={1}>
            {statusPet} | {statusLocalizacao}
          </Text>
        </View>
        <Pressable style={styles.nativeMapBackButton} onPress={onClose}>
          <Text style={styles.nativeMapBackButtonText}>Voltar</Text>
        </Pressable>
      </View>

      <MapView
        ref={mapRef}
        style={styles.nativeMap}
        initialRegion={regiaoInicial}
        onPanDrag={() => {
          usuarioInteragiuMapaRef.current = true;
        }}
        pitchEnabled
        rotateEnabled
        scrollEnabled
        showsUserLocation
        showsMyLocationButton
        zoomEnabled
      >
        <Circle
          center={{ latitude: areaSegura.lat, longitude: areaSegura.lon }}
          radius={areaSegura.raio}
          strokeColor="#dc2626"
          fillColor="rgba(220, 38, 38, 0.12)"
          strokeWidth={2}
        />

        {localizacaoPet ? (
          <Marker
            coordinate={localizacaoPet}
            description={bateria === null ? "Bateria indisponivel" : `Bateria: ${bateria}%`}
            pinColor="#f2b84b"
            title="Pet localizado"
          />
        ) : null}

        {localizacaoUsuario ? (
          <Marker
            coordinate={localizacaoUsuario}
            description="GPS do celular"
            pinColor="#0f766e"
            title="Voce esta aqui"
          />
        ) : null}

        {pontosRota.length > 1 ? (
          <Polyline
            coordinates={pontosRota}
            strokeColor="#f2b84b"
            strokeWidth={5}
          />
        ) : null}
      </MapView>

      <View style={styles.nativeMapStatusCard}>
        <Text style={styles.nativeMapStatusText}>
          Trilha: {localizacaoUsuario && localizacaoPet ? formatarDistancia(distanciaPet) : "aguardando GPS"}
        </Text>
        <Text style={styles.nativeMapStatusText}>
          Bateria: {bateria === null ? "--" : `${bateria}%`}
        </Text>
      </View>
    </View>
  );
}

export default function App() {
  const webviewRef = useRef(null);
  const [endereco, setEndereco] = useState(enderecoInicial);
  const [enderecoDigitado, setEnderecoDigitado] = useState(enderecoInicial);
  const [erro, setErro] = useState("");
  const [exibindoMapaNativo, setExibindoMapaNativo] = useState(false);
  const [emailTutor, setEmailTutor] = useState("");
  const [localizacaoUsuario, setLocalizacaoUsuario] = useState(null);
  const [statusLocalizacao, setStatusLocalizacao] = useState("GPS do celular: aguardando permissao");
  const [webviewPronta, setWebviewPronta] = useState(false);

  const url = useMemo(() => normalizarEndereco(endereco), [endereco]);
  const apiBase = useMemo(() => obterApiBase(url), [url]);

  useEffect(() => {
    let ativo = true;
    let inscricaoLocalizacao = null;

    async function iniciarLocalizacao() {
      try {
        const permissao = await Location.requestForegroundPermissionsAsync();

        if (permissao.status !== "granted") {
          if (ativo) {
            setStatusLocalizacao("GPS do celular: permissao negada");
          }
          return;
        }

        if (ativo) {
          setStatusLocalizacao("GPS do celular: procurando sinal");
        }

        const atual = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High
        });
        const posicaoAtual = normalizarLocalizacao(atual);

        if (ativo && posicaoAtual) {
          setLocalizacaoUsuario(posicaoAtual);
          setStatusLocalizacao("GPS do celular: online");
        }

        inscricaoLocalizacao = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            distanceInterval: 5,
            timeInterval: 3000
          },
          (novaLocalizacao) => {
            const posicao = normalizarLocalizacao(novaLocalizacao);

            if (ativo && posicao) {
              setLocalizacaoUsuario(posicao);
              setStatusLocalizacao("GPS do celular: online");
            }
          }
        );
      } catch {
        if (ativo) {
          setStatusLocalizacao("GPS do celular: indisponivel");
        }
      }
    }

    iniciarLocalizacao();

    return () => {
      ativo = false;
      inscricaoLocalizacao?.remove();
    };
  }, []);

  useEffect(() => {
    if (!webviewPronta || !localizacaoUsuario) {
      return;
    }

    webviewRef.current?.injectJavaScript(criarScriptLocalizacao(localizacaoUsuario));
  }, [localizacaoUsuario, webviewPronta]);

  const abrirEndereco = () => {
    setErro("");
    setExibindoMapaNativo(false);
    setWebviewPronta(false);
    setEndereco(enderecoDigitado);
  };

  const recarregar = () => {
    setErro("");
    setExibindoMapaNativo(false);
    setWebviewPronta(false);
    webviewRef.current?.reload();
  };

  const trocarEndereco = () => {
    setEnderecoDigitado(url);
    setEndereco("");
    setErro("");
    setExibindoMapaNativo(false);
    setWebviewPronta(false);
  };

  const receberMensagemWeb = (event) => {
    try {
      const mensagem = JSON.parse(event.nativeEvent.data);

      if (mensagem?.type === "buscapet:open-native-map") {
        setEmailTutor(String(mensagem.email || ""));
        setErro("");
        setExibindoMapaNativo(true);
      }
    } catch {
      // Messages from the WebView can be plain strings from browser tooling.
    }
  };

  const fecharMapaNativo = () => {
    setExibindoMapaNativo(false);
    webviewRef.current?.injectJavaScript(`
      if (window.__BUSCAPET_SET_PAGE__) {
        window.__BUSCAPET_SET_PAGE__("home");
      }
      true;
    `);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#12221f" />
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title}>BuscaPet</Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {url || "Informe o endereco do sistema"}
          </Text>
          <Text style={styles.locationStatus} numberOfLines={1}>
            {statusLocalizacao}
          </Text>
        </View>
        {url && !exibindoMapaNativo ? (
          <View style={styles.headerActions}>
            <Pressable style={styles.headerButton} onPress={trocarEndereco}>
              <Text style={styles.headerButtonText}>Trocar</Text>
            </Pressable>
            <Pressable style={styles.headerButton} onPress={recarregar}>
              <Text style={styles.headerButtonText}>Recarregar</Text>
            </Pressable>
          </View>
        ) : null}
      </View>

      {!url ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Conectar ao BuscaPet</Text>
          <TextInput
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            onChangeText={setEnderecoDigitado}
            onSubmitEditing={abrirEndereco}
            placeholder="http://192.168.0.10:3001"
            placeholderTextColor="#7d8a86"
            style={styles.input}
            value={enderecoDigitado}
          />
          <Pressable style={styles.primaryButton} onPress={abrirEndereco}>
            <Text style={styles.primaryButtonText}>Entrar</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.content}>
          <WebView
            ref={webviewRef}
            source={{ uri: url }}
            style={styles.webview}
            originWhitelist={["http://*", "https://*"]}
            javaScriptEnabled
            domStorageEnabled
            mixedContentMode="always"
            thirdPartyCookiesEnabled
            cacheEnabled
            sharedCookiesEnabled
            setSupportMultipleWindows={false}
            allowsInlineMediaPlayback
            mediaPlaybackRequiresUserAction={false}
            allowsBackForwardNavigationGestures
            geolocationEnabled
            onMessage={receberMensagemWeb}
            onLoadStart={() => {
              setErro("");
              setWebviewPronta(false);
            }}
            onLoadEnd={() => setWebviewPronta(true)}
            onError={(event) => {
              setWebviewPronta(false);
              setErro(event.nativeEvent.description);
            }}
            onHttpError={(event) => {
              setWebviewPronta(false);
              setErro(`HTTP ${event.nativeEvent.statusCode}`);
            }}
            renderLoading={() => (
              <View style={styles.loading}>
                <ActivityIndicator color="#f2b84b" size="large" />
              </View>
            )}
            startInLoadingState
          />

          {exibindoMapaNativo ? (
            <View style={styles.nativeMapOverlay}>
              <NativePetMap
                apiBase={apiBase}
                emailTutor={emailTutor}
                localizacaoUsuario={localizacaoUsuario}
                onClose={fecharMapaNativo}
                statusLocalizacao={statusLocalizacao}
              />
            </View>
          ) : null}
        </View>
      )}

      {erro ? (
        <View style={styles.errorBar}>
          <Text style={styles.errorText} numberOfLines={2}>
            Nao foi possivel abrir o BuscaPet: {erro}
          </Text>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#12221f",
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0
  },
  header: {
    alignItems: "center",
    backgroundColor: "#12221f",
    borderBottomColor: "#24403a",
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  headerText: {
    flex: 1,
    minWidth: 0
  },
  title: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "700"
  },
  subtitle: {
    color: "#b9c9c3",
    fontSize: 12,
    marginTop: 2
  },
  locationStatus: {
    color: "#f2d58d",
    fontSize: 11,
    marginTop: 2
  },
  headerButton: {
    backgroundColor: "#f2b84b",
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 9
  },
  headerActions: {
    flexDirection: "row",
    gap: 8
  },
  headerButtonText: {
    color: "#19211f",
    fontSize: 12,
    fontWeight: "700"
  },
  webview: {
    flex: 1,
    backgroundColor: "#ffffff"
  },
  content: {
    flex: 1
  },
  nativeMapOverlay: {
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0
  },
  nativeMapScreen: {
    flex: 1,
    backgroundColor: "#eef4f1"
  },
  nativeMapTopbar: {
    alignItems: "center",
    backgroundColor: "#eef4f1",
    borderBottomColor: "#c9d6d1",
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  nativeMapTopbarText: {
    flex: 1,
    minWidth: 0
  },
  nativeMapTitle: {
    color: "#12221f",
    fontSize: 17,
    fontWeight: "800"
  },
  nativeMapSubtitle: {
    color: "#48625b",
    fontSize: 12,
    marginTop: 2
  },
  nativeMapBackButton: {
    backgroundColor: "#12221f",
    borderRadius: 6,
    paddingHorizontal: 14,
    paddingVertical: 9
  },
  nativeMapBackButtonText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "800"
  },
  nativeMap: {
    flex: 1
  },
  nativeMapStatusCard: {
    backgroundColor: "#12221f",
    bottom: 16,
    left: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    position: "absolute",
    right: 14
  },
  nativeMapStatusText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "700"
  },
  loading: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    bottom: 0,
    justifyContent: "center",
    left: 0,
    position: "absolute",
    right: 0,
    top: 0
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
    backgroundColor: "#eef4f1"
  },
  emptyTitle: {
    color: "#12221f",
    fontSize: 24,
    fontWeight: "800",
    marginBottom: 16
  },
  input: {
    backgroundColor: "#ffffff",
    borderColor: "#c9d6d1",
    borderRadius: 8,
    borderWidth: 1,
    color: "#12221f",
    fontSize: 16,
    paddingHorizontal: 14,
    paddingVertical: 12
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: "#12221f",
    borderRadius: 8,
    marginTop: 12,
    paddingVertical: 14
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "800"
  },
  errorBar: {
    backgroundColor: "#7a1e1e",
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  errorText: {
    color: "#ffffff",
    fontSize: 13
  }
});

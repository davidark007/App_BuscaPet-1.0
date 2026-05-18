import { useEffect, useState } from "react";
import PerfilTutor from "./Perfiltutor.jsx";
import PerfilPet from "./PerfilPet.jsx";
import { API } from "./config.js";
import { tw } from "./twind.js";
import { tutorTemCadastroCompleto } from "./tutorPerfilUtils.js";

const iconButton = tw`inline-grid place-items-center rounded-2xl border border-white/60 bg-white/85 text-pet-deep shadow-pet-soft transition hover:-translate-y-0.5 hover:bg-white`;
const primaryAction = tw`inline-flex items-center justify-center rounded-2xl bg-pet-deep px-5 py-3 font-bold text-white shadow-pet-soft transition hover:-translate-y-0.5 hover:bg-pet-teal`;
const quietPanel = tw`border border-white/70 bg-white/90 shadow-pet-soft backdrop-blur-xl`;

async function entrarTelaCheia() {
  const root = document.documentElement;
  const requestFullscreen =
    root.requestFullscreen ||
    root.webkitRequestFullscreen ||
    root.msRequestFullscreen;

  if (!requestFullscreen) {
    return;
  }

  try {
    await requestFullscreen.call(root);
  } catch {
    // Fullscreen via JavaScript depends on a user click.
  }
}

async function sairTelaCheia() {
  const fullscreenElement =
    document.fullscreenElement ||
    document.webkitFullscreenElement ||
    document.msFullscreenElement;

  if (!fullscreenElement) {
    return;
  }

  const exitFullscreen =
    document.exitFullscreen ||
    document.webkitExitFullscreen ||
    document.msExitFullscreen;

  if (!exitFullscreen) {
    return;
  }

  try {
    await exitFullscreen.call(document);
  } catch {
    // Keep the React screen change even if the browser blocks this call.
  }
}

function abrirMapaNativoSeDisponivel(modo = "normal") {
  if (!window.ReactNativeWebView) {
    return false;
  }

  window.ReactNativeWebView.postMessage(JSON.stringify({
    type: "buscapet:open-native-map",
    mode: modo,
    email: localStorage.getItem("email") || ""
  }));

  return true;
}

function obterNomeUsuario(nomeCompleto) {
  const partes = String(nomeCompleto || "").trim().split(/\s+/).filter(Boolean);

  if (partes.length <= 2) {
    return partes.join(" ");
  }

  return `${partes[0]} ${partes[partes.length - 1]}`;
}

function normalizarBusca(valor = "") {
  return String(valor)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function formatarDataPet(valor) {
  const data = String(valor || "").split("T")[0];

  if (!data) {
    return "";
  }

  const [ano, mes, dia] = data.split("-");

  if (!ano || !mes || !dia) {
    return data;
  }

  return `${dia}/${mes}/${ano}`;
}

function petComCadastroIncompleto(pet) {
  return (
    !pet.nome ||
    !pet.especie ||
    !pet.raca ||
    !pet.sexo ||
    !pet.cor ||
    !pet.peso ||
    !pet.data_nascimento
  );
}

function petEstaPerdido(pet) {
  return Number(pet.perdido) === 1;
}

function obterNomeTutorPet(pet) {
  const nome = pet.nome_tutor || pet.nome_usuario || "";

  if (nome) {
    return nome;
  }

  return pet.email_tutor ? pet.email_tutor.split("@")[0] : "Tutor";
}

export default function App() {
  const [email, setEmail] = useState(() => localStorage.getItem("email") || "");
  const [senha, setSenha] = useState("");
  const [nomeUsuario, setNomeUsuario] = useState(() => localStorage.getItem("nome") || "");
  const [page, setPage] = useState("home");
  const [tela, setTela] = useState(() => localStorage.getItem("email") ? "app" : "login");
  const [carregandoApp, setCarregandoApp] = useState(true);
  const [progressoCarregamento, setProgressoCarregamento] = useState(0);

  useEffect(() => {
    const duracaoCarregamento = 10000;
    const inicio = Date.now();

    const atualizarProgresso = () => {
      const tempoPassado = Date.now() - inicio;
      const novoProgresso = Math.min(100, Math.round((tempoPassado / duracaoCarregamento) * 100));

      setProgressoCarregamento(novoProgresso);

      if (novoProgresso >= 100) {
        setCarregandoApp(false);
      }
    };

    atualizarProgresso();

    const intervalo = window.setInterval(atualizarProgresso, 100);

    return () => {
      window.clearInterval(intervalo);
    };
  }, []);

  async function fazerLogin() {
    const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!email || !senha) {
      alert("Preencha todos os campos!");
      return;
    }

    if (!emailValido.test(email)) {
      alert("Email inválido!");
      return;
    }

    try {
      const res = await fetch(`${API}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, senha }),
      });

      const dados = await res.json();

      if (!res.ok) {
        alert(dados.erro || "Erro ao fazer login!");
        return;
      }

      localStorage.setItem("id_usuario", dados.id_usuario);
      localStorage.setItem("email", dados.email);
      localStorage.setItem("nome", dados.nome);
      localStorage.setItem("perfil", dados.perfil);

      setEmail(dados.email);
      setNomeUsuario(dados.nome);
      setTela("app");
    } catch {
      alert("Erro ao conectar com o servidor!");
    }
  }

  function sair() {
    localStorage.clear();
    setEmail("");
    setSenha("");
    setNomeUsuario("");
    setPage("home");
    setTela("login");
  }

  if (carregandoApp) {
    return <TelaCarregamento progresso={progressoCarregamento} />;
  }

  if (tela === "app") {
    return (
      <AppLogado
        nome={nomeUsuario}
        sair={sair}
        page={page}
        setPage={setPage}
      />
    );
  }

  return (
    <>
      {tela === "login" && (
        <Login
          email={email}
          senha={senha}
          setEmail={setEmail}
          setSenha={setSenha}
          fazerLogin={fazerLogin}
          irParaCadastro={() => setTela("cadastro")}
        />
      )}

      {tela === "cadastro" && (
        <Cadastro voltarLogin={() => setTela("login")} />
      )}
    </>
  );
}

function TelaCarregamento({ progresso }) {
  return (
    <main className="loading-screen" aria-label="Carregando BuscaPet">
      <div className="loading-dots" aria-hidden="true" />

      <section className="loading-content">
        <div className="loading-icon-wrap">
          <img className="loading-icon" src="/chargerIcon.png" alt="BuscaPet" />
        </div>

        <div
          className="loading-progress"
          style={{ "--progress": `${progresso}%` }}
          aria-label={`Carregamento em ${progresso}%`}
        >
          <span>{progresso}%</span>
        </div>
      </section>
    </main>
  );
}

function Login({ email, senha, setEmail, setSenha, fazerLogin, irParaCadastro }) {
  return (
    <div className={`login-container ${tw`relative isolate overflow-hidden px-5`}`}>
      <div className={tw`pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_24%_18%,rgba(244,180,81,0.24),transparent_28rem)]`} />
      <div className={`login-box ${tw`relative grid w-full max-w-[430px] gap-4 rounded-[26px] border border-white/80 bg-white/90 p-7 text-left shadow-pet-lift backdrop-blur-2xl sm:p-9`}`}>
        <div className={tw`mb-1 flex items-center gap-3`}>
          <span className={tw`grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-2xl bg-white shadow-pet-soft`}>
            <img src="/chargerIcon.png" alt="Ícone do BuscaPet" className={tw`h-full w-full object-cover`} />
          </span>
          <div>
            <p className={tw`m-0 text-sm font-bold uppercase text-pet-muted`}>Bem-vindo ao</p>
            <h2 className={tw`m-0 text-3xl font-black leading-none text-pet-ink`}>BuscaPet</h2>
          </div>
        </div>

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder="Senha"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
        />

        <button className={primaryAction} type="button" onClick={fazerLogin}>
          Entrar
        </button>

        <p className={tw`m-0 text-center text-sm text-pet-muted`}>
          Ainda não tem conta?{" "}
          <span className="btnCadastro" onClick={irParaCadastro}>
            Cadastre-se
          </span>
        </p>
      </div>
    </div>
  );
}

function AppLogado({ nome, page, setPage }) {
  const [abrirPerfil, setAbrirPerfil] = useState(false);
  const [perfilTutorObrigatorio, setPerfilTutorObrigatorio] = useState(false);
  const [verificandoTutor, setVerificandoTutor] = useState(true);
  const nomeBoasVindas = obterNomeUsuario(nome || localStorage.getItem("nome"));
  const mapaEmTelaCheia = page === "mapaFull";
  const emailUsuario = localStorage.getItem("email") || "";

  useEffect(() => {
    let ativo = true;

    async function verificarPerfilTutor() {
      if (!emailUsuario) {
        setVerificandoTutor(false);
        return;
      }

      setVerificandoTutor(true);

      try {
        const res = await fetch(`${API}/tutor/${emailUsuario}`);

        if (!res.ok) {
          throw new Error("Tutor sem cadastro");
        }

        const dadosTutor = await res.json();

        if (!ativo) {
          return;
        }

        const cadastroCompleto = tutorTemCadastroCompleto(dadosTutor);
        setPerfilTutorObrigatorio(!cadastroCompleto);
        setAbrirPerfil(!cadastroCompleto);
      } catch {
        if (ativo) {
          setPerfilTutorObrigatorio(true);
          setAbrirPerfil(true);
        }
      } finally {
        if (ativo) {
          setVerificandoTutor(false);
        }
      }
    }

    verificarPerfilTutor();

    return () => {
      ativo = false;
    };
  }, [emailUsuario]);

  useEffect(() => {
    document.body.classList.toggle("profile-required-open", perfilTutorObrigatorio);

    return () => {
      document.body.classList.remove("profile-required-open");
    };
  }, [perfilTutorObrigatorio]);

  useEffect(() => {
    window.__BUSCAPET_SET_PAGE__ = setPage;

    return () => {
      delete window.__BUSCAPET_SET_PAGE__;
    };
  }, [setPage]);

  function fecharPerfil() {
    if (perfilTutorObrigatorio) {
      return;
    }

    setAbrirPerfil(false);
  }

  function liberarTelaAposCadastroTutor() {
    setPerfilTutorObrigatorio(false);
    setAbrirPerfil(false);
  }

  return (
    <div className={`app-shell ${tw`bg-[linear-gradient(155deg,#134e4a_0%,#0f766e_42%,#eef8f4_100%)]`} ${mapaEmTelaCheia ? "map-fullscreen-mode" : ""}`}>
      <div className="header">
        <header className={`app-header ${tw`rounded-[28px] border border-white/20 bg-white/10 px-4 py-3 shadow-pet-soft backdrop-blur-xl sm:px-5`}`}>
          <div className="brand">
            <span className={tw`text-sm tracking-tight`} aria-hidden="true">
              <img src="/chargerIcon.png" alt="" className={tw`h-full w-full object-cover`} />
            </span>
            <span>BuscaPet</span>
          </div>

          <p className="welcome">Bem-vindo, {nomeBoasVindas}!</p>

          <button
            className={`profile-button ${iconButton}`}
            type="button"
            disabled={perfilTutorObrigatorio || verificandoTutor}
            onClick={() => setAbrirPerfil(true)}
          >
            <span className={tw`grid h-7 w-7 place-items-center rounded-xl bg-pet-mint text-xs font-black text-pet-deep`} aria-hidden="true">
              EU
            </span>
            <span>Perfil</span>
          </button>
        </header>
      </div>

      {abrirPerfil && (
        <>
          {perfilTutorObrigatorio && <div className="profile-required-blocker" aria-hidden="true" />}
          <div className={`sidebar ${perfilTutorObrigatorio ? "sidebar-obrigatoria" : ""} ${tw`border-l border-white/10 shadow-pet-lift`}`}>
            {!perfilTutorObrigatorio && (
              <button className={`btnClose ${iconButton}`} type="button" onClick={fecharPerfil}>
                Fechar
              </button>
            )}
            <PerfilTutor
              obrigatorio={perfilTutorObrigatorio}
              onPerfilSalvo={liberarTelaAposCadastroTutor}
            />
          </div>
        </>
      )}

      <main className="container">
        {page === "home" && <Home setPage={setPage} />}
        {page === "perfil" && <Perfil />}
        {page === "mapa" && <Mapa setPage={setPage} />}
        {page === "mapaFull" && <MapaFull setPage={setPage} />}
      </main>

      <nav className={`navbar ${tw`border-white/70 bg-white/90 shadow-pet-lift backdrop-blur-2xl`}`} aria-label="Navegação principal">
        <button
          type="button"
          className={page === "home" ? "active" : ""}
          aria-label="Início"
          onClick={() => setPage("home")}
        >
          Início
        </button>
        <button
          type="button"
          className={page === "mapa" || page === "mapaFull" ? "active" : ""}
          aria-label="Mapa"
          onClick={() => setPage("mapa")}
        >
          Mapa
        </button>
        <button
          type="button"
          className={page === "perfil" ? "active" : ""}
          aria-label="Perfil do pet"
          onClick={() => setPage("perfil")}
        >
          Pets
        </button>
      </nav>
    </div>
  );
}

function Home({ setPage }) {
  const emailUsuario = localStorage.getItem("email") || "";
  const [busca, setBusca] = useState("");
  const [petsGerais, setPetsGerais] = useState([]);
  const [meusPets, setMeusPets] = useState([]);
  const [carregandoPets, setCarregandoPets] = useState(true);
  const [erroPets, setErroPets] = useState("");
  const [listaAberta, setListaAberta] = useState(false);
  const [petSelecionado, setPetSelecionado] = useState(null);

  useEffect(() => {
    const modalAberto = listaAberta || Boolean(petSelecionado);
    document.body.classList.toggle("modal-pets-open", modalAberto);

    return () => {
      document.body.classList.remove("modal-pets-open");
    };
  }, [listaAberta, petSelecionado]);

  useEffect(() => {
    let ativo = true;

    async function buscarDadosDashboard() {
      setCarregandoPets(true);
      setErroPets("");

      try {
        const [resPetsGerais, resMeusPets] = await Promise.all([
          fetch(`${API}/pets-geral`),
          emailUsuario ? fetch(`${API}/pets/${emailUsuario}`) : Promise.resolve(null),
        ]);

        const dadosPetsGerais = await resPetsGerais.json();
        const dadosMeusPets = resMeusPets ? await resMeusPets.json() : [];

        if (!resPetsGerais.ok || (resMeusPets && !resMeusPets.ok)) {
          throw new Error(dadosPetsGerais.erro || dadosMeusPets.erro || "Erro ao buscar pets");
        }

        if (ativo) {
          setPetsGerais(dadosPetsGerais);
          setMeusPets(dadosMeusPets);
        }
      } catch (erro) {
        if (ativo) {
          setErroPets(erro.message || "Nao foi possivel carregar os pets agora.");
        }
      } finally {
        if (ativo) {
          setCarregandoPets(false);
        }
      }
    }

    buscarDadosDashboard();

    return () => {
      ativo = false;
    };
  }, [emailUsuario]);

  const meusPetsIncompletos = meusPets.filter(petComCadastroIncompleto).length;
  const petsSemFoto = meusPets.filter((pet) => !pet.foto).length;
  const meusPetsPerdidos = meusPets.filter(petEstaPerdido).length;
  const petsPerdidosNaRede = petsGerais.filter(petEstaPerdido).length;
  const totalAlertas = meusPetsIncompletos + meusPetsPerdidos;
  const petsFiltrados = petsGerais.filter((pet) => {
    const textoPet = normalizarBusca([
      pet.nome,
      pet.especie,
      pet.raca,
      pet.cor,
      obterNomeTutorPet(pet),
      petEstaPerdido(pet) ? "perdido alerta" : "",
    ].filter(Boolean).join(" "));

    return textoPet.includes(normalizarBusca(busca));
  });
  const petsTabela = petsFiltrados.slice(0, 6);

  const alertas = [
    meusPets.length === 0 && {
      titulo: "Nenhum pet seu cadastrado",
      texto: "Cadastre seu primeiro pet na aba de perfil dos pets.",
      tipo: "warning",
    },
    meusPetsIncompletos > 0 && {
      titulo: `${meusPetsIncompletos} cadastro${meusPetsIncompletos > 1 ? "s" : ""} incompleto${meusPetsIncompletos > 1 ? "s" : ""}`,
      texto: "Complete os dados para facilitar a identificacao do pet.",
      tipo: "warning",
    },
    petsSemFoto > 0 && {
      titulo: `${petsSemFoto} pet${petsSemFoto > 1 ? "s" : ""} sem foto`,
      texto: "Adicionar foto ajuda outros usuarios a reconhecerem o pet.",
      tipo: "info",
    },
    meusPetsPerdidos > 0 && {
      titulo: `${meusPetsPerdidos} pet${meusPetsPerdidos > 1 ? "s" : ""} em modo perdido`,
      texto: "Esses pets aparecem com alerta na rede BuscaPet.",
      tipo: "danger",
    },
    petsPerdidosNaRede > 0 && {
      titulo: `${petsPerdidosNaRede} alerta${petsPerdidosNaRede > 1 ? "s" : ""} de pet perdido na rede`,
      texto: "Abra a lista geral para ver quais pets precisam de ajuda.",
      tipo: "warning",
    },
    petsGerais.length > 0 && {
      titulo: `${petsGerais.length} pet${petsGerais.length > 1 ? "s" : ""} na rede BuscaPet`,
      texto: "Toque em Ver todos os pets para consultar a lista geral.",
      tipo: "success",
    },
  ].filter(Boolean);

  function selecionarPet(pet) {
    const petDoUsuario = pet.email_tutor === emailUsuario;

    if (petDoUsuario) {
      setListaAberta(false);
      setPetSelecionado(null);
      setPage("perfil");
      return;
    }

    setPetSelecionado(pet);
  }

  return (
    <div className={`home-page dashboard-page ${tw`pb-4`}`}>
      <section className={`dashboard-top ${tw`items-stretch`}`} aria-label="Resumo do BuscaPet">
        <input
          className={`search ${tw`rounded-2xl border-white/70 bg-white/95 text-[15px] shadow-pet-soft placeholder:text-pet-muted/70`}`}
          placeholder="Buscar pet"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />

        <div className={`dashboard-stats ${tw`[&>div]:rounded-2xl [&>div]:border-white/70 [&>div]:bg-white/95 [&>div]:shadow-pet-soft`}`} aria-label="Resumo dos pets">
          <div>
            <strong>{meusPets.length}</strong>
            <span>Meus pets</span>
          </div>
          <div>
            <strong>{petsGerais.length}</strong>
            <span>Pets na rede</span>
          </div>
          <div>
            <strong>{totalAlertas}</strong>
            <span>Alertas</span>
          </div>
        </div>
      </section>

      <section className={`cardMapa dashboard-map-card ${quietPanel} ${tw`rounded-[26px]`}`}>
        <div className="dashboard-card-title">
          <div>
            <span className="eyebrow">Mapa rapido</span>
            <h3>Visao geral</h3>
          </div>
          <button className={`btn-ver-pets ${primaryAction}`} type="button" onClick={() => setListaAberta(true)}>
            Ver todos os pets
          </button>
        </div>

        <div className="dashboard-map-layout">
          <div className={`map-pets-table ${tw`rounded-[22px] border-pet-deep/10 bg-pet-mint/80`}`} aria-label="Tabela rápida de pets">
            <div className="table-header">
              <span>Pet</span>
              <span>Tutor</span>
              <span>Status</span>
            </div>

            {carregandoPets && <p className="empty-state">Carregando pets...</p>}

            {!carregandoPets && petsTabela.length === 0 && (
              <p className="empty-state">Nenhum pet encontrado.</p>
            )}

            {!carregandoPets && petsTabela.map((pet) => {
              const petDoUsuario = pet.email_tutor === emailUsuario;
              const perdido = petEstaPerdido(pet);

              return (
                <button
                  className={`table-pet-row ${tw`rounded-2xl border-white bg-white/95 shadow-sm hover:shadow-pet-soft`} ${perdido ? "pet-row-perdido" : ""}`}
                  type="button"
                  key={pet.id_pet}
                  onClick={() => selecionarPet(pet)}
                >
                  <span>
                    <strong>{pet.nome || "Pet sem nome"}</strong>
                    <small>{pet.especie || "Especie"} - {pet.raca || "Raca"}</small>
                  </span>
                  <span>{obterNomeTutorPet(pet)}</span>
                  <span className={perdido ? "owner-tag lost" : petDoUsuario ? "owner-tag mine" : "owner-tag"}>
                    {perdido ? "Perdido" : petDoUsuario ? "Meu pet" : "Ver ficha"}
                  </span>
                </button>
              );
            })}
          </div>

          <button
            className={`mapHome dashboard-map ${tw`rounded-[24px] shadow-pet-soft`}`}
            type="button"
            onClick={() => setPage("mapa")}
            aria-label="Abrir mapa em tempo real"
          >
            <img src="/mapa.png" alt="Mapa ilustrativo" />
            <span className="map-badge">Ver mapa</span>
          </button>
        </div>
      </section>

      <section className={`alerts-panel ${quietPanel} ${tw`rounded-[26px]`}`} aria-label="Alertas">
        <div className="dashboard-card-title">
          <div>
            <span className="eyebrow">Status</span>
            <h3>Alertas</h3>
          </div>
        </div>

        {carregandoPets && <p className="empty-state">Carregando alertas...</p>}
        {erroPets && <p className="empty-state error-state">{erroPets}</p>}

        {!carregandoPets && !erroPets && (
          <div className="alerts-list">
            {alertas.map((alerta) => (
              <article className={`alert-item ${tw`rounded-2xl bg-white/70`} ${alerta.tipo}`} key={alerta.titulo}>
                <span className="alert-dot" aria-hidden="true" />
                <div>
                  <strong>{alerta.titulo}</strong>
                  <p>{alerta.texto}</p>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {listaAberta && (
        <div className="pets-modal-bg" onClick={() => setListaAberta(false)}>
          <section
            className={`pets-modal ${tw`rounded-t-[30px] border-white/80 bg-white shadow-pet-lift`}`}
            aria-label="Todos os pets"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sheet-topo">
              <div>
                <span className="eyebrow">Rede BuscaPet</span>
                <h2>Todos os pets</h2>
              </div>
              <button type="button" onClick={() => setListaAberta(false)}>×</button>
            </div>

            <input
              className={`modal-search ${tw`rounded-2xl bg-pet-mint/80`}`}
              placeholder="Buscar por nome, especie, raca ou tutor"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />

            {petsFiltrados.length === 0 ? (
              <p className="empty-state">Nenhum pet encontrado.</p>
            ) : (
              <div className="all-pets-list">
                {petsFiltrados.map((pet) => {
                  const petDoUsuario = pet.email_tutor === emailUsuario;
                  const perdido = petEstaPerdido(pet);

                  return (
                    <button
                      className={`all-pet-row ${tw`rounded-2xl bg-pet-mint/70 hover:bg-white`} ${perdido ? "pet-row-perdido" : ""}`}
                      type="button"
                      key={pet.id_pet}
                      onClick={() => selecionarPet(pet)}
                    >
                      <span className="pet-mini-photo">
                        {pet.foto ? <img src={`${API}${pet.foto}`} alt={pet.nome} /> : <img src="/chargerIcon.png" alt="BuscaPet" className={tw`h-full w-full object-cover`} />}
                      </span>
                      <span>
                        <strong>{pet.nome || "Pet sem nome"}</strong>
                        <small>
                          {pet.especie || "Especie nao informada"} - {pet.raca || "Raca nao informada"}
                        </small>
                      </span>
                      <span className={perdido ? "owner-tag lost" : petDoUsuario ? "owner-tag mine" : "owner-tag"}>
                        {perdido ? "Perdido" : petDoUsuario ? "Meu pet" : obterNomeTutorPet(pet)}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      )}

      {petSelecionado && (
        <div className="pets-modal-bg" onClick={() => setPetSelecionado(null)}>
          <section
            className={`pet-detail-modal ${tw`rounded-t-[30px] border-white/80 bg-white shadow-pet-lift`}`}
            aria-label="Informações do pet"
            onClick={(e) => e.stopPropagation()}
          >
            <button className="detail-close" type="button" onClick={() => setPetSelecionado(null)}>
              ×
            </button>

            <div className="detail-hero">
              <span className="detail-photo">
                {petSelecionado.foto ? (
                  <img src={`${API}${petSelecionado.foto}`} alt={petSelecionado.nome} />
                ) : (
                  <img src="/chargerIcon.png" alt="BuscaPet" className={tw`h-full w-full object-cover`} />
                )}
              </span>
              <div>
                <span className="eyebrow">{obterNomeTutorPet(petSelecionado)}</span>
                <h2>{petSelecionado.nome || "Pet sem nome"}</h2>
                {petEstaPerdido(petSelecionado) && (
                  <span className="detail-alert-tag">Perdido</span>
                )}
              </div>
            </div>

            <div className="detail-grid">
              <InfoPet label="Status" valor={petEstaPerdido(petSelecionado) ? "Pet perdido" : "Normal"} />
              <InfoPet label="Espécie" valor={petSelecionado.especie} />
              <InfoPet label="Raça" valor={petSelecionado.raca} />
              <InfoPet label="Sexo" valor={petSelecionado.sexo} />
              <InfoPet label="Cor" valor={petSelecionado.cor} />
              <InfoPet label="Peso" valor={petSelecionado.peso ? `${petSelecionado.peso} kg` : ""} />
              <InfoPet label="Nascimento" valor={formatarDataPet(petSelecionado.data_nascimento)} />
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function InfoPet({ label, valor }) {
  return (
    <div className={`detail-info ${tw`rounded-2xl bg-pet-mint/70`}`}>
      <span>{label}</span>
      <strong>{valor || "-"}</strong>
    </div>
  );
}

function Mapa({ setPage }) {
  useEffect(() => {
    abrirMapaNativoSeDisponivel("normal");
  }, []);

  async function abrirMapaTelaCheia() {
    if (abrirMapaNativoSeDisponivel("fullscreen")) {
      return;
    }

    await entrarTelaCheia();
    setPage("mapaFull");
  }

  return (
    <div className={`card ${quietPanel} ${tw`rounded-[26px]`}`}>
      <h3>Mapa em tempo real</h3>

      <iframe
        allow="geolocation"
        className="map-frame"
        src="/Map.html"
        title="Mapa"
      />

      <button className={`btnmapa ${primaryAction}`} type="button" onClick={abrirMapaTelaCheia}>
        Tela cheia
      </button>
    </div>
  );
}

function MapaFull({ setPage }) {
  useEffect(() => {
    abrirMapaNativoSeDisponivel("fullscreen");
  }, []);

  async function voltarMapaNormal() {
    await sairTelaCheia();
    setPage("mapa");
  }

  return (
    <div className="map-full">
      <button className={`back-button ${iconButton}`} type="button" onClick={voltarMapaNormal}>
        Voltar
      </button>

      <iframe
        allow="geolocation"
        className="map-full-frame"
        src="/Map.html"
        title="Mapa Full"
      />
    </div>
  );
}

function Perfil() {
  return <PerfilPet />;
}

function Cadastro({ voltarLogin }) {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [nome, setNome] = useState("");

  async function criarConta() {
    const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!email || !senha || !nome) {
      alert("Preencha todos os campos!");
      return;
    }

    if (!emailValido.test(email)) {
      alert("Email inválido!");
      return;
    }

    try {
      const res = await fetch(`${API}/cadastro`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome, email, senha }),
      });

      const dados = await res.json();

      if (!res.ok) {
        alert(dados.erro || "Erro ao cadastrar!");
        return;
      }

      alert("Conta criada! Faça login.");
      voltarLogin();
    } catch {
      alert("Erro ao conectar com o servidor!");
    }
  }

  return (
    <div className={`cadastro-container ${tw`relative isolate overflow-hidden px-5`}`}>
      <div className={`cadastro-box ${tw`relative grid w-full max-w-[430px] gap-4 rounded-[26px] border border-white/80 bg-white/90 p-7 text-left shadow-pet-lift backdrop-blur-2xl sm:p-9`}`}>
        <h2 className={tw`m-0 text-3xl font-black leading-none text-pet-ink`}>Criar conta</h2>

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder="Senha"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
        />

        <input
          type="text"
          placeholder="Seu nome"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
        />

        <button className={primaryAction} type="button" onClick={criarConta}>Criar conta</button>

        <button
          className="link-button"
          type="button"
          onClick={voltarLogin}
        >
          Já tem conta? Voltar ao login
        </button>
      </div>
    </div>
  );
}

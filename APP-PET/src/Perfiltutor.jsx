import { useState, useEffect } from "react";
import { API } from "./config.js";
import { limparCep, tutorTemCadastroCompleto } from "./tutorPerfilUtils.js";

export default function PerfilTutor({ obrigatorio = false, onPerfilSalvo } = {}) {
    const email = localStorage.getItem("email") || "";
    const nomeUsuario = localStorage.getItem("nome") || "";
    const [foto, setFoto] = useState(null);

    const [dados, setDados] = useState({
        nome: "",
        cpf: "",
        telefone: "",
        email: email,
        endereco: "",
        bairro: "",
        cep: "",
    });

    const [editando, setEditando] = useState(false);
    const [carregando, setCarregando] = useState(true);
    const [salvando, setSalvando] = useState(false);
    const [buscandoCep, setBuscandoCep] = useState(false);
    const [mensagem, setMensagem] = useState(null); // { tipo: 'sucesso' | 'erro', texto: '' }
    const [perfilExiste, setPerfilExiste] = useState(false);

    // Busca os dados do tutor ao carregar
    useEffect(() => {
        async function buscarPerfil() {
            try {
                const res = await fetch(`${API}/tutor/${email}`);
                if (res.ok) {
                    const data = await res.json();
                    setDados(data);
                    setFoto(data.foto || null);
                    setPerfilExiste(true);
                    setEditando(!tutorTemCadastroCompleto(data));
                } else {
                    // tutor não cadastrado ainda — abre formulário para preencher
                    setPerfilExiste(false);
                    setEditando(true);
                }
            } catch {
                setPerfilExiste(false);
                setEditando(true);
            } finally {
                setCarregando(false);
            }
        }

        if (email) buscarPerfil();
        else setCarregando(false);
    }, [email]);

    useEffect(() => {
        if (!editando) return;

        const cepLimpo = limparCep(dados.cep);

        if (cepLimpo.length !== 8) return;

        const controller = new AbortController();
        const timer = setTimeout(async () => {
            setBuscandoCep(true);

            try {
                const res = await fetch(`${API}/cep/${cepLimpo}`, {
                    signal: controller.signal
                });
                const data = await res.json();

                if (!res.ok) {
                    throw new Error(data.erro || "CEP nao encontrado");
                }

                setDados((dadosAtuais) => {
                    if (limparCep(dadosAtuais.cep) !== cepLimpo) {
                        return dadosAtuais;
                    }

                    return {
                        ...dadosAtuais,
                        cep: data.cep || formatarCep(cepLimpo),
                        endereco: data.endereco || "",
                        bairro: data.bairro || "",
                        cidade: data.cidade || "",
                        uf: data.uf || ""
                    };
                });
            } catch (erro) {
                if (erro.name !== "AbortError") {
                    exibirMensagem("erro", erro.message || "Erro ao buscar CEP!");
                }
            } finally {
                if (!controller.signal.aborted) {
                    setBuscandoCep(false);
                }
            }
        }, 500);

        return () => {
            clearTimeout(timer);
            controller.abort();
        };
    }, [dados.cep, editando]);

    function handleChange(e) {
        const name = e.target.dataset.field || e.target.name;
        const { value } = e.target;
        setDados({
            ...dados,
            [name]: name === "cep" ? formatarCep(value) : value
        });
    }

    async function salvar() {
        if (!tutorTemCadastroCompleto(dados)) {
            exibirMensagem("erro", "Preencha nome, CPF, telefone, endereco, bairro e um CEP valido!");
            return;
        }

        setSalvando(true);
        try {
            let coordenadas = {};

            coordenadas = await buscarCoordenadasPorCep(dados);

            const res = await fetch(`${API}/tutor`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...dados,
                    email,
                    latitude: coordenadas.latitude,
                    longitude: coordenadas.longitude
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                exibirMensagem("erro", data.erro || "Erro ao salvar!");
            } else {
                exibirMensagem("sucesso", data.mensagem || "Perfil salvo com sucesso!");
                setPerfilExiste(true);
                setEditando(false);
                if (obrigatorio) {
                    onPerfilSalvo?.(data);
                }
            }
        } catch (erro) {
            exibirMensagem("erro", erro.message || "Erro ao conectar com o servidor!");
        } finally {
            setSalvando(false);
        }
    }

    function cancelar() {
        if (obrigatorio) {
            return;
        }

        setEditando(false);
    }

    function exibirMensagem(tipo, texto) {
        setMensagem({ tipo, texto });
        setTimeout(() => setMensagem(null), 4000);
    }

    function iniciais(nome) {
        if (!nome) return "?";
        const partes = nome.trim().split(" ");
        if (partes.length === 1) return partes[0][0].toUpperCase();
        return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
    }

    async function escolherFoto(e) {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append("foto", file);
        formData.append("email", email);

        try {
            const res = await fetch(`${API}/upload-foto`, {
                method: "POST",
                body: formData
            });

            const data = await res.json();

            if (res.ok) {
                setFoto(data.foto);
            } else {
                alert("Erro ao enviar foto");
            }
        } catch {
            alert("Erro no servidor");
        }
    }

    if (carregando) {
        return (
            <div style={styles.loadingWrap}>
                <div style={styles.spinner} />
                <p style={styles.loadingText}>Carregando perfil...</p>
            </div>
        );
    }

    return (
        <div style={styles.container}>

            {/* Toast de mensagem */}
            {mensagem && (
                <div style={{
                    ...styles.toast,
                    background: mensagem.tipo === "sucesso" ? "#2ecc71" : "#e74c3c"
                }}>
                    {mensagem.tipo === "sucesso" ? "✅" : "❌"} {mensagem.texto}
                </div>
            )}

            {/* Header do perfil */}
            <div style={styles.header}>
                <label style={styles.avatar}>
                    {foto ? (
                        <img
                            src={`${API}${foto}`}
                            alt="Foto"
                            style={{
                                width: "100%",
                                height: "100%",
                                borderRadius: 20,
                                objectFit: "cover"
                            }}
                        />
                    ) : (
                        iniciais(dados.nome || nomeUsuario)
                    )}

                    <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={escolherFoto}
                        style={{ display: "none" }}
                    />  
                </label>
                <div style={styles.headerInfo}>
                    <h2 style={styles.nomeUsuario}>{dados.nome || nomeUsuario || "Novo Tutor"}</h2>
                    <span style={styles.emailTag}>{email}</span>
                    {perfilExiste && (
                        <span style={styles.badge}>✔ Perfil cadastrado</span>
                    )}
                    {obrigatorio && (
                        <span style={styles.requiredBadge}>Complete seu cadastro para continuar</span>
                    )}
                </div>
            </div>

            {/* Cartão principal */}
            <div style={styles.card}>

                {/* Título + botão editar */}
                <div style={styles.cardHeader}>
                    <h3 style={styles.cardTitle}>
                        🙍 Dados do Tutor
                    </h3>
                    {perfilExiste && !editando && (
                        <button style={styles.btnEditar} onClick={() => setEditando(true)}>
                            ✏️ Alterar dados
                        </button>
                    )}
                </div>

                {/* Modo visualização */}
                {perfilExiste && !editando && (
                    <div style={styles.viewGrid}>
                        <Campo label="Nome completo" valor={dados.nome} />
                        <Campo label="CPF" valor={dados.cpf} />
                        <Campo label="Telefone" valor={dados.telefone} />
                        <Campo label="E-mail" valor={dados.email} />
                        <Campo label="Endereço" valor={dados.endereco} full />
                        <Campo label="Bairro" valor={dados.bairro} />
                        <Campo label="CEP" valor={dados.cep} />
                    </div>
                )}

                {/* Modo formulário */}
                {editando && (
                    <form
                        style={styles.form}
                        autoComplete="off"
                        onSubmit={(e) => e.preventDefault()}
                    >
                        <div style={styles.formGrid}>
                            <Input
                                label="Nome completo *"
                                name="nome"
                                value={dados.nome}
                                onChange={handleChange}
                                placeholder="Seu nome completo"
                                full
                            />
                            <Input
                                label="CPF *"
                                name="cpf"
                                value={dados.cpf}
                                onChange={handleChange}
                                placeholder="000.000.000-00"
                            />
                            <Input
                                label="Telefone *"
                                name="telefone"
                                value={dados.telefone}
                                onChange={handleChange}
                                placeholder="(00) 00000-0000"
                            />
                            <Input
                                label="E-mail"
                                name="email"
                                value={dados.email}
                                onChange={handleChange}
                                placeholder="seu@email.com"
                                disabled
                            />
                            <Input
                                label="Endereço *"
                                name="endereco"
                                value={dados.endereco}
                                onChange={handleChange}
                                placeholder="Rua, número"
                                full
                            />
                            <Input
                                label="Bairro *"
                                name="bairro"
                                value={dados.bairro}
                                onChange={handleChange}
                                placeholder="Seu bairro"
                            />
                            <Input
                                label={buscandoCep ? "CEP * (buscando...)" : "CEP *"}
                                name="cep"
                                value={dados.cep}
                                onChange={handleChange}
                                placeholder="00000-000"
                                inputMode="numeric"
                                maxLength={9}
                            />
                        </div>

                        <div style={styles.btnGroup}>
                            {perfilExiste && !obrigatorio && (
                                <button
                                    type="button"
                                    style={styles.btnCancelar}
                                    onClick={cancelar}
                                    disabled={salvando}
                                >
                                    Cancelar
                                </button>
                            )}
                            <button
                                type="button"
                                style={{ ...styles.btnSalvar, opacity: salvando ? 0.7 : 1 }}
                                onClick={salvar}
                                disabled={salvando}
                            >
                                {salvando ? "Salvando..." : perfilExiste ? "💾 Salvar alterações" : "💾 Cadastrar perfil"}
                            </button>
                        </div>
                    </form>
                )}
            </div>
            <div style={{ marginTop: 20 }}>
                <button
                    style={{
                        width: "100%",
                        background: "linear-gradient(135deg, #d94d44, #a92e28)",
                        color: "#fff",
                        padding: "13px",
                        border: "none",
                        borderRadius: 14,
                        fontWeight: 850,
                        cursor: "pointer",
                        boxShadow: "0 14px 28px rgba(217,77,68,0.24)"
                    }}
                    onClick={() => {
                        localStorage.clear();
                        window.location.reload();
                    }}
                >
                    🚪 Sair da conta
                </button>
            </div>
        </div>
    );
}

function formatarCep(cep) {
    const cepLimpo = limparCep(cep).slice(0, 8);

    if (cepLimpo.length > 5) {
        return `${cepLimpo.slice(0, 5)}-${cepLimpo.slice(5)}`;
    }

    return cepLimpo;
}

async function buscarCoordenadasPorCep(dadosEndereco) {
    const res = await fetch(`${API}/coordenadas-cep`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            cep: dadosEndereco.cep,
            endereco: dadosEndereco.endereco,
            bairro: dadosEndereco.bairro,
            cidade: dadosEndereco.cidade,
            uf: dadosEndereco.uf
        })
    });

    const data = await res.json();

    if (!res.ok) {
        throw new Error(data.erro || "Nao foi possivel localizar esse endereco no mapa");
    }

    return data;
}

// Componente de campo somente leitura
function Campo({ label, valor, full }) {
    return (
        <div style={{ ...styles.campoWrap, gridColumn: full ? "1 / -1" : "auto" }}>
            <span style={styles.campoLabel}>{label}</span>
            <span style={styles.campoValor}>{valor || "—"}</span>
        </div>
    );
}

// Componente de input do formulário
const autocompleteTutor = {
    nome: "new-password",
    cpf: "new-password",
    telefone: "new-password",
    email: "off",
    endereco: "new-password",
    bairro: "new-password",
    cep: "new-password",
};

function Input({ label, name, value, onChange, placeholder, full, disabled, inputMode, maxLength }) {
    const nomeAntiAutofill = `buscapet-${name}-sem-autofill`;

    return (
        <div style={{ ...styles.inputWrap, gridColumn: full ? "1 / -1" : "auto" }}>
            <label style={styles.label}>{label}</label>
            <input
                name={nomeAntiAutofill}
                data-field={name}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                disabled={disabled}
                inputMode={inputMode}
                maxLength={maxLength}
                autoComplete={autocompleteTutor[name] || "new-password"}
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
                style={{
                    ...styles.input,
                    background: disabled ? "#f0f0f0" : "#fff",
                    color: disabled ? "#999" : "#333",
                    cursor: disabled ? "not-allowed" : "text",
                }}
            />
        </div>
    );
}


// =====================
// ESTILOS
// =====================
const styles = {
    container: {
        maxWidth: 720,
        margin: "0 auto",
        padding: "18px 16px 100px",
        fontFamily: "Inter, 'Segoe UI', Roboto, Arial, sans-serif",
    },
    loadingWrap: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 60,
        gap: 12,
    },
    spinner: {
        width: 36,
        height: 36,
        border: "4px solid rgba(255,255,255,0.28)",
        borderTop: "4px solid #f5b84b",
        borderRadius: "50%",
        animation: "spin 0.8s linear infinite",
    },
    loadingText: {
        color: "rgba(255,255,255,0.82)",
        fontSize: 14,
    },
    toast: {
        position: "fixed",
        top: 20,
        left: "50%",
        transform: "translateX(-50%)",
        color: "#fff",
        padding: "12px 24px",
        borderRadius: 14,
        fontWeight: 750,
        fontSize: 14,
        zIndex: 9999,
        boxShadow: "0 14px 34px rgba(0,0,0,0.22)",
        whiteSpace: "nowrap",
    },
    header: {
        display: "flex",
        alignItems: "center",
        gap: 18,
        marginBottom: 22,
        padding: "18px 0 14px",
    },
    avatar: {
        width: 76,
        height: 76,
        borderRadius: "24px",
        border: "3px solid rgba(255,255,255,0.46)",
        background: "linear-gradient(135deg, #f5b84b, #168f80)",
        color: "#fff",
        fontSize: 26,
        fontWeight: 850,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        boxShadow: "0 16px 34px rgba(0,0,0,0.22)",
        cursor: "pointer",
        overflow: "hidden",
    },
    headerInfo: {
        display: "flex",
        flexDirection: "column",
        gap: 6,
        minWidth: 0,
    },
    nomeUsuario: {
        margin: 0,
        fontSize: 24,
        fontWeight: 850,
        color: "#fff",
        lineHeight: 1.1,
    },
    emailTag: {
        fontSize: 13,
        color: "rgba(255,255,255,0.78)",
        overflowWrap: "anywhere",
    },
    badge: {
        fontSize: 12,
        color: "#0f685f",
        fontWeight: 800,
        background: "rgba(255,255,255,0.9)",
        padding: "4px 10px",
        borderRadius: 20,
        alignSelf: "flex-start",
        boxShadow: "0 8px 18px rgba(0,0,0,0.12)",
    },
    requiredBadge: {
        fontSize: 12,
        color: "#5f3d05",
        fontWeight: 850,
        background: "rgba(245,184,75,0.92)",
        padding: "5px 10px",
        borderRadius: 20,
        alignSelf: "flex-start",
        boxShadow: "0 8px 18px rgba(0,0,0,0.12)",
    },
    card: {
        background: "rgba(255,255,255,0.94)",
        border: "1px solid rgba(255,255,255,0.52)",
        borderRadius: 22,
        padding: 18,
        boxShadow: "0 14px 36px rgba(9,43,40,0.14)",
        backdropFilter: "blur(18px)",
        overflow: "hidden",
    },
    cardHeader: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 14,
        marginBottom: 20,
    },
    cardTitle: {
        margin: 0,
        fontSize: 18,
        fontWeight: 850,
        color: "#12211f",
    },
    btnEditar: {
        background: "linear-gradient(135deg, #168f80, #0f685f)",
        color: "#fff",
        border: "none",
        borderRadius: 14,
        padding: "10px 16px",
        fontSize: 13,
        fontWeight: 800,
        cursor: "pointer",
        boxShadow: "0 12px 24px rgba(15,104,95,0.22)",
    },
    viewGrid: {
        display: "grid",
        gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
        gap: 14,
    },
    campoWrap: {
        display: "flex",
        flexDirection: "column",
        gap: 6,
        minWidth: 0,
        maxWidth: "100%",
        padding: 14,
        borderRadius: 14,
        background: "#f5faf8",
        border: "1px solid rgba(14,56,52,0.1)",
        overflow: "hidden",
    },
    campoLabel: {
        fontSize: 11,
        color: "#5f7470",
        fontWeight: 850,
        textTransform: "uppercase",
        letterSpacing: 0,
    },
    campoValor: {
        fontSize: 15,
        color: "#12211f",
        fontWeight: 700,
        maxWidth: "100%",
        overflowWrap: "anywhere",
        wordBreak: "break-word",
        lineHeight: 1.35,
    },
    form: {
        display: "flex",
        flexDirection: "column",
        gap: 20,
    },
    formGrid: {
        display: "grid",
        gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
        gap: 14,
    },
    inputWrap: {
        display: "flex",
        flexDirection: "column",
        gap: 6,
    },
    label: {
        fontSize: 12,
        color: "#5f7470",
        fontWeight: 800,
    },
    input: {
        border: "1px solid rgba(14,56,52,0.14)",
        borderRadius: 14,
        padding: "12px 13px",
        fontSize: 14,
        outline: "none",
        transition: "border-color 0.2s, box-shadow 0.2s, background 0.2s",
        width: "100%",
        boxSizing: "border-box",
    },
    btnGroup: {
        display: "flex",
        gap: 10,
        justifyContent: "flex-end",
    },
    btnCancelar: {
        background: "rgba(13,59,58,0.06)",
        color: "#5f7470",
        border: "1px solid rgba(14,56,52,0.14)",
        borderRadius: 14,
        padding: "10px 20px",
        fontSize: 14,
        fontWeight: 800,
        cursor: "pointer",
    },
    btnSalvar: {
        background: "linear-gradient(135deg, #22a86f, #15865c)",
        color: "#fff",
        border: "none",
        borderRadius: 14,
        padding: "11px 24px",
        fontSize: 14,
        fontWeight: 850,
        cursor: "pointer",
        boxShadow: "0 14px 28px rgba(34,168,111,0.24)",
    },
};

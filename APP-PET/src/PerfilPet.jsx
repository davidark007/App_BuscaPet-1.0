import { useEffect, useState } from "react";
import { API } from "./config.js";
import { tw } from "./twind.js";

const surfaceCard = tw`rounded-[26px] border border-white/70 bg-white/90 shadow-pet-soft backdrop-blur-xl`;
const solidAction = tw`inline-flex items-center justify-center rounded-2xl bg-pet-deep px-5 py-3 font-bold text-white shadow-pet-soft transition hover:-translate-y-0.5 hover:bg-pet-teal`;

const OPCOES_ESPECIE = [
    "Cachorro",
    "Canina",
    "Gato",
    "Felina",
];

const OPCOES_SEXO = [
    "Masculino",
    "Macho",
    "Feminino",
    "Fêmea",
];

const RACAS_POR_ESPECIE = {
    canina: [
        "SRD (sem raça definida)",
        "Akita",
        "American Bully",
        "Beagle",
        "Bichon Frisé",
        "Border Collie",
        "Boston Terrier",
        "Boxer",
        "Bulldog Francês",
        "Bulldog Inglês",
        "Cane Corso",
        "Chihuahua",
        "Chow Chow",
        "Cocker Spaniel",
        "Dachshund",
        "Dálmata",
        "Doberman",
        "Fila Brasileiro",
        "Golden Retriever",
        "Husky Siberiano",
        "Labrador Retriever",
        "Lhasa Apso",
        "Maltês",
        "Pastor Alemão",
        "Pinscher",
        "Pit Bull",
        "Poodle",
        "Pug",
        "Rottweiler",
        "Schnauzer",
        "Shih Tzu",
        "Spitz Alemão",
        "Vira-lata",
        "Yorkshire Terrier",
    ],
    felina: [
        "SRD (sem raça definida)",
        "Abissínio",
        "Angorá",
        "Bengal",
        "British Shorthair",
        "Exótico",
        "Himalaio",
        "Maine Coon",
        "Munchkin",
        "Persa",
        "Ragdoll",
        "Sagrado da Birmânia",
        "Scottish Fold",
        "Siamês",
        "Siberiano",
        "Sphynx",
        "Vira-lata",
    ],
};

const CORES_POR_ESPECIE = {
    canina: [
        "Branco",
        "Preto",
        "Marrom",
        "Caramelo",
        "Bege",
        "Creme",
        "Dourado",
        "Cinza",
        "Chocolate",
        "Amarelo",
        "Avermelhado",
        "Tigrado",
        "Malhado",
        "Bicolor",
        "Tricolor",
        "Preto e branco",
        "Marrom e branco",
        "Caramelo e branco",
        "Cinza e branco",
    ],
    felina: [
        "Branco",
        "Preto",
        "Cinza",
        "Marrom",
        "Bege",
        "Creme",
        "Laranja",
        "Amarelo",
        "Rajado",
        "Tigrado",
        "Malhado",
        "Escaminha",
        "Tricolor",
        "Bicolor",
        "Preto e branco",
        "Cinza e branco",
        "Laranja e branco",
    ],
};

const CORES_POR_RACA = {
    canina: {
        "akita": ["Branco", "Vermelho", "Tigrado", "Sésamo", "Preto e castanho"],
        "american bully": ["Preto", "Branco", "Azul/cinza", "Chocolate", "Fulvo", "Tigrado", "Tricolor"],
        "beagle": ["Tricolor", "Bicolor", "Marrom e branco", "Preto, marrom e branco", "Limão e branco"],
        "bichon frise": ["Branco", "Creme", "Damasco"],
        "border collie": ["Preto e branco", "Marrom e branco", "Tricolor", "Azul merle", "Vermelho merle"],
        "boston terrier": ["Preto e branco", "Tigrado e branco", "Seal e branco"],
        "boxer": ["Fulvo", "Tigrado", "Branco"],
        "bulldog frances": ["Fulvo", "Tigrado", "Branco", "Creme", "Preto e branco"],
        "bulldog ingles": ["Branco", "Fulvo", "Tigrado", "Vermelho", "Malhado"],
        "cane corso": ["Preto", "Cinza", "Fulvo", "Vermelho", "Tigrado"],
        "chihuahua": ["Preto", "Branco", "Creme", "Chocolate", "Fulvo", "Tricolor", "Malhado"],
        "chow chow": ["Vermelho", "Preto", "Azul/cinza", "Canela", "Creme"],
        "cocker spaniel": ["Preto", "Dourado", "Chocolate", "Branco e preto", "Branco e marrom", "Ruão"],
        "dachshund": ["Preto e castanho", "Chocolate", "Vermelho", "Creme", "Tigrado", "Arlequim"],
        "dalmata": ["Branco com manchas pretas", "Branco com manchas marrons"],
        "doberman": ["Preto e ferrugem", "Marrom e ferrugem", "Azul/cinza e ferrugem", "Fulvo e ferrugem"],
        "fila brasileiro": ["Fulvo", "Preto", "Tigrado"],
        "golden retriever": ["Creme", "Dourado claro", "Dourado", "Dourado escuro"],
        "husky siberiano": ["Preto e branco", "Cinza e branco", "Vermelho e branco", "Sable e branco", "Branco"],
        "labrador retriever": ["Preto", "Chocolate", "Amarelo"],
        "lhasa apso": ["Dourado", "Branco", "Preto", "Cinza", "Mel", "Particolor"],
        "maltes": ["Branco"],
        "pastor alemao": ["Preto e castanho", "Preto", "Sable", "Cinza", "Preto e vermelho"],
        "pinscher": ["Preto e castanho", "Chocolate e castanho", "Vermelho", "Caramelo"],
        "pit bull": ["Preto", "Branco", "Marrom", "Azul/cinza", "Fulvo", "Tigrado", "Tricolor"],
        "poodle": ["Branco", "Preto", "Marrom", "Cinza", "Damasco", "Creme", "Vermelho"],
        "pug": ["Fulvo", "Preto", "Prata", "Damasco"],
        "rottweiler": ["Preto e castanho", "Preto e mogno"],
        "schnauzer": ["Sal e pimenta", "Preto", "Preto e prata", "Branco"],
        "shih tzu": ["Branco e dourado", "Branco e preto", "Branco e marrom", "Tricolor", "Dourado", "Fígado"],
        "spitz alemao": ["Branco", "Preto", "Marrom", "Laranja", "Creme", "Cinza sombreado", "Particolor"],
        "yorkshire terrier": ["Azul aço e dourado", "Preto e dourado", "Preto e castanho"],
    },
    felina: {
        "abissinio": ["Ruddy", "Vermelho", "Azul/cinza", "Fulvo"],
        "angora": ["Branco", "Preto", "Azul/cinza", "Creme", "Vermelho", "Tartaruga"],
        "bengal": ["Marrom spotted", "Prata", "Snow", "Charcoal", "Melanístico"],
        "british shorthair": ["Azul/cinza", "Preto", "Branco", "Creme", "Lilás", "Chocolate", "Bicolor"],
        "exotico": ["Branco", "Preto", "Azul/cinza", "Creme", "Vermelho", "Chocolate", "Lilás", "Bicolor", "Tricolor"],
        "himalaio": ["Seal point", "Blue point", "Chocolate point", "Lilac point", "Flame point", "Cream point"],
        "maine coon": ["Marrom tabby", "Preto", "Branco", "Vermelho", "Creme", "Prata", "Tartaruga"],
        "munchkin": ["Branco", "Preto", "Cinza", "Creme", "Vermelho", "Rajado", "Bicolor", "Tricolor"],
        "persa": ["Branco", "Preto", "Azul/cinza", "Creme", "Vermelho", "Chocolate", "Lilás", "Bicolor", "Tricolor"],
        "ragdoll": ["Seal point", "Blue point", "Chocolate point", "Lilac point", "Cream point", "Lynx point"],
        "sagrado da birmania": ["Seal point", "Blue point", "Chocolate point", "Lilac point", "Cream point", "Red point"],
        "scottish fold": ["Branco", "Preto", "Azul/cinza", "Creme", "Vermelho", "Silver tabby", "Bicolor"],
        "siames": ["Seal point", "Blue point", "Chocolate point", "Lilac point", "Flame point"],
        "siberiano": ["Preto", "Azul/cinza", "Vermelho", "Creme", "Branco", "Silver tabby", "Golden tabby", "Colorpoint"],
        "sphynx": ["Branco", "Preto", "Cinza", "Creme", "Vermelho", "Tartaruga", "Bicolor", "Tricolor"],
    },
};

function normalizarTexto(valor = "") {
    return valor
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();
}

function identificarEspecie(valor = "") {
    const especie = normalizarTexto(valor);

    if (["cachorro", "cachorra", "cao", "canina", "canino"].some((opcao) => especie.includes(opcao))) {
        return "canina";
    }

    if (["gato", "gata", "felina", "felino"].some((opcao) => especie.includes(opcao))) {
        return "felina";
    }

    return "";
}

function buscarCoresPorRaca(especie, raca) {
    const racaNormalizada = normalizarTexto(raca);

    if (!especie || !racaNormalizada) {
        return [];
    }

    if (racaNormalizada.includes("srd") || racaNormalizada.includes("vira-lata")) {
        return CORES_POR_ESPECIE[especie] || [];
    }

    return CORES_POR_RACA[especie]?.[racaNormalizada] || [];
}

function formatarDataInput(valor) {
    return String(valor || "").split("T")[0];
}

function formatarData(valor) {
    const data = formatarDataInput(valor);

    if (!data) {
        return "";
    }

    const [ano, mes, dia] = data.split("-");

    if (!ano || !mes || !dia) {
        return data;
    }

    return `${dia}/${mes}/${ano}`;
}

function CampoComSugestoes({ campo, placeholder, valor, opcoes, alterarCampo }) {
    const listaId = `sugestoes-${campo}`;

    return (
        <>
            <input
                placeholder={placeholder}
                list={listaId}
                value={valor || ""}
                autoComplete="off"
                onChange={(e) => alterarCampo(campo, e.target.value)}
            />

            <datalist id={listaId}>
                {opcoes.map((opcao) => (
                    <option key={opcao} value={opcao} />
                ))}
            </datalist>
        </>
    );
}

export default function PerfilPet() {
    const email = localStorage.getItem("email") || "";
    const [pets, setPets] = useState([]);
    const [carregando, setCarregando] = useState(true);
    const [fichaAberta, setFichaAberta] = useState(null);
    const [fichaDados, setFichaDados] = useState([]);
    const [petEditando, setPetEditando] = useState(null);
    const [abrirEditor, setAbrirEditor] = useState(false);
    const [dadosEdicao, setDadosEdicao] = useState({});


    useEffect(() => {
        document.body.classList.toggle("pet-editor-open", abrirEditor);

        return () => {
            document.body.classList.remove("pet-editor-open");
        };
    }, [abrirEditor]);


    useEffect(() => {

        async function buscarPets() {
            try {
                const res = await fetch(`${API}/pets/${email}`);
                const data = await res.json();


                if (res.ok) {
                    setPets(data);
                }
            } catch {
                alert("Erro ao buscar pets");
            } finally {
                setCarregando(false);
            }
        }

        if (email) buscarPets();
    }, [email]);

    async function editarPet(pet) {
        setPetEditando(pet.id_pet);

        let ficha = {};

        try {
            const res = await fetch(`${API}/ficha-pet/${pet.id_pet}`);
            const data = await res.json();

            if (res.ok && data.length > 0) {
                ficha = data[0];
            }
        } catch {
            console.log("Não foi possível carregar ficha médica");
        }

        setDadosEdicao({
            nome: pet.nome || "",
            especie: pet.especie || "",
            raca: pet.raca || "",
            sexo: pet.sexo || "",
            cor: pet.cor || "",
            peso: pet.peso || "",
            data_nascimento: formatarDataInput(pet.data_nascimento),

            doencas: ficha.doencas || "",
            cirurgias: ficha.cirurgias || "",
            alergias: ficha.alergias || "",
            medicamentos: ficha.medicamentos || "",
            vacinas: ficha.vacinas || "",
            vermifugacao: ficha.vermifugacao ? ficha.vermifugacao.split("T")[0] : "",

            motivo: ficha.motivo || "",
            sintomas: ficha.sintomas || "",
            diagnostico: ficha.diagnostico || "",

            estado_geral: ficha.estado_geral || "",
            mucosas: ficha.mucosas || "",
            hidratacao: ficha.hidratacao || "",
            respiratorio: ficha.respiratorio || "",
            digestivo: ficha.digestivo || "",
            locomotor: ficha.locomotor || "",
            outros: ficha.outros || "",

            exames: ficha.exames || "",
            medicacao: ficha.medicacao || "",
            dosagem: ficha.dosagem || "",
            duracao: ficha.duracao || "",
            observacoes_tratamento: ficha.observacoes_tratamento || "",
        });

        setAbrirEditor(true);
    }



    async function enviarFotoPet(e, id_pet) {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append("foto", file);
        formData.append("id_pet", id_pet);

        try {
            const res = await fetch(`${API}/upload-foto-pet`, {
                method: "POST",
                body: formData,
            });

            const data = await res.json();

            if (res.ok) {
                setPets((lista) =>
                    lista.map((pet) =>
                        pet.id_pet === id_pet ? { ...pet, foto: data.foto } : pet
                    )
                );
            } else {
                alert("Erro ao enviar foto");
            }
        } catch {
            alert("Erro no servidor");
        }
    }

    async function alternarAlertaPet(pet) {
        const novoStatus = pet.perdido ? 0 : 1;

        try {
            const res = await fetch(`${API}/pet/${pet.id_pet}/alerta`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    perdido: novoStatus,
                    email_tutor: email
                })
            });

            const data = await res.json();

            if (!res.ok) {
                alert(data.erro || "Erro ao atualizar alerta do pet");
                return;
            }

            setPets((lista) =>
                lista.map((item) =>
                    item.id_pet === pet.id_pet ? { ...item, perdido: data.perdido } : item
                )
            );
        } catch {
            alert("Erro ao conectar com o servidor");
        }
    }

    if (carregando) {
        return <div className={`card ${surfaceCard}`}>Carregando pets...</div>;
    }

    async function abrirFicha(id_pet) {
        try {
            const res = await fetch(`${API}/ficha-pet/${id_pet}`);
            const data = await res.json();

            if (res.ok) {
                setFichaDados(data);
                setFichaAberta(id_pet);
            } else {
                alert("Erro ao buscar ficha técnica");
            }
        } catch {
            alert("Erro ao conectar com o servidor");
        }
    }

    async function cadastrarPet() {
        try {
            const res = await fetch(`${API}/pet`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    ...dadosEdicao,
                    email_tutor: email
                })
            });

            const data = await res.json();

            if (!res.ok) {
                alert(data.erro || "Erro ao cadastrar");
                return;
            }

            setPets((lista) => [
                ...lista,
                {
                    id_pet: data.id_pet,
                    nome: dadosEdicao.nome || "",
                    especie: dadosEdicao.especie || "",
                    raca: dadosEdicao.raca || "",
                    sexo: dadosEdicao.sexo || "",
                    data_nascimento: dadosEdicao.data_nascimento || "",
                    cor: dadosEdicao.cor || "",
                    peso: dadosEdicao.peso || "",
                    foto: null,
                    perdido: 0,
                }
            ]);

            setAbrirEditor(false);
            setPetEditando(null);
            setDadosEdicao({});

            alert("Pet cadastrado!");

        } catch {
            alert("Erro no servidor");
        }
    }

    if (fichaAberta) {
        return (
            <div className={`card ${surfaceCard}`}>
                <button
                    className="btn-fechar-ficha"
                    onClick={() => {
                        setFichaAberta(null);
                        setFichaDados([]);
                    }}
                >
                    Fechar
                </button>

                <h3>Ficha médica - {fichaDados[0]?.nome}</h3>

                {fichaDados.length === 0 && <p>Nenhuma informação médica cadastrada.</p>}

                {fichaDados.map((item, index) => (
                    <div key={index} className="ficha-bloco">
                        <h4>Histórico clínico</h4>
                        <p><strong>Doenças:</strong> {item.doencas || "—"}</p>
                        <p><strong>Vacinas:</strong> {item.vacinas || "—"}</p>
                        <p><strong>Vermifugação:</strong> {item.vermifugacao || "—"}</p>

                        <h4>Consulta</h4>
                        <p><strong>Data:</strong> {item.data_consulta || "—"}</p>
                        <p><strong>Motivo:</strong> {item.motivo || "—"}</p>
                        <p><strong>Sintomas:</strong> {item.sintomas || "—"}</p>
                        <p><strong>Diagnóstico:</strong> {item.diagnostico || "—"}</p>

                        <h4>Exame clínico</h4>
                        <p><strong>Estado geral:</strong> {item.estado_geral || "—"}</p>
                        <p><strong>Mucosas:</strong> {item.mucosas || "—"}</p>
                        <p><strong>Hidratação:</strong> {item.hidratacao || "—"}</p>
                        <p><strong>Respiratório:</strong> {item.respiratorio || "—"}</p>
                        <p><strong>Digestivo:</strong> {item.digestivo || "—"}</p>
                        <p><strong>Locomotor:</strong> {item.locomotor || "—"}</p>
                        <p><strong>Outros:</strong> {item.outros || "—"}</p>

                        <h4>Tratamento</h4>
                        <p><strong>Diagnóstico:</strong> {item.diagnostico || "—"}</p>
                        <p><strong>Exames:</strong> {item.exames || "—"}</p>
                        <p><strong>Medicação:</strong> {item.medicacao || "—"}</p>
                        <p><strong>Dosagem:</strong> {item.dosagem || "—"}</p>
                        <p><strong>Duração:</strong> {item.duracao || "—"}</p>
                        <p><strong>Observações:</strong> {item.observacoes_tratamento || "—"}</p>
                    </div>
                ))}
            </div>
        );
    }

    function alterarCampo(campo, valor) {
        setDadosEdicao((dadosAtuais) => {
            const novosDados = {
                ...dadosAtuais,
                [campo]: valor
            };

            if (campo === "especie" && identificarEspecie(dadosAtuais.especie) !== identificarEspecie(valor)) {
                novosDados.raca = "";
                novosDados.cor = "";
            }

            if (campo === "raca" && normalizarTexto(dadosAtuais.raca) !== normalizarTexto(valor)) {
                novosDados.cor = "";
            }

            return novosDados;
        });
    }

    async function salvarEdicao() {
        try {
            const res = await fetch(`${API}/editar-pet-completo/${petEditando}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(dadosEdicao)
            });

            const data = await res.json();

            if (!res.ok) {
                alert(data.erro || "Erro ao salvar alterações");
                return;
            }

            alert("Dados atualizados!");

            setPets((lista) =>
                lista.map((pet) =>
                    pet.id_pet === petEditando
                        ? { ...pet, ...dadosEdicao }
                        : pet
                )
            );

            setAbrirEditor(false);
            setPetEditando(null);
        } catch {
            alert("Erro ao conectar com o servidor");
        }
    }

    async function deletarPet() {
        if (!petEditando) return;

        const confirmar = window.confirm("Tem certeza que deseja deletar este pet? Essa acao nao pode ser desfeita.");

        if (!confirmar) {
            return;
        }

        try {
            const res = await fetch(`${API}/pet/${petEditando}`, {
                method: "DELETE"
            });

            const data = await res.json();

            if (!res.ok) {
                alert(data.erro || "Erro ao deletar pet");
                return;
            }

            setPets((lista) => lista.filter((pet) => pet.id_pet !== petEditando));
            setAbrirEditor(false);
            setPetEditando(null);
            setDadosEdicao({});

            alert("Pet deletado!");
        } catch {
            alert("Erro ao conectar com o servidor");
        }
    }

    function petIncompleto(pet) {
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

    const especieSelecionada = identificarEspecie(dadosEdicao.especie);
    const opcoesRaca = especieSelecionada ? RACAS_POR_ESPECIE[especieSelecionada] : [];
    const opcoesCor = buscarCoresPorRaca(especieSelecionada, dadosEdicao.raca);

    return (
        <>
        <div className={`card ${surfaceCard}`}>
            <div className="topo-pet">
                <h3>Perfil do Pet</h3>

                <button
                    className={`btn-add-pet ${solidAction}`}
                    onClick={() => {
                        setDadosEdicao({
                            nome: "",
                            especie: "",
                            raca: "",
                            sexo: "",
                            cor: "",
                            peso: "",
                            data_nascimento: "",
                        });

                        setPetEditando(null);
                        setAbrirEditor(true);
                    }}
                >
                    Cadastrar pet
                </button>
            </div>

            {pets.length === 0 && <p>Nenhum pet cadastrado ainda.</p>}

            {pets.map((pet) => {
                const perdido = petEstaPerdido(pet);

                return (
                <div key={pet.id_pet} className={`pet-card ${tw`rounded-[24px] border-white/70 bg-white/95 shadow-pet-soft`} ${perdido ? "pet-card-perdido" : ""}`}>
                    <label className="pet-foto">
                        {pet.foto ? (
                            <img src={`${API}${pet.foto}`} alt={pet.nome} />
                        ) : (
                            <img src="icone.ico" alt="BuscaPet" className="w-6" />
                        )}

                        <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            onChange={(e) => enviarFotoPet(e, pet.id_pet)}
                        />
                    </label>

                    <div>
                        <h2>
                            {pet.nome}

                            {petIncompleto(pet) && (
                                <span
                                    className="aviso-pet"
                                    title="Está faltando alguns dados do pet"
                                >
                                    !
                                </span>
                            )}
                            {perdido && (
                                <span className="status-pet-perdido" title="Pet em modo perdido">
                                    Perdido
                                </span>
                            )}
                        </h2>
                        <p><strong>Espécie:</strong> {pet.especie || "—"}</p>
                        <p><strong>Raça:</strong> {pet.raca || "—"}</p>
                        <p><strong>Sexo:</strong> {pet.sexo || "—"}</p>
                        <p><strong>Cor:</strong> {pet.cor || "—"}</p>
                        <p><strong>Peso:</strong> {pet.peso || "—"} kg</p>
                        <p><strong>Nascimento:</strong> {formatarData(pet.data_nascimento) || "—"}</p>

                        <button
                            className="btn-ficha"
                            type="button"
                            onClick={() => abrirFicha(pet.id_pet)}
                        >
                            Ficha médica
                        </button>

                        <button
                            className="btn-editar"
                            type="button"
                            onClick={() => editarPet(pet)}
                        >
                            Editar pet
                        </button>

                        <button
                            className={`btn-alerta ${perdido ? "ativo" : ""}`}
                            type="button"
                            onClick={() => alternarAlertaPet(pet)}
                            title={perdido ? "Voltar pet ao normal" : "Marcar pet como perdido"}
                        >
                            {perdido ? "Voltar ao normal" : "Alerta"}
                        </button>

                    </div>
                </div>
                );
            })}

        </div>

            {abrirEditor && (
                    <div className="sheet-bg" onClick={() => setAbrirEditor(false)}>
                        <div
                        className={`sheet ${tw`rounded-t-[30px] border-white/80 bg-white shadow-pet-lift`}`}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="sheet-topo">
                                <h2>
                                    {petEditando ? "Editar Pet" : "Cadastrar Pet"}
                                </h2>
                                <button onClick={() => setAbrirEditor(false)}>×</button>
                            </div>

                            {!petEditando ? (
                                <>
                                    <h3>Dados do pet</h3>

                                    <input
                                        placeholder="Nome"
                                        value={dadosEdicao.nome}
                                        onChange={(e) => alterarCampo("nome", e.target.value)}
                                    />

                                    <CampoComSugestoes
                                        campo="especie"
                                        placeholder="Espécie"
                                        valor={dadosEdicao.especie}
                                        opcoes={OPCOES_ESPECIE}
                                        alterarCampo={alterarCampo}
                                    />

                                    <CampoComSugestoes
                                        campo="raca"
                                        placeholder="Raça"
                                        valor={dadosEdicao.raca}
                                        opcoes={opcoesRaca}
                                        alterarCampo={alterarCampo}
                                    />

                                    <CampoComSugestoes
                                        campo="sexo"
                                        placeholder="Sexo"
                                        valor={dadosEdicao.sexo}
                                        opcoes={OPCOES_SEXO}
                                        alterarCampo={alterarCampo}
                                    />

                                    <CampoComSugestoes
                                        campo="cor"
                                        placeholder="Cor"
                                        valor={dadosEdicao.cor}
                                        opcoes={opcoesCor}
                                        alterarCampo={alterarCampo}
                                    />

                                    <input
                                        placeholder="Peso"
                                        value={dadosEdicao.peso}
                                        onChange={(e) => alterarCampo("peso", e.target.value)}
                                    />

                                    <input
                                        type="date"
                                        value={dadosEdicao.data_nascimento}
                                        onChange={(e) => alterarCampo("data_nascimento", e.target.value)}
                                    />

                                    <button className={`btn-salvar ${solidAction}`} onClick={cadastrarPet}>
                                        Cadastrar pet
                                    </button>
                                </>
                            ) : (
                                <>
                                    <input placeholder="Nome" value={dadosEdicao.nome} onChange={(e) => alterarCampo("nome", e.target.value)} />
                                    <CampoComSugestoes campo="especie" placeholder="Espécie" valor={dadosEdicao.especie} opcoes={OPCOES_ESPECIE} alterarCampo={alterarCampo} />
                                    <CampoComSugestoes campo="raca" placeholder="Raça" valor={dadosEdicao.raca} opcoes={opcoesRaca} alterarCampo={alterarCampo} />
                                    <CampoComSugestoes campo="sexo" placeholder="Sexo" valor={dadosEdicao.sexo} opcoes={OPCOES_SEXO} alterarCampo={alterarCampo} />
                                    <CampoComSugestoes campo="cor" placeholder="Cor" valor={dadosEdicao.cor} opcoes={opcoesCor} alterarCampo={alterarCampo} />
                                    <input placeholder="Peso" value={dadosEdicao.peso} onChange={(e) => alterarCampo("peso", e.target.value)} />
                                    <input type="date" value={formatarDataInput(dadosEdicao.data_nascimento)} onChange={(e) => alterarCampo("data_nascimento", e.target.value)} />

                                    <h3>Histórico clínico</h3>

                                    <textarea placeholder="Doenças" value={dadosEdicao.doencas} onChange={(e) => alterarCampo("doencas", e.target.value)} />
                                    <textarea placeholder="Cirurgias" value={dadosEdicao.cirurgias} onChange={(e) => alterarCampo("cirurgias", e.target.value)} />
                                    <textarea placeholder="Alergias" value={dadosEdicao.alergias} onChange={(e) => alterarCampo("alergias", e.target.value)} />
                                    <textarea placeholder="Medicamentos" value={dadosEdicao.medicamentos} onChange={(e) => alterarCampo("medicamentos", e.target.value)} />
                                    <textarea placeholder="Vacinas" value={dadosEdicao.vacinas} onChange={(e) => alterarCampo("vacinas", e.target.value)} />
                                    <input type="date" value={dadosEdicao.vermifugacao} onChange={(e) => alterarCampo("vermifugacao", e.target.value)} />

                                    <h3>Consulta</h3>

                                    <textarea placeholder="Motivo" value={dadosEdicao.motivo} onChange={(e) => alterarCampo("motivo", e.target.value)} />
                                    <textarea placeholder="Sintomas" value={dadosEdicao.sintomas} onChange={(e) => alterarCampo("sintomas", e.target.value)} />

                                    <h3>Exame clínico</h3>

                                    <input placeholder="Estado geral" value={dadosEdicao.estado_geral} onChange={(e) => alterarCampo("estado_geral", e.target.value)} />
                                    <input placeholder="Mucosas" value={dadosEdicao.mucosas} onChange={(e) => alterarCampo("mucosas", e.target.value)} />
                                    <input placeholder="Hidratação" value={dadosEdicao.hidratacao} onChange={(e) => alterarCampo("hidratacao", e.target.value)} />
                                    <input placeholder="Respiratório" value={dadosEdicao.respiratorio} onChange={(e) => alterarCampo("respiratorio", e.target.value)} />
                                    <input placeholder="Digestivo" value={dadosEdicao.digestivo} onChange={(e) => alterarCampo("digestivo", e.target.value)} />
                                    <input placeholder="Locomotor" value={dadosEdicao.locomotor} onChange={(e) => alterarCampo("locomotor", e.target.value)} />
                                    <textarea placeholder="Outros" value={dadosEdicao.outros} onChange={(e) => alterarCampo("outros", e.target.value)} />

                                    <h3>Tratamento</h3>

                                    <textarea placeholder="Diagnóstico" value={dadosEdicao.diagnostico} onChange={(e) => alterarCampo("diagnostico", e.target.value)} />
                                    <textarea placeholder="Exames" value={dadosEdicao.exames} onChange={(e) => alterarCampo("exames", e.target.value)} />
                                    <textarea placeholder="Medicação" value={dadosEdicao.medicacao} onChange={(e) => alterarCampo("medicacao", e.target.value)} />
                                    <input placeholder="Dosagem" value={dadosEdicao.dosagem} onChange={(e) => alterarCampo("dosagem", e.target.value)} />
                                    <input placeholder="Duração" value={dadosEdicao.duracao} onChange={(e) => alterarCampo("duracao", e.target.value)} />
                                    <textarea placeholder="Observações" value={dadosEdicao.observacoes_tratamento} onChange={(e) => alterarCampo("observacoes_tratamento", e.target.value)} />

                                    <div className="acoes-edicao">
                                        <button className={`btn-salvar ${solidAction}`} onClick={salvarEdicao}>
                                            Salvar alterações
                                        </button>
                                        <button className="btn-deletar" onClick={deletarPet}>
                                            Deletar Pet
                                        </button>
                                    </div>
                                </>
                            )}


                        </div>
                    </div>
            )}
        </>
    );
}

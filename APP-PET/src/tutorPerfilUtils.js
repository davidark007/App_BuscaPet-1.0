export function limparCep(cep) {
    return String(cep || "").replace(/\D/g, "");
}

export function tutorTemCadastroCompleto(dados = {}) {
    return Boolean(
        String(dados.nome || "").trim() &&
        String(dados.cpf || "").trim() &&
        String(dados.telefone || "").trim() &&
        String(dados.endereco || "").trim() &&
        String(dados.bairro || "").trim() &&
        limparCep(dados.cep).length === 8
    );
}

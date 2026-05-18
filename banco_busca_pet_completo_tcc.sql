-- ============================================================
--  BANCO DE DADOS: BUSCA PET - VERSÃO COMPLETA
--  Gerado a partir da planilha banco_busca_pet.xlsx
--  e do script banco_pet_clinica.sql
--  Compatível com MySQL / SQLyog
-- ============================================================

DROP DATABASE IF EXISTS busca_pet;
CREATE DATABASE busca_pet
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE busca_pet;

-- ============================================================
-- TABELA: USUARIO
-- ============================================================
CREATE TABLE usuario (
    id_usuario  INT          NOT NULL AUTO_INCREMENT,
    nome        VARCHAR(150) NOT NULL,
    login       VARCHAR(80)  NOT NULL UNIQUE,
    senha       VARCHAR(255) NOT NULL,
    perfil      VARCHAR(50)  NOT NULL,
    email       VARCHAR(150) NOT NULL UNIQUE,
    PRIMARY KEY (id_usuario)
) ENGINE=INNODB DEFAULT CHARSET=utf8mb4;

INSERT INTO usuario (id_usuario, nome, login, senha, perfil, email) VALUES
(1, 'Fabiana Do Carmo Viana',         'fabiana.viana', '$2b$12$hS6qI.Qbb05q1pbXW5dWxOzrO2ZPYWi7mkaG1lXXw5kdeliEKupWG', 'Tutor', 'fabianaviana.vta@hotmail.com'),
(2, 'Karina Moreira Da Cunha',        'karina.cunha',  '$2b$12$wWD6cV1DWp.eN9zZITht.ePTETwxMhxaB4hyvgEBf0R01ry6Bb4wi', 'Tutor', 'karinarubi35@gmail.com'),
(3, 'Ana Carolina Santos De Almeida', 'ana.santos',    '$2b$12$MRhuGJK3ssclz9lz.AkvOOJK91PgxUBRikEo9S5FGZ/rzxOwxXxLW', 'Tutor', 'carol_rhw@live.com'),
(4, 'Davi Vieira Gomes Agostinho',    'davi.gomes',    '$2b$12$hIKFhAHNpFIwmqqVljq3TeAzcT/0EweciMvRNbSTP9E3/ZcHhoTli', 'Tutor', 'davivieiraagostinho2017@gmail.com');

-- ============================================================
-- TABELA: TUTOR
-- ============================================================
CREATE TABLE tutor (
    id_tutor  INT          NOT NULL AUTO_INCREMENT,
    nome      VARCHAR(512) NOT NULL,
    cpf       VARCHAR(512) NOT NULL UNIQUE,
    cpf_hash  CHAR(64)     UNIQUE,
    telefone  VARCHAR(512),
    email     VARCHAR(150) NOT NULL UNIQUE,
    endereco  TEXT,
    bairro    VARCHAR(512),
    cep       VARCHAR(512),
    PRIMARY KEY (id_tutor)
) ENGINE=INNODB DEFAULT CHARSET=utf8mb4;

INSERT INTO tutor (id_tutor, nome, cpf, telefone, email, endereco, bairro, cep) VALUES
(1, 'Fabiana Viana',       '342.882.208-07', '(16) 98219-9120', 'fabianaviana.vta@hotmail.com',      'Rua Joao Carvalho Rufino, 1200',         'Terras de Santa Marta',            '14037-402'),
(2, 'Karina Cunha',        '217.438.118-45', '(16) 99739-2762', 'karinarubi35@gmail.com',             'Travessa Ponta Grossa, 101',             'Ipiranga',                         '14055-494'),
(3, 'Ana Carolina Almeida','434.096.268-67', '(16) 98106-3061', 'carol_rhw@live.com',                 'Avenida Eduardo Andrea Matarazzo, 4635', 'Valentina Figueiredo',             '14061-710'),
(4, 'Davi Agostinho',      '530.166.358-52', '(16) 99315-1346', 'davivieiraagostinho2017@gmail.com',  'Rua Durval Carolo, 97',                  'Conj. Hab. Pref. Orlando Fonseca', '14182-349');

-- ============================================================
-- TABELA: PET
-- ============================================================
CREATE TABLE pet (
    id_pet          INT           NOT NULL AUTO_INCREMENT,
    nome            VARCHAR(100)  NOT NULL,
    especie         VARCHAR(50)   NOT NULL,
    raca            VARCHAR(80),
    sexo            VARCHAR(20),
    data_nascimento DATE,
    cor             VARCHAR(50),
    peso            DECIMAL(5,2)  NULL,
    perdido         TINYINT(1)    NOT NULL DEFAULT 0,
    id_tutor        INT           NOT NULL,
    PRIMARY KEY (id_pet),
    CONSTRAINT fk_pet_tutor
        FOREIGN KEY (id_tutor) REFERENCES tutor(id_tutor)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
) ENGINE=INNODB DEFAULT CHARSET=utf8mb4;

INSERT INTO pet (id_pet, nome, especie, raca, sexo, data_nascimento, cor, peso, perdido, id_tutor) VALUES
(1, 'Mel',      'Gato',     'SRD',   'Femea', '2015-04-08', 'Tricolor', NULL, 0, 1),
(2, 'Marceline','Gato',     'Perca', 'Femea', '2021-05-20', 'Bicolor',  NULL, 0, 2),
(3, 'Alemao',   'Gato',     'SRD',   'Macho', '2014-03-15', 'Bicolor',  NULL, 0, 2),
(4, 'Hyun woo', 'Cachorro', 'Shitzu','Macho', '2024-05-22', 'Maron',    NULL, 0, 2),
(5, 'Yume',     'Cachorro', 'Shitzu','Femea', '2015-08-18', 'Maron',    NULL, 0, 3),
(6, 'Ariel',    'Cachorro', 'SRD',   'Femea', '2014-06-13', 'Bicolor',  NULL, 0, 4),
(7, 'Ayumy',    'Cachorro', 'SRD',   'Femea', '2024-10-18', 'Branca',   NULL, 0, 4);

-- ============================================================
-- TABELA: HISTORICO_CLINICO
-- Relacionamento 1:1 com PET (UNIQUE em id_pet)
-- ============================================================
CREATE TABLE historico_clinico (
    id_historico INT          NOT NULL AUTO_INCREMENT,
    id_pet       INT          NOT NULL UNIQUE,
    doencas      VARCHAR(255),
    cirurgias    VARCHAR(255),
    alergias     VARCHAR(255),
    medicamentos VARCHAR(255),
    vacinas      VARCHAR(255),
    vermifugacao DATE,
    PRIMARY KEY (id_historico),
    CONSTRAINT fk_historico_pet
        FOREIGN KEY (id_pet) REFERENCES pet(id_pet)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
) ENGINE=INNODB DEFAULT CHARSET=utf8mb4;

INSERT INTO historico_clinico (id_historico, id_pet, doencas, cirurgias, alergias, medicamentos, vacinas, vermifugacao) VALUES
(1, 1, 'Rinite',  'Nenhuma', 'Dipirona', 'Nenhum', 'Triplice Felina', '2026-01-01'),
(2, 2, 'Nenhuma', 'Nenhuma', 'Nenhuma',  'Nenhum', 'Triplice Felina', '2026-03-01'),
(3, 3, 'Nenhuma', 'Nenhuma', 'Nenhuma',  'Nenhum', 'Triplice Felina', '2026-02-01'),
(4, 4, 'Nenhuma', 'Nenhuma', 'Nenhuma',  'Nenhum', 'V8, Antirrabica', '2026-03-01'),
(5, 5, 'Nenhuma', 'Nenhuma', 'Nenhuma',  'Nenhum', 'V8, Antirrabica', '2026-01-01'),
(6, 6, 'Nenhuma', 'Nenhuma', 'Nenhuma',  'Nenhum', 'V8, Antirrabica', '2026-02-01'),
(7, 7, 'Nenhuma', 'Hernia',  'Nenhuma',  'Nenhum', 'V8, Antirrabica', '2026-02-01');

-- ============================================================
-- TABELA: CONSULTA
-- ============================================================
CREATE TABLE consulta (
    id_consulta   INT          NOT NULL AUTO_INCREMENT,
    id_pet        INT          NOT NULL,
    id_usuario    INT          NOT NULL,
    data_consulta DATE         NOT NULL,
    motivo        VARCHAR(255),
    sintomas      VARCHAR(255),
    PRIMARY KEY (id_consulta),
    CONSTRAINT fk_consulta_pet
        FOREIGN KEY (id_pet) REFERENCES pet(id_pet)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT fk_consulta_usuario
        FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
) ENGINE=INNODB DEFAULT CHARSET=utf8mb4;

INSERT INTO consulta (id_consulta, id_pet, id_usuario, data_consulta, motivo, sintomas) VALUES
(1, 1, 1, '2026-05-10', 'Check-up anual',     'Sem sintomas'),
(2, 6, 4, '2026-05-12', 'Espirros frequentes', 'Espirros, coriza');

-- ============================================================
-- TABELA: EXAME_CLINICO
-- Relacionamento 1:1 com CONSULTA (UNIQUE em id_consulta)
-- ============================================================
CREATE TABLE exame_clinico (
    id_exame     INT          NOT NULL AUTO_INCREMENT,
    id_consulta  INT          NOT NULL UNIQUE,
    estado_geral VARCHAR(100),
    mucosas      VARCHAR(100),
    hidratacao   VARCHAR(100),
    respiratorio VARCHAR(100),
    digestivo    VARCHAR(100),
    locomotor    VARCHAR(100),
    outros       VARCHAR(255),
    PRIMARY KEY (id_exame),
    CONSTRAINT fk_exame_consulta
        FOREIGN KEY (id_consulta) REFERENCES consulta(id_consulta)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
) ENGINE=INNODB DEFAULT CHARSET=utf8mb4;

INSERT INTO exame_clinico (id_exame, id_consulta, estado_geral, mucosas, hidratacao, respiratorio, digestivo, locomotor, outros) VALUES
(1, 1, 'Bom',     'Roseas',  'Normal', 'Normal',       'Normal', 'Normal', 'Nenhum'),
(2, 2, 'Regular', 'Palidas', 'Normal', 'Comprometido', 'Normal', 'Normal', 'Descarga nasal');

-- ============================================================
-- TABELA: TRATAMENTO
-- Relacionamento 1:1 com CONSULTA (UNIQUE em id_consulta)
-- ============================================================
CREATE TABLE tratamento (
    id_tratamento INT          NOT NULL AUTO_INCREMENT,
    id_consulta   INT          NOT NULL UNIQUE,
    diagnostico   VARCHAR(255),
    exames        VARCHAR(255),
    medicacao     VARCHAR(255),
    dosagem       VARCHAR(100),
    duracao       VARCHAR(100),
    observacoes   VARCHAR(255),
    PRIMARY KEY (id_tratamento),
    CONSTRAINT fk_tratamento_consulta
        FOREIGN KEY (id_consulta) REFERENCES consulta(id_consulta)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
) ENGINE=INNODB DEFAULT CHARSET=utf8mb4;

INSERT INTO tratamento (id_tratamento, id_consulta, diagnostico, exames, medicacao, dosagem, duracao, observacoes) VALUES
(1, 1, 'Saudavel',       'Hemograma',    'Nenhuma',     '-',        '-',      'Retorno em 1 ano'),
(2, 2, 'Rinite alergica','Raspado nasal','Antialergico', '1 cp/dia', '10 dias','Evitar poeira');

-- ============================================================
-- TABELA: RETORNO
-- Relacionamento 1:1 com CONSULTA (UNIQUE em id_consulta)
-- data_retorno gravado como NULL quando não há data definida
-- ============================================================
CREATE TABLE retorno (
    id_retorno   INT          NOT NULL AUTO_INCREMENT,
    id_consulta  INT          NOT NULL UNIQUE,
    necessario   VARCHAR(10),
    data_retorno DATE         NULL,
    observacoes  VARCHAR(255),
    PRIMARY KEY (id_retorno),
    CONSTRAINT fk_retorno_consulta
        FOREIGN KEY (id_consulta) REFERENCES consulta(id_consulta)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
) ENGINE=INNODB DEFAULT CHARSET=utf8mb4;

INSERT INTO retorno (id_retorno, id_consulta, necessario, data_retorno, observacoes) VALUES
(1, 1, 'Nao', NULL,         'Paciente saudavel'),
(2, 2, 'Sim', '2024-05-22', 'Verificar melhora dos sintomas');

-- ============================================================
-- FIM DO SCRIPT
-- ============================================================

ALTER TABLE tutor ADD foto VARCHAR(255);
ALTER TABLE tutor ADD latitude VARCHAR(512);
ALTER TABLE tutor ADD longitude VARCHAR(512);

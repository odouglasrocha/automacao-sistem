# Sistema ICS Industrial - Descrição completa e manual de conexão ao CLP

## 1. Visão geral

O sistema desenvolvido nesta workspace é uma plataforma industrial web, com foco em monitoramento, supervisão, controle operacional e integração com equipamentos de automação, especialmente CLPs Allen-Bradley e outros dispositivos industriais.

A proposta da solução é reunir, em uma interface única, funções de:

- supervisão de chão de fábrica;
- MES (Manufacturing Execution System);
- SCADA (Supervisory Control and Data Acquisition);
- IIoT;
- manutenção;
- qualidade;
- almoxarifado;
- energia;
- administração multi-tenant;
- configuração exclusiva por máquina.

A interface é responsiva e foi organizada em módulos, permitindo que operação, engenharia, manutenção e gestão acompanhem o desempenho industrial em tempo real.

---

## 2. Arquitetura do sistema

### 2.1 Frontend
O frontend é construído com:

- React
- TypeScript
- Vite
- Tailwind CSS
- shadcn/ui
- React Router
- TanStack Query

A navegação é organizada em módulos e rotas, o que facilita a expansão do sistema para novas funcionalidades.

### 2.2 Backend e persistência
A aplicação utiliza integração com Supabase para:

- autenticação;
- persistência de dados operacionais;
- armazenamento de configurações de máquinas;
- histórico de conexões, diagnósticos e logs;
- configuração por máquina e por usuário.

### 2.3 Integração industrial
O projeto já contempla a lógica de comunicação industrial com:

- EtherNet/IP;
- OPC-UA;
- MQTT;
- Modbus TCP/RTU;
- Profinet;
- Profibus;
- comunicação via gateway industrial.

O fluxo principal de integração é baseado em um driver específico para Allen-Bradley, com persistência de status e diagnóstico por máquina.

---

## 3. Funcionalidades do sistema

### 3.1 Dashboard principal
O dashboard inicial funciona como painel industrial consolidado da planta.

Funcionalidades principais:

- visualização de OEE geral;
- disponibilidade, performance e qualidade;
- produção por hora;
- consumo de energia;
- visão de máquinas em produção;
- painel de alarmes;
- painel Andon digital;
- gráfico de produção histórica;
- apontamento de produção por operador;
- configuração rápida de máquina quando disponível.

Este módulo é o principal ponto de operação para supervisão da linha.

### 3.2 Chão de fábrica
Este módulo mostra um mapa operacional completo da frota de máquinas.

Funcionalidades:

- listagem de máquinas e status;
- distinção entre máquinas em produção, ociosas, em setup, manutenção, falha ou parada;
- alocação de SKU para máquinas;
- apontamento manual por operador;
- configuração da máquina por ativo.

É o módulo mais próximo da visão operacional do chão de fábrica.

### 3.3 MES – Ordens de produção
O módulo de MES concentra o controle da produção executada.

Funcionalidades:

- ordens de produção;
- planejamento de produção;
- acompanhamento de progresso em unidades;
- status de ordens: produzindo, pausada, concluída ou na fila;
- relacionamento entre plano, SKU e máquinas;
- apontamento por operador e máquina;
- rastreabilidade operacional.

### 3.4 SCADA – Supervisão
O módulo SCADA oferece uma visão de supervisão da planta.

Funcionalidades:

- tendências históricas;
- sinóticos de máquinas;
- alarmes operacionais;
- visualização de parâmetros de máquina;
- acompanhamento de sinais e telemetria industrial.

### 3.5 Manutenção industrial
O módulo de manutenção reúne o acompanhamento das ordens de serviço.

Funcionalidades:

- ordens preventivas;
- ordens corretivas;
- ordens preditivas;
- gestão de prioridade;
- indicadores de MTBF e MTTR;
- histórico de intervenções e atividades.

### 3.6 Almoxarifado
O módulo de almoxarifado é voltado para gestão de materiais e estoque.

Funcionalidades:

- visualização de SKUs em estoque;
- entradas e saídas;
- níveis de estoque;
- indicadores de reposição;
- rastreabilidade de materiais;
- suporte para gestão logística interna.

### 3.7 Energia e sustentabilidade
Este módulo é pensado para monitorar o consumo energético da planta.

Funcionalidades:

- consumo por linha e ativo;
- medição de demanda;
- indicadores de eficiência energética;
- suporte à análise de sustentabilidade e custos.

### 3.8 IIoT
O módulo IIoT organiza a visão dos dispositivos conectados.

Funcionalidades:

- mapeamento de gateways e dispositivos edge;
- visualização de protocolos como OPC-UA, MQTT, Modbus TCP e Profinet;
- monitoramento de uptime;
- gestão de conectividade industrial e latência.

### 3.9 IA e insights
Este módulo é preparado para análise inteligente de dados industriais.

Funcionalidades previstas:

- predição de falhas;
- detecção de anomalias;
- análise de gargalos;
- otimização de setup;
- perguntas em linguagem natural sobre dados.

### 3.10 Relatórios
O módulo de relatórios permite consolidar dados para tomada de decisão.

Funcionalidades:

- relatórios operacionais;
- relatórios gerenciais;
- exportação para PDF, Excel e CSV;
- integração com Power BI.

### 3.11 Qualidade
O módulo de qualidade organiza o controle do processo e da conformidade.

Funcionalidades:

- FTQ e indicadores de qualidade;
- não conformidades;
- inspeções;
- risco e ação corretiva;
- rastreabilidade e controle de processo.

### 3.12 Administração multi-tenant
O módulo de administração suporta a organização empresarial e a segurança do sistema.

Funcionalidades:

- empresas (tenants);
- plantas;
- unidades;
- setores;
- linhas;
- áreas;
- turnos;
- calendários;
- feriados;
- usuários e perfis.

### 3.13 Configurações do sistema
A área de configurações concentra os ajustes transversais do sistema.

Funcionalidades:

- configuração de integrações com ERP, SAP, SharePoint e Power BI;
- configurações de bancos de dados;
- parâmetros do sistema;
- segurança e LGPD;
- configuração de aquisição de dados por ativo EA;
- acesso a uma configuração exclusiva por máquina.

---

## 4. Configuração exclusiva por máquina

Uma das funcionalidades mais importantes do sistema é a configuração exclusiva por máquina.

Essa configuração é organizada em categorias, como:

- informações da máquina;
- comunicação;
- controlador;
- hardware;
- tags;
- receitas;
- alarmes;
- permissões;
- diagnóstico;
- histórico;
- auditoria.

Essas informações são pensadas para serem persistidas por máquina, sem ligação global, o que é fundamental em ambientes industriais com múltiplos ativos.

---

## 5. Integração com CLP e comunicação industrial

### 5.1 Como o sistema aborda a comunicação com o CLP
O sistema possui uma estrutura preparada para comunicação com CLPs industriais, especialmente Allen-Bradley.

O fluxo de integração é composto por:

1. cadastro da máquina;
2. definição do protocolo de comunicação;
3. definição do IP, porta e parâmetros de rede;
4. configuração do fabricante, modelo e firmware;
5. mapeamento de tags;
6. diagnóstico e conexão;
7. leitura de dados em tempo real;
8. persistência de status e logs.

### 5.2 Comportamento atual do projeto
No estado atual do projeto, a aplicação já tem a estrutura de comunicação implementada, mas a interação em browser é tratada como simulação padrão em muitos cenários, enquanto a integração real com o CLP é esperada por meio de gateway industrial ou ambiente de produção adequado.

Em outras palavras:

- a interface está pronta para receber dados reais;
- o driver de comunicação foi modelado para este propósito;
- a configuração do CLP pode ser feita pela tela de Configurações;
- o modo de produção depende de ambiente e infraestrutura correta.

---

## 6. Manual prático de conexão do sistema ao CLP

### 6.1 Pré-requisitos
Antes de conectar o sistema ao CLP, confirme:

- rede Ethernet disponível e acessível;
- IP do CLP definido e conhecido;
- porta de comunicação liberada;
- gateway e máscara de rede corretos;
- o CLP suportando o protocolo desejado (EtherNet/IP, OPC-UA, Modbus TCP etc.);
- acesso ao sistema com permissão para configuração.

### 6.2 Passo 1 - Preparar a estrutura no banco
Execute os scripts SQL disponibilizados na pasta docs/sql:

- docs/sql/0003_ea_clp.sql
- docs/sql/0010_config_exclusiva.sql

Esses scripts criam as tabelas para:

- máquinas;
- modelos de CLP;
- comunicação;
- tags;
- logs;
- status;
- diagnóstico;
- auditoria.

### 6.3 Passo 2 - Acessar o módulo de Configurações
No sistema, entre em:

- Configurações

Na área de aquisição de dados por ativo, selecione a máquina EA correspondente.

### 6.4 Passo 3 - Configurar a comunicação
Na aba de comunicação, informe:

- protocolo: EtherNet/IP é o padrão do projeto;
- IP do CLP;
- máscara de rede;
- gateway;
- DNS, se aplicável;
- porta do protocolo;
- timeout;
- intervalo de leitura;
- heartbeat;
- keep alive;
- reconexão automática;
- modo de operação: produção ou simulação.

Valores típicos para EtherNet/IP:

- protocolo: EtherNet/IP
- porta: 44818
- modo: produção

### 6.5 Passo 4 - Configurar o controlador
Na aba de controlador, informe:

- fabricante;
- modelo do CLP;
- família;
- número de série;
- firmware;
- revisão;
- slot e rack, quando aplicável;
- status ativo.

### 6.6 Passo 5 - Definir tags do CLP
Na aba de tags, cadastre as variáveis que serão lidas pelo sistema.

Exemplos de tags comuns:

- EFICIÊNCIA
- PRODUÇÃO ATUAL
- DESCARGAS
- TOTAL(Kg)
- PARADA
- PRODUZINDO
- ALIMENTANDO
- AGUARDANDO
- TOTAL LIGADA
- TEMPERATURA
- CORRENTE

Cada tag deve ter:

- nome;
- descrição;
- tipo de dado;
- unidade;
- endereço ou referência da tag;
- leitura/escrita;
- flag de obrigatoriedade.

### 6.7 Passo 6 - Testar conexão
Na aba de diagnóstico:

- clique em Conectar;
- teste o Ping;
- teste o EtherNet/IP;
- execute o Handshake;
- teste a leitura de tag;
- valide a identidade do controlador.

Se tudo estiver correto, o sistema deve alterar o status para conectado e começar a registrar o tempo de resposta e os valores lidos.

### 6.8 Passo 7 - Validar o funcionamento em produção
Após a conexão, confirme:

- status da máquina mudou para conectado;
- valores aparecem corretamente no dashboard;
- a produção é atualizada na tela;
- os logs e diagnósticos são gravados corretamente no banco.

### 6.9 Troubleshooting
Se a conexão falhar, verifique:

- IP do CLP correto;
- porta liberada e correta;
- roteamento de rede;
- VLAN ou firewall bloqueando a comunicação;
- gateway incorreto;
- CLP em modo de comunicação compatível;
- uso do gateway industrial correto para comunicação CIP;
- suporte ao protocolo selecionado.

---

## 7. Recomendações de uso

- utilize o modo produção somente em ambiente real e validado;
- mantenha o modo simulação para testes preliminares;
- registre tags e alarmes por máquina para evitar conflitos;
- mantenha histórico de diagnósticos e logs para auditoria;
- use o centro de configuração exclusiva para não espalhar dados por vários pontos do sistema.

---

## 8. Resumo executivo

Este sistema oferece uma plataforma industrial completa para monitorar, controlar e analisar operações de manufatura. Ele já incorpora uma visão forte de:

- supervisão em tempo real;
- controle operacional;
- rastreabilidade;
- manutenção;
- qualidade;
- integração industrial;
- configuração exclusiva por máquina;
- persistência de dados e histórico.

A conexão ao CLP é feita por meio de uma estrutura de configuração industrial bem definida, com foco em Allen-Bradley e protocolos industriais modernos, permitindo evolução para cenários de produção reais com segurança e rastreabilidade.

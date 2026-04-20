# Ficha Técnica - LogTransf (Versão Beta)

Este documento descreve a arquitetura técnica e as tecnologias utilizadas no desenvolvimento do LogTransf.

## 1. Stack Tecnológica
- **Linguagem Principal**: JavaScript (ES6+).
- **Estruturação**: HTML5 Semântico.
- **Estilização**: CSS3 com variáveis nativas e Grid Layout.
- **Gráficos**: Chart.js v4.x para visualização de dados.
- **Iconografia**: Lucide Icons (SVG-based).
- **Exportação**: SheetJS (XLSX) para geração de planilhas.

## 2. Arquitetura de Dados
- **Armazenamento**: `localStorage` do navegador para persistência offline.
- **Gerenciamento de Estado**: Objeto `Store` centralizado com CRUD genérico.
- **Sessão**: `sessionStorage` para controle de autenticação temporária.

## 3. Estrutura de Arquivos
```
/root
  index.html (Ponto de entrada)
  /css
    styles.css (Temas e Layout Global)
    components.css (Componentes Dinâmicos)
  /js
    app.js (Orquestrador da Lógica)
    store.js (Banco de Dados Local)
    utils.js (Utilitários de Data/ID)
    components.js (Fábrica de UI e Modais)
    /modules
      dashboard.js (Módulo de Indicadores)
      viagens.js (Lançamentos e Exportações)
      saldo.js (Gestão de Saldo)
      gestao.js (Configurações e Usuários)
```

## 4. Segurança e Permissões (RBAC)
O sistema implementa uma hierarquia de 3 níveis através da variável `user.grupo`:
1. **ADM**: Acesso full.
2. **SUPERVISOR**: Operacional + Usuários.
3. **OPERADOR**: Acesso restrito a lançamentos.

## 5. Requisitos de Sistema
- Navegador moderno com suporte a LocalStorage e ES6 Modules.
- Resolução mínima recomendada: 1366x768 (Desktop).

---
&copy; 2024 NobelPack - Engenharia de Software

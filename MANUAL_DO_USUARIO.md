# Manual do Usuário - LogTransf (Versão Beta)

Este documento orienta o uso do sistema LogTransf para a gestão de transferências de paletes na NobelPack.

## 1. Acesso ao Sistema
1. Abra o arquivo `index.html` em seu navegador (recomendado: Google Chrome ou Microsoft Edge).
2. Na tela de login, insira suas credenciais:
   - **Administrador**: `admin` / `Senha123`
   - **Supervisor**: `super` / `Senha123`
   - **Operador**: `oper` / `Senha123`

## 2. Funcionalidades Principais

### 2.1 Lançamento de Viagens
Nesta aba, você registra cada saída de carreta.
- Selecione o **Motorista** e o **Tipo de Carreta**.
- Informe a **Quantidade de Paletes** carregados.
- Verifique a **Ocupação %** (calculada automaticamente vs. capacidade da carreta).

### 2.2 Saldo Diário
Deve ser preenchido no início de cada turno.
- Informe o **Saldo Inicial** de paletes disponíveis para carregamento no dia.
- Use o campo de **Observação** para registrar atrasos ou problemas na produção.

### 2.3 Painel de Indicadores (Dashboard)
Visualização em tempo real da operação:
- **Volume Realizado**: Comparativo entre Convencional e Double Deck.
- **Eficiência de Escoamento**: Gráfico de Saldo Inicial vs. Volume Realizado dia a dia.
- **Médias de Viagens**: Monitoramento de produtividade por tipo de veículo.

## 3. Gestão e Configurações (Nível ADM/Supervisor)
- **Motoristas/Carretas/Locais**: Cadastro e edição de ativos operacionais.
- **Usuários**: Criação de novos acessos e redefinição de senhas para o padrão `Senha123`.
- **Manutenção**: Exportação de Backup (JSON) e limpeza de dados históricos.

## 4. Exportação de Dados
Em todas as listagens, utilize o botão **Exportar Excel**. 
- O sistema solicitará o período (Diferencial: padrão fixo de últimos 15 dias).
- O arquivo gerado é compatível com Excel, Google Sheets e LibreOffice.

---
&copy; 2024 NobelPack - Logística Inteligente

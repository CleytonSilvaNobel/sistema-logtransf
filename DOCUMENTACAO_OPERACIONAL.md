# Documentação Operacional - LogTransf (Versão Beta)

Este documento estabelece as rotinas de manutenção e salvaguarda dos dados da operação NobelPack.

## 1. Rotina de Backup (JSON)
Devido ao uso de `localStorage`, os dados ficam armazenados localmente no navegador por máquina.
- **Recomendação**: Realizar backup semanalmente.
- **Procedimento**:
  1. Login como ADM.
  2. Acesse **Gestão > Manutenção**.
  3. Clique em **Exportar JSON**.
  4. Salve o arquivo em rede segura ou nuvem.

## 2. Manutenção de Cadastro
- **Motoristas**: Devem ser mantidos ativos apenas os que possuem escalas regulares.
- **Carretas**: Alterações de capacidade devem ser discutidas com a gerência antes da atualização.
- **Senhas**: Em caso de perda, Supervisors podem resetar para o padrão `Senha123`.

## 3. Limpeza de Histórico
A opção **Limpar Lançamentos** apaga o histórico de produtividade, permitindo o reinício de ciclos (como novos meses ou quinzendas).
- **Atenção**: Sempre faça backup antes de limpar os dados operacionais.

## 4. Troubleshooting
- **Dados desaparecidos**: Verifique se o navegador limpou o cache ou se você está usando uma "Janela Anônima" (Janelas anônimas não persistem dados).
- **Erro de Exportação**: Verifique se o período selecionado possui registros correlatos.

---
&copy; 2024 NobelPack - Operações Logísticas

/**
 * AIModule - Intelligent Assistant for LogTransf
 * Replicates the LogAgend experience with a floating bubble and direct Gemini integration.
 */

const AIModule = (() => {
    let isOpen = false;
    let messages = [];

    const getConfig = () => Store.get('config').ai_config || { apiKey: '', model: 'gemini-1.5-flash', instructions: '' };

    const generateContext = () => {
        const db = Store.loadDB();
        const config = Store.get('config');
        const historico_custos = config.custos_historico || [];
        
        // Vehicle Map
        const vMap = {};
        db.carretas.forEach(c => { vMap[c.id] = c.descricao; });

        // Driver Map
        const driversList = db.motoristas || [];
        const driverMap = {};
        driversList.forEach(m => { driverMap[m.id] = m.nome; });

        // ---- Driver Ranking ----
        const driverCounts = {};
        db.viagens.forEach(v => {
            const name = driverMap[v.id_motorista] || v.motorista || 'Indefinido';
            driverCounts[name] = (driverCounts[name] || 0) + 1;
        });
        const driverRanking = Object.entries(driverCounts)
            .sort((a,b) => b[1] - a[1])
            .slice(0, 10)
            .map(d => `${d[0]}: ${d[1]} viagens`)
            .join(' | ');

        // ---- Vehicle Usage ----
        const vCounts = {};
        db.viagens.forEach(v => {
            const type = vMap[v.id_tipo_carreta] || 'Outros';
            vCounts[type] = (vCounts[type] || 0) + 1;
        });
        const vehicleSummary = Object.entries(vCounts)
            .map(v => `${v[0]}: ${v[1]} viagens`)
            .join(' | ');

        // ---- Monthly Aggregation (for cost and occupancy questions) ----
        const monthlyData = {};
        db.viagens.forEach(v => {
            const monthKey = v.data ? v.data.substring(0, 7) : 'unknown'; // YYYY-MM
            if (!monthlyData[monthKey]) {
                monthlyData[monthKey] = { 
                    viagens: 0, paletes: 0, 
                    c1_viagens: 0, c1_paletes: 0, c1_ocupacao_sum: 0, c1_custo_fixo: 0,
                    c2_viagens: 0, c2_paletes: 0, c2_ocupacao_sum: 0, c2_custo_fixo: 0
                };
            }
            const m = monthlyData[monthKey];
            m.viagens++;
            m.paletes += (v.quantidade_paletes || 0);

            const custosDia = Store.getCustosForDate(v.data);
            if (v.id_tipo_carreta === 'c1') {
                m.c1_viagens++;
                m.c1_paletes += (v.quantidade_paletes || 0);
                m.c1_ocupacao_sum += (v.ocupacao || 0);
                m.c1_custo_fixo += (v.capacidade_carreta || 0) * (custosDia['c1'] || 0);
            } else if (v.id_tipo_carreta === 'c2') {
                m.c2_viagens++;
                m.c2_paletes += (v.quantidade_paletes || 0);
                m.c2_ocupacao_sum += (v.ocupacao || 0);
                m.c2_custo_fixo += (v.capacidade_carreta || 0) * (custosDia['c2'] || 0);
            }
        });

        const monthlySummary = Object.entries(monthlyData)
            .sort((a,b) => b[0].localeCompare(a[0]))
            .slice(0, 6)
            .map(([month, d]) => {
                const custoConv = d.c1_custo_fixo;
                const custoDD = d.c2_custo_fixo;
                const custoTotal = custoConv + custoDD;
                const custoMedioPalete = d.paletes > 0 ? (custoTotal / d.paletes) : 0;
                const occConv = d.c1_viagens > 0 ? (d.c1_ocupacao_sum / d.c1_viagens) : 0;
                const occDD = d.c2_viagens > 0 ? (d.c2_ocupacao_sum / d.c2_viagens) : 0;

                return `[Mês:${month}|Viagens:${d.viagens}|Paletes:${d.paletes}|Conv(vgs:${d.c1_viagens},plts:${d.c1_paletes},occ:${occConv.toFixed(1)}%,custoFixo:R$${custoConv.toFixed(2)})|DD(vgs:${d.c2_viagens},plts:${d.c2_paletes},occ:${occDD.toFixed(1)}%,custoFixo:R$${custoDD.toFixed(2)})|CustoTotalFixo:R$${custoTotal.toFixed(2)}|CustoEfetivo/Palete:R$${custoMedioPalete.toFixed(2)}]`;
            }).join('\n');

        // ---- Detailed Trips (last 50) ----
        const detailedTrips = db.viagens.slice(-50).map(t => {
            const driverName = driverMap[t.id_motorista] || t.motorista || 'Indefinido';
            const vehicleName = vMap[t.id_tipo_carreta] || 'Desconhecida';
            const custosDia = Store.getCustosForDate(t.data);
            const custoBase = custosDia[t.id_tipo_carreta] || 0;
            const cap = t.capacidade_carreta || 0;
            const plts = t.quantidade_paletes || 0;
            const custoFixoViagem = cap * custoBase;
            const custoEfetivoPlt = plts > 0 ? (custoFixoViagem / plts) : 0;
            return `[Data:${t.data}|Motorista:${driverName}|Tipo:${vehicleName}|Paletes:${plts}|Capac:${cap}|Ocup:${t.ocupacao}%|CustoFixoViagem:R$${custoFixoViagem.toFixed(2)}|CustoEfetivo/Plt:R$${custoEfetivoPlt.toFixed(2)}]`;
        }).join('\n');

        // ---- Balances ----
        const balances = db.saldos.slice(-7).map(s => 
            `[Data:${s.data}|Saldo:${s.saldo_atual}|Mov:${(s.total_entrada || 0) - (s.total_saida || 0)}]`
        ).join('\n');

        return `
        DADOS DA OPERAÇÃO (${config.nome_empresa}):
        - Total de Viagens: ${db.viagens.length}
        - Total de Motoristas: ${db.motoristas.length}
        - Total de Trações: ${db.carretas.length}

        RESUMO DE PRODUTIVIDADE (CONSOLIDADO):
        - Top Motoristas: ${driverRanking || 'Sem dados'}
        - Uso de Frota: ${vehicleSummary || 'Sem dados'}

        DICIONÁRIO DE VEÍCULOS:
        ${db.carretas.map(c => `- ID: ${c.id} | ${c.descricao}: Capacidade ${c.capacidade} paletes.`).join('\n')}

        HISTÓRICO E VIGÊNCIA DE CUSTOS (Usado para o cálculo histórico de todas as viagens):
        ${historico_custos.length > 0 ? historico_custos.map(h => `- Vigente a partir de ${h.data_vigencia}: Conv R$ ${h.c1}, DD R$ ${h.c2}`).join('\n') : '- ATENÇÃO: Custos ainda não configurados pelo gestor.'}
        (Nota: Viagens sem data de vigência coberta usam custo 0).
        RESUMO MENSAL (ÚLTIMOS 6 MESES - COM CUSTOS FIXOS E EFETIVOS):
        ${monthlySummary || 'Sem dados mensais.'}

        ÚLTIMAS 50 VIAGENS (HISTÓRICO DETALHADO COM CUSTOS PROPORCIONAIS):
        ${detailedTrips || 'Sem viagens registradas.'}

        HISTÓRICO DE SALDOS DE PALETES (ÚLTIMA SEMANA):
        ${balances || 'Sem saldos recentes.'}
        
        SISTEMA: LogTransf operacional da NobelPack.
        
        REGRAS DE CÁLCULO:
        - Ocupação Média: some as porcentagens de ocupação e divida pelo número de viagens no período.
        - CUSTO FIXO DA VIAGEM = capacidade do veículo × custo cadastrado por palete (valor base). Este custo NÃO muda com a quantidade carregada.
        - CUSTO EFETIVO POR PALETE = custo fixo da viagem ÷ número real de paletes transportados. Quanto menor a ocupação, MAIOR o custo efetivo por palete.
        - Exemplo: Convencional (28 plts) com custo base R$ 12,00/plt. Viagem lotada: custo fixo R$ 336 ÷ 28 = R$ 12,00/plt. Viagem com 20 plts: R$ 336 ÷ 20 = R$ 16,80/plt.
        - A Double Deck (52 plts) tem menor custo/palete que a Convencional (28 plts) porque o custo fixo é diluido em mais paletes.
        - Para perguntas sobre 'custo do palete transportado', use o CUSTO EFETIVO que já está calculado nos resumos mensais.
        
        CONDIÇÕES ESPECÍFICAS: 
        - 'Double Deck' = carretas com capacidade de 52 paletes (id c2)
        - 'Convencional' = carretas com capacidade de 28 paletes (id c1)
        - Para perguntas sobre custos em um mês, use o RESUMO MENSAL acima que já contém os cálculos consolidados.
        
        INSTRUÇÕES ADICIONAIS DO GESTOR:
        ${config.ai_config?.instructions || 'Aja como um analista de logística objetivo.'}
        `;
    };

    const renderMessages = () => {
        const container = document.getElementById('ai-chat-messages');
        if (!container) return;
        
        container.innerHTML = messages.map(msg => `
            <div class="chat-msg ${msg.role}">
                ${msg.content.replace(/\n/g, '<br>')}
            </div>
        `).join('');
        
        container.scrollTop = container.scrollHeight;
    };

    const addMessage = (role, content) => {
        messages.push({ role, content });
        renderMessages();
        if (messages.length > 20) messages.shift();
    };

    const callAPI = async (prompt) => {
        const ai = getConfig();
        
        if (!ai.apiKey) {
            return "Olá! A **Chave de API do Gemini** não está configurada em **Gestão > IA**.";
        }

        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${ai.model || 'gemini-1.5-flash'}:generateContent?key=${ai.apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: {
                        temperature: 0.1, // Lower temperature for more accuracy in data analysis
                        maxOutputTokens: 2048
                    }
                })
            });

            const data = await response.json();
            if (data.error) throw new Error(data.error.message);
            
            return data.candidates[0].content.parts[0].text;
        } catch (err) {
            console.error('AI Error:', err);
            return `Erro ao falar com a IA: ${err.message}.`;
        }
    };

    return {
        init() {
            console.log('AIModule Initialized');
        },

        toggle() {
            isOpen = !isOpen;
            const windowEl = document.getElementById('ai-chat-window');
            if (windowEl) windowEl.classList.toggle('active', isOpen);
            
            if (isOpen && messages.length === 0) {
                addMessage('assistant', 'Olá! Sou seu Assistente LogTransf. Já analisei as últimas 50 viagens e os saldos de paletes. Como posso ajudar agora?');
            }
        },

        sendMessage: async () => {
            const input = document.getElementById('ai-chat-input');
            const text = input.value.trim();
            if (!text) return;

            input.value = '';
            addMessage('user', text);
            
            const typingId = 'typing-' + Date.now();
            const container = document.getElementById('ai-chat-messages');
            if (container) {
                container.innerHTML += `<div class="chat-msg assistant typing" id="${typingId}">...</div>`;
                container.scrollTop = container.scrollHeight;
            }

            const context = generateContext();
            const fullPrompt = `CONTEXTO:\n${context}\n\nPERGUNTA: ${text}\n\nResponda de forma analítica e resumida baseada nos dados acima.`;

            const response = await callAPI(fullPrompt);
            const typingEl = document.getElementById(typingId);
            if (typingEl) typingEl.remove();
            
            addMessage('assistant', response);
        }
    };
})();

window.AIModule = AIModule;

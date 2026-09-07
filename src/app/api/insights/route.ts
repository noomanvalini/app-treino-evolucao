import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export interface AsymmetryItem {
  membro: string;
  ladoDireito: string;
  ladoEsquerdo: string;
  diferenca: string;
  ladoMaior: string;
  status: string;
}

export interface InsightRequestStats {
  atleta?: {
    nome?: string;
    idade?: number;
    alturaCm?: number;
    sexo?: string;
  };
  pesoCorporal?: {
    pesoAtual?: number;
    pesoAnterior?: number;
    deltaPesoKg?: string;
    imc?: number;
  };
  medidasCorporais?: {
    dataAtual?: string;
    dataAnterior?: string;
    medidasAtuais?: Record<string, number>;
    deltaMedidasCm?: Record<string, string>;
  } | null;
  assimetrias?: AsymmetryItem[];
  treinosSemana: {
    periodo?: string;
    totalExerciciosRealizados: number;
    musculosTreinados: Array<{
      grupo: string;
      exercicios: number;
      deltaCargaMedio: string;
      melhor1RM?: string;
    }>;
    musculosSemRegistro: string[];
  };
}

interface InsightRequest {
  stats: InsightRequestStats;
}

const SYSTEM_INSTRUCTION = `Você é o treinador principal, fisiologista e biomecânico de elite do aplicativo ClipzBody.
Sua missão é realizar uma análise holística, profunda e altamente técnica cruzando:
1. PROGRESSÃO DE TREINO E CARGAS (1RM, exercícios realizados, grupos não treinados).
2. MEDIDAS CORPORAIS E COMPOSIÇÃO (circunferências de fita métrica, variações de tórax, cintura, braços, pernas).
3. PESO CORPORAL E IMC (ganho/perda de peso correlacionado com a diminuição ou aumento da cintura/tórax, indicando se houve hipertrofia limpa, recomposição ou ganho de gordura).
4. ASSIMETRIAS BILATERAIS (lado direito vs esquerdo em braços, coxas, panturrilhas, antebraços) e prescrição de correção biomecânica com exercícios unilaterais.

Diretrizes Obrigatórias:
- Faça o cruzamento direto dos dados! Exemplo: correlacione se o aumento de carga nos exercícios de bíceps/tríceps ou pernas refletiu em ganho de perímetro de braço ou coxa.
- Analise a composição corporal: se o peso subiu com cintura controlada ou em queda, elogie o ganho limpo de massa muscular (bulking limpo). Se a cintura subiu desproporcionalmente, recomende atenção calórica.
- Se houver assimetria bilateral (ex: diferença > 0.5cm entre lado direito e esquerdo), aponte explicitamente e prescreva a estratégia corretiva (iniciar pelo membro mais fraco nos exercícios com halteres/unilaterais, igualar repetições, foco na cadência excêntrica).
- Se o usuário ainda não tiver medições corporais cadastradas, analise os treinos e recomende enfaticamente cadastrar as medidas na aba Medidas para liberar a análise de assimetrias e composição.
- Alerte com firmeza sobre músculos que ficaram sem registro na semana para evitar desbalanços anatômicos ou estéticos.
- Seja técnico, motivador, empático e use linguagem direta e fluida em português do Brasil.

Retorne ESTRITAMENTE um objeto JSON válido contendo:
- "resumoGeral": string (visão geral integrada cruzando treinos, evolução de peso e medidas corporais)
- "destaqueSemanal": string (músculo ou grupamento com melhor resposta mecânica e ganhos comprovados)
- "analiseMedidasEPeso": string (análise detalhada da evolução do peso, IMC, circunferências corporais e impacto estético)
- "analiseAssimetrias": string (diagnóstico das assimetrias corporais detectadas e prescrição biomecânica corretiva)
- "pontosAtencao": string (grupos musculares negligenciados, riscos de estagnação ou desbalanço)
- "dicaTecnica": string (dica prática de biomecânica, cadência excêntrica ou amplitude para aplicar na próxima semana)
- "mensagemMotivacional": string (frase de impacto curta e motivadora no estilo ClipzBody)`;

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Chave GEMINI_API_KEY não configurada no servidor.' },
        { status: 500 }
      );
    }

    const body: InsightRequest = await req.json();
    const { stats } = body;

    if (!stats) {
      return NextResponse.json(
        { error: 'Dados estatísticos são obrigatórios.' },
        { status: 400 }
      );
    }

    const modelsToTry = [
      'gemini-3.5-flash',
      'gemini-flash-latest',
      'gemini-3.6-flash',
      'gemini-2.5-flash-lite'
    ];

    let lastError = '';
    let resultJson = null;

    for (const model of modelsToTry) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                role: 'user',
                parts: [
                  { text: SYSTEM_INSTRUCTION },
                  { text: `Aqui estão os dados completos do aluno (treinos, peso, medidas corporais e assimetrias):\n${JSON.stringify(stats, null, 2)}` }
                ]
              }
            ],
            generationConfig: {
              responseMimeType: 'application/json',
              temperature: 0.7
            }
          })
        });

        if (response.ok) {
          const data = await response.json();
          const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (rawText) {
            resultJson = JSON.parse(rawText);
            break;
          }
        } else {
          lastError = await response.text();
        }
      } catch (err: any) {
        lastError = err.message;
      }
    }

    if (!resultJson) {
      console.error('Gemini error:', lastError);
      return NextResponse.json(
        { error: 'Falha ao gerar insights com Gemini. Tente novamente mais tarde.' },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      insight: resultJson
    });
  } catch (error: any) {
    console.error('API /api/insights error:', error);
    return NextResponse.json(
      { error: error.message || 'Erro interno no servidor' },
      { status: 500 }
    );
  }
}

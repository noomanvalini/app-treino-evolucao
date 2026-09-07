import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

interface InsightRequest {
  stats: {
    nome?: string;
    pesoAtual?: number;
    periodo?: string;
    totalExerciciosRealizados?: number;
    musculosTreinados?: Array<{
      grupo: string;
      exercicios: number;
      deltaCargaMedio: string;
      melhor1RM?: string;
    }>;
    musculosSemRegistro?: string[];
  };
}

const SYSTEM_INSTRUCTION = `Você é o treinador de alta performance e inteligência artificial do aplicativo ClipzBody.
Sua missão é analisar os dados de treino da semana do atleta e fornecer um resumo motivador, técnico e objetivo.

Diretrizes:
- Seja direto, encorajador e baseado em ciência da hipertrofia/força.
- Destaque os músculos com maior evolução de carga e consistência.
- Aponte os grupos musculares que ficaram para trás ou não foram treinados nesta semana para evitar desbalanços.
- Forneça uma dica prática acionável para a próxima semana.
- Use linguagem acessível e dinâmica em português do Brasil.

Retorne ESTRITAMENTE um objeto JSON válido com as chaves:
- "destaqueSemanal": string destacando o músculo que mais evoluiu e o porquê
- "pontosAtencao": string apontando músculos não treinados ou com estagnação/pouco volume
- "dicaTecnica": string com dica prática para aplicar na próxima semana
- "mensagemMotivacional": string curta e impactante de incentivo`;

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
        { error: 'Dados estatísticos de treino são obrigatórios.' },
        { status: 400 }
      );
    }

    const modelsToTry = [
      'gemini-3.6-flash',
      'gemini-3.5-flash',
      'gemini-flash-latest',
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
                  { text: `Aqui estão os dados desta semana do aluno:\n${JSON.stringify(stats, null, 2)}` }
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
